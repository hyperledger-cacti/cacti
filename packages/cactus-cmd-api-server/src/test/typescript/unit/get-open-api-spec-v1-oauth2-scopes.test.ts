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

describe("cmd-api-server:getOpenApiSpecV1Endpoint", () => {
  const logLevel: LogLevelDesc = "INFO";
  let apiServer: ApiServer;
  let apiClient: ApiServerApiClient;
  let jwtKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey };
  let expressJwtOptions: ExpressJwtOptions & IJoseFittingJwtParams;

  afterAll(async () => await apiServer.shutdown());

  beforeAll(async () => {
    jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPublicKey = await exportSPKI(jwtKeyPair.publicKey);

    expressJwtOptions = {
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

    const { addressInfoApi } = await startResponsePromise;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;

    const jwtPayload = { name: "Peter", location: "Albertirsa" };
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

  it("HTTP - allows request execution with a valid JWT Token", async () => {
    const jwtPayload = { scope: "read:spec" };
    const validJwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);

    const validBearerToken = `Bearer ${validJwt}`;
    expect(validBearerToken).toBeTruthy();

    const res3Promise = apiClient.getOpenApiSpecV1({
      headers: { Authorization: validBearerToken },
    });

    await expect(res3Promise).resolves.toHaveProperty("data.openapi");
    const res3 = await res3Promise;
    expect(res3.status).toEqual(200);
    expect(res3.data).toBeTruthy();
  });

  it("HTTP - rejects request with an valid JWT but incorrect scope", async () => {
    const jwtPayload = { scope: "red:specs" };
    const validJwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);

    const validBearerToken = `Bearer ${validJwt}`;
    expect(validBearerToken).toBeTruthy();

    await expect(
      apiClient.getOpenApiSpecV1({
        headers: { Authorization: validBearerToken },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 403,
        statusText: expect.stringContaining("Forbidden"),
      },
    });
  });

  it("HTTP - rejects request with an invalid JWT", async () => {
    const { privateKey: otherPrivateKey } = await generateKeyPair("RS256");
    const invalidJwt = await new SignJWT({ scope: "invalid:scope" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("invalid-issuer")
      .setAudience("invalid-audience")
      .sign(otherPrivateKey);

    const invalidBearerToken = `Bearer ${invalidJwt}`;
    expect(invalidBearerToken).toBeTruthy();

    await expect(
      apiClient.getOpenApiSpecV1({
        headers: { Authorization: invalidBearerToken },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: expect.stringContaining("Unauthorized"),
      },
    });
  });

  it("HTTP - allows health check execution with a valid JWT Token", async () => {
    const jwtPayload = { scope: "read:health" };
    const validJwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);

    const validBearerToken = `Bearer ${validJwt}`;
    expect(validBearerToken).toBeTruthy();

    const resPromise = apiClient.getHealthCheckV1({
      headers: { Authorization: validBearerToken },
    });

    await expect(resPromise).resolves.toHaveProperty("data");
    const res = await resPromise;
    expect(res.status).toEqual(200);
    expect(res.data).toBeTruthy();
  });

  it("HTTP - rejects health check execution with an invalid JWT", async () => {
    const { privateKey: otherPrivateKey } = await generateKeyPair("RS256");
    const invalidJwt = await new SignJWT({ scope: "invalid:scope" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("invalid-issuer")
      .setAudience("invalid-audience")
      .sign(otherPrivateKey);

    const invalidBearerToken = `Bearer ${invalidJwt}`;
    expect(invalidBearerToken).toBeTruthy();

    await expect(
      apiClient.getHealthCheckV1({
        headers: { Authorization: invalidBearerToken },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: expect.stringContaining("Unauthorized"),
      },
    });
  });

  it("HTTP - allows Prometheus metrics execution with a valid JWT Token", async () => {
    const jwtPayload = { scope: "read:metrics" };
    const validJwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);

    const validBearerToken = `Bearer ${validJwt}`;
    expect(validBearerToken).toBeTruthy();

    const resPromise = apiClient.getPrometheusMetricsV1({
      headers: { Authorization: validBearerToken },
    });

    await expect(resPromise).resolves.toHaveProperty("data");
    const res = await resPromise;
    expect(res.status).toEqual(200);
    expect(res.data).toBeTruthy();
  });

  it("HTTP - rejects Prometheus metrics execution with an invalid JWT", async () => {
    const { privateKey: otherPrivateKey } = await generateKeyPair("RS256");
    const invalidJwt = await new SignJWT({ scope: "invalid:scope" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("invalid-issuer")
      .setAudience("invalid-audience")
      .sign(otherPrivateKey);

    const invalidBearerToken = `Bearer ${invalidJwt}`;
    expect(invalidBearerToken).toBeTruthy();

    await expect(
      apiClient.getPrometheusMetricsV1({
        headers: { Authorization: invalidBearerToken },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: expect.stringContaining("Unauthorized"),
      },
    });
  });
});
