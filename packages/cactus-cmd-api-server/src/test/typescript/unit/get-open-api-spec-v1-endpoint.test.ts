import {
  ApiServer,
  ApiServerApiClient,
  ApiServerApiClientConfiguration,
  AuthorizationProtocol,
  ConfigService,
  IAuthorizationConfig,
} from "../../../main/typescript/public-api";
import {
  IJoseFittingJwtParams,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";
import type { AuthorizeOptions as SocketIoJwtOptions } from "@thream/socketio-jwt";
import type { Params as ExpressJwtOptions } from "express-jwt";
import "jest-extended";
import { SignJWT, exportSPKI, generateKeyPair } from "jose";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { default_service, empty } from "../../../main/typescript/public-api";
import * as grpc from "@grpc/grpc-js";
import { GrpcServerApiServer } from "../../../main/typescript/web-services/grpc/grpc-server-api-server";
import { RuntimeError } from "run-time-error-cjs";

describe("cmd-api-server:getOpenApiSpecV1Endpoint", () => {
  const logLevel: LogLevelDesc = "TRACE";
  let apiServer: ApiServer;
  let apiClient: ApiServerApiClient;
  let grpcHost: string;

  afterAll(async () => await apiServer.shutdown());

  beforeAll(async () => {
    const jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPublicKey = await exportSPKI(jwtKeyPair.publicKey);
    const expressJwtOptions: ExpressJwtOptions & IJoseFittingJwtParams = {
      algorithms: ["RS256"],
      secret: jwtPublicKey,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    const socketIoJwtOptions: SocketIoJwtOptions = {
      secret: jwtPublicKey,
      algorithms: ["RS256"],
    };
    expect(expressJwtOptions).toBeTruthy();

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions,
      socketIoPath: Constants.SocketIoConnectionPathV1,
    };

    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/test-cmd-api-server/get-open-api-spec-v1-endpoint_test/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const pluginRegistry = new PluginRegistry({ logLevel });

    const configService = new ConfigService();

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.JSON_WEB_TOKEN;
    apiSrvOpts.authorizationConfigJson = authorizationConfig;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.plugins = [];

    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    apiServer.initPluginRegistry({ pluginRegistry });
    const startResponsePromise = apiServer.start();
    await expect(startResponsePromise).toResolve();
    const startResponse = await startResponsePromise;
    expect(startResponse).toBeTruthy();

    const { addressInfoApi, addressInfoGrpc } = await startResponsePromise;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;

    grpcHost = `${addressInfoGrpc.address}:${addressInfoGrpc.port}`;

    const jwtPayload = {
      name: "Peter",
      location: "London",
      scope: "read:spec",
    };
    const validJwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);
    expect(validJwt).toBeTruthy();

    const validBearerToken = `Bearer ${validJwt}`;
    expect(validBearerToken).toBeTruthy();

    apiClient = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: validBearerToken } },
        logLevel,
      }),
    );
  });

  it("HTTP - returns the OpenAPI spec .json document of the API server itself", async () => {
    const res1Promise = apiClient.getOpenApiSpecV1();
    await expect(res1Promise).resolves.toHaveProperty("data.openapi");
    const res1 = await res1Promise;
    expect(res1.status).toEqual(200);
    expect(res1.data).toBeTruthy();
  });

  it("gRPC - Vanilla Server & Vanilla Client - makeUnaryRequest", async () => {
    const clientInsecureCreds = grpc.credentials.createInsecure();
    const serverInsecureCreds = grpc.ServerCredentials.createInsecure();

    const server = new grpc.Server();

    server.addService(
      default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient
        .service,
      new GrpcServerApiServer(),
    );

    const res1Promise = new Promise((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", serverInsecureCreds, (err, port) => {
        if (err) {
          reject(err);
        } else {
          server.start();

          const client = new grpc.Client(
            `127.0.0.1:${port}`,
            clientInsecureCreds,
          );

          client.makeUnaryRequest(
            "/org.hyperledger.cactus.cmd_api_server.DefaultService/GetOpenApiSpecV1",
            (x) => x,
            (y) => y,
            Buffer.from([]),
            (err3, value) => {
              if (err3) {
                reject(err3);
              } else {
                resolve(value);
              }
              client.close();
            },
          );
        }
      });
    });

    expect(res1Promise).resolves.toBeObject();
    const res1 = await res1Promise;
    expect(res1).toBeObject();

    await new Promise<void>((resolve, reject) => {
      server.tryShutdown((err1) => {
        if (err1) {
          console.error("Failed to shut down test gRPC server: ", err1);
          reject(err1);
        } else {
          resolve();
        }
      });
    });
  });

  it("gRPC - Vanilla Server + Cacti Client - makeUnaryRequest", async () => {
    const clientInsecureCreds = grpc.credentials.createInsecure();
    const serverInsecureCreds = grpc.ServerCredentials.createInsecure();

    const server = new grpc.Server();

    server.addService(
      default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient
        .service,
      new GrpcServerApiServer(),
    );

    const res1Promise = new Promise((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", serverInsecureCreds, (err, port) => {
        if (err) {
          reject(err);
        } else {
          server.start();

          const client =
            new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
              `127.0.0.1:${port}`,
              clientInsecureCreds,
            );
          client.makeUnaryRequest(
            "/org.hyperledger.cactus.cmd_api_server.DefaultService/GetOpenApiSpecV1",
            (x) => x,
            (y) => y,
            Buffer.from([]),
            (err3, value) => {
              if (err3) {
                reject(err3);
              } else {
                resolve(value);
              }
              client.close();
            },
          );
        }
      });
    });

    expect(res1Promise).resolves.toBeObject();
    const res1 = await res1Promise;
    expect(res1).toBeObject();

    await new Promise<void>((resolve, reject) => {
      server.tryShutdown((err1) => {
        if (err1) {
          console.error("Failed to shut down test gRPC server: ", err1);
          reject(err1);
        } else {
          resolve();
        }
      });
    });
  });

  it("gRPC - Vanilla Server + Cacti Client - GetOpenApiSpecV1", async () => {
    const clientInsecureCreds = grpc.credentials.createInsecure();
    const serverInsecureCreds = grpc.ServerCredentials.createInsecure();

    const server = new grpc.Server();

    server.addService(
      default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient
        .service,
      new GrpcServerApiServer(),
    );

    const res1Promise = new Promise((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", serverInsecureCreds, (err, port) => {
        const client =
          new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
            `127.0.0.1:${port}`,
            clientInsecureCreds,
          );
        if (err) {
          reject(err);
        } else {
          server.start();

          const req = new empty.google.protobuf.Empty();
          client.GetOpenApiSpecV1(req, (err3, value) => {
            if (err3) {
              reject(err3);
            } else {
              resolve(value);
            }
            client.close();
          });
        }
      });
    });

    expect(res1Promise).resolves.toBeObject();
    const res1 = await res1Promise;
    expect(res1).toBeObject();

    await new Promise<void>((resolve, reject) => {
      server.tryShutdown((err1) => {
        if (err1) {
          console.error("Failed to shut down test gRPC server: ", err1);
          reject(err1);
        } else {
          resolve();
        }
      });
    });
  });

  it("gRPC - Cacti Server & Cacti Client - GetOpenApiSpecV1", async () => {
    const clientInsecureCreds = grpc.credentials.createInsecure();
    const res1Promise =
      new Promise<default_service.org.hyperledger.cactus.cmd_api_server.GetOpenApiSpecV1Response>(
        (resolve, reject) => {
          const deadline = Date.now() + 100;

          const client =
            new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
              grpcHost,
              clientInsecureCreds,
            );

          client.waitForReady(deadline, (err2) => {
            if (err2) {
              reject(err2);
            } else {
              const req = new empty.google.protobuf.Empty();
              client.GetOpenApiSpecV1(req, (err3, value) => {
                if (err3) {
                  reject(err3);
                } else if (value) {
                  resolve(value);
                } else {
                  reject(
                    new RuntimeError("Response object received is falsy."),
                  );
                }
                client.close();
              });
            }
          });
        },
      );
    await expect(res1Promise).resolves.toBeObject();
    const res1 = await res1Promise;
    expect(res1).toBeTruthy();
    const res1AsString = res1.toString();
    expect(res1AsString).toBeString();
    expect(() => JSON.parse(res1AsString)).not.toThrowError();
  });

  it("gRPC - Cacti Server + Cacti Client - makeUnaryRequest", async () => {
    const clientInsecureCreds = grpc.credentials.createInsecure();

    const res1Promise = new Promise((resolve, reject) => {
      const client =
        new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
          grpcHost,
          clientInsecureCreds,
        );
      client.makeUnaryRequest(
        "/org.hyperledger.cactus.cmd_api_server.DefaultService/GetOpenApiSpecV1",
        (x) => x,
        (y) => y,
        Buffer.from([]),
        (err3, value) => {
          if (err3) {
            reject(err3);
          } else {
            resolve(value);
          }
          client.close();
        },
      );
    });

    await expect(res1Promise).resolves.toBeObject();
    const res1 = await res1Promise;
    expect(res1).toBeObject();
  });

  it("gRPC - Cacti Server & Cacti Client - GetOpenApiSpecV1 - no manual waitForReady", async () => {
    const clientInsecureCreds = grpc.credentials.createInsecure();
    const client =
      new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
        grpcHost,
        clientInsecureCreds,
      );
    const res1Promise =
      new Promise<default_service.org.hyperledger.cactus.cmd_api_server.GetOpenApiSpecV1Response>(
        (resolve, reject) => {
          const req = new empty.google.protobuf.Empty();
          client.GetOpenApiSpecV1(req, (err3, value) => {
            if (err3) {
              reject(err3);
            } else if (value) {
              resolve(value);
            } else {
              reject(new RuntimeError("Response object received is falsy."));
            }
            client.close();
          });
        },
      );
    await expect(res1Promise).resolves.toBeObject();
    const res1 = await res1Promise;
    expect(res1).toBeTruthy();
    const res1AsString = res1.toString();
    expect(res1AsString).toBeString();
    expect(() => JSON.parse(res1AsString)).not.toThrowError();
  });
});
