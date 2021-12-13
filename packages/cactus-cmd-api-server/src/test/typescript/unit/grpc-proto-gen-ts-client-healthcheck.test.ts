import test, { Test } from "tape-promise/tape";

import * as grpc from "@grpc/grpc-js";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import { ApiServer, ConfigService } from "../../../main/typescript/public-api";
import { AuthorizationProtocol } from "../../../main/typescript/public-api";
import { default_service } from "../../../main/typescript/public-api";
import { health_check_response_pb } from "../../../main/typescript/public-api";
import { empty } from "../../../main/typescript/public-api";
import { RuntimeError } from "run-time-error";

const testCase = "API server: runs gRPC TS-proto web services";
const logLevel: LogLevelDesc = "TRACE";

test(testCase, async (t: Test) => {
  const configService = new ConfigService();
  const apiSrvOpts = await configService.newExampleConfig();
  apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
  apiSrvOpts.configFile = "";
  apiSrvOpts.logLevel = logLevel;
  apiSrvOpts.apiCorsDomainCsv = "*";
  apiSrvOpts.apiPort = 0;
  apiSrvOpts.grpcPort = 0;
  apiSrvOpts.cockpitPort = 0;
  apiSrvOpts.grpcMtlsEnabled = false;
  apiSrvOpts.apiTlsEnabled = false;
  apiSrvOpts.plugins = [];
  const config = await configService.newExampleConfigConvict(apiSrvOpts);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });
  test.onFinish(async () => await apiServer.shutdown());

  const startResponse = apiServer.start();
  await t.doesNotReject(
    startResponse,
    "failed to start API server with dynamic plugin imports configured for it...",
  );
  t.ok(startResponse, "startResponse truthy OK");

  const addressInfoGrpc = (await startResponse).addressInfoGrpc;
  const { address, port } = addressInfoGrpc;
  const grpcHostAndPort = `${address}:${port}`;

  const apiClient = new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
    grpcHostAndPort,
    grpc.credentials.createInsecure(),
  );
  t.ok(apiClient, "apiClient truthy OK");

  const responsePromise = new Promise<
    health_check_response_pb.org.hyperledger.cactus.cmd_api_server.HealthCheckResponsePB
  >((resolve, reject) => {
    apiClient.GetHealthCheckV1(
      new empty.google.protobuf.Empty(),
      (
        error: grpc.ServiceError | null,
        response?: health_check_response_pb.org.hyperledger.cactus.cmd_api_server.HealthCheckResponsePB,
      ) => {
        if (error) {
          reject(error);
        } else if (response) {
          resolve(response);
        } else {
          throw new RuntimeError("No error, nor response received.");
        }
      },
    );
  });

  await t.doesNotReject(responsePromise, "No error in healthcheck OK");
  const res = await responsePromise;

  const resHc = res?.toObject();

  t.ok(resHc, `healthcheck response truthy OK`);
  t.ok(resHc?.createdAt, `resHc.createdAt truthy OK`);
  t.ok(resHc?.memoryUsage, `resHc.memoryUsage truthy OK`);
  t.ok(resHc?.memoryUsage?.rss, `resHc.memoryUsage.rss truthy OK`);
  t.ok(resHc?.success, `resHc.success truthy OK`);
  t.end();
});
