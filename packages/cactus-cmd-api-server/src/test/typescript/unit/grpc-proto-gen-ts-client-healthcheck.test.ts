import "jest-extended";
import * as grpc from "@grpc/grpc-js";
import { RuntimeError } from "run-time-error-cjs";

import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";

import {
  ApiServer,
  ConfigService,
  ICactusApiServerOptions,
} from "../../../main/typescript/public-api";
import { AuthorizationProtocol } from "../../../main/typescript/public-api";
import { default_service } from "../../../main/typescript/public-api";
import { empty } from "../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "INFO";

describe("ApiServer", () => {
  let apiServer: ApiServer;
  let config: ICactusApiServerOptions;
  let apiClient: default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient;

  afterAll(async () => {
    await apiServer.shutdown();
  });

  beforeAll(async () => {
    const configService = new ConfigService();
    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [];
    const convictCfg = await configService.newExampleConfigConvict(apiSrvOpts);
    config = convictCfg.getProperties();

    apiServer = new ApiServer({
      config,
    });

    const apiServerStart = apiServer.start();
    await expect(apiServerStart).toResolve();
    const addressInfoGrpc = (await apiServerStart).addressInfoGrpc;
    const { address, port } = addressInfoGrpc;
    const grpcHostAndPort = `${address}:${port}`;

    apiClient =
      new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
        grpcHostAndPort,
        grpc.credentials.createInsecure(),
      );
    expect(apiClient).toBeTruthy();
  });

  test("runs gRPC TS-proto web services", async () => {
    type GetHealthCheckV1Response =
      default_service.org.hyperledger.cactus.cmd_api_server.GetHealthCheckV1Response;

    const grpcReq = new Promise<GetHealthCheckV1Response>((resolve, reject) => {
      apiClient.GetHealthCheckV1(
        new empty.google.protobuf.Empty(),
        (
          error: grpc.ServiceError | null,
          response?: GetHealthCheckV1Response,
        ) => {
          if (error) {
            reject(error);
          } else if (response) {
            resolve(response);
          } else {
            reject(new RuntimeError("No error, nor response received."));
          }
        },
      );
    });

    await expect(grpcReq).resolves.toMatchObject({
      toObject: expect.toBeFunction(),
    });

    const resPb = await grpcReq;
    expect(resPb.response).toBe("health_check_response_pb_200");
    const res = resPb.health_check_response_pb_200?.toObject();

    expect(res).toMatchObject({
      created_at: expect.toBeDateString(),
      memory_usage: expect.objectContaining({
        rss: expect.toBeNumber(),
      }),
      success: true,
    });
  });
});
