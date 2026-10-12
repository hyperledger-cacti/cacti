import test, { Test } from "tape-promise/tape";
import path from "path";

import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";

import { ApiServer, ConfigService } from "../../../main/typescript/public-api";
import { AuthorizationProtocol } from "../../../main/typescript/public-api";
import { ServiceClientConstructor } from "@grpc/grpc-js/build/src/make-client";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";

const testCase = "API server: runs gRPC web services - proto loader";
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
  apiSrvOpts.crpcPort = 0;
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
  await t.doesNotReject(startResponse, "start API server OK");
  t.ok(startResponse, "startResponse truthy OK");

  const addressInfoApi = (await startResponse).addressInfoGrpc;
  const { address, port } = addressInfoApi;
  const grpcHostAndPort = `${address}:${port}`;
  t.ok(grpcHostAndPort, "grpcHostAndPort truthy OK");

  const PROTO_PATH = path.join(
    __dirname,
    "../../../main/proto/generated/openapi/services/default_service.proto",
  );

  const PROTO_INCLUDE_DIR = path.join(
    __dirname,
    "../../../main/proto/generated/openapi/",
  );

  const packageDefinition = await protoLoader.load(PROTO_PATH, {
    includeDirs: [PROTO_INCLUDE_DIR],
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const grpcPkg = grpc.loadPackageDefinition(packageDefinition);
  t.ok(grpcPkg, "grpcPkg truthy OK");

  const DefaultService: ServiceClientConstructor = (grpcPkg as any).org
    .hyperledger.cactus.cmd_api_server.DefaultService;

  t.ok(DefaultService, "DefaultService truthy OK");

  const client = new DefaultService(
    grpcHostAndPort,
    grpc.credentials.createInsecure(),
  );
  t.ok(client, "proto loaded client truthy OK");

  const request = new Empty();

  // GetHealthCheckV1 responds with the GetHealthCheckV1Response oneof
  // wrapper; proto-loader (keepCase + oneofs) decodes it to the
  // health_check_response_pb_200 case field plus a virtual "response" tag.
  interface DecodedHealthCheckResponse {
    response: string;
    health_check_response_pb_200: {
      success: boolean;
      created_at: string;
      memory_usage: {
        rss: number;
        heap_total: number;
        heap_used: number;
      };
    };
  }

  const res1 = await new Promise<DecodedHealthCheckResponse>(
    (resolve, reject) => {
      client.getHealthCheckV1(
        request,
        (err: grpc.ServiceError | null, value: DecodedHealthCheckResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(value);
          }
        },
      );
    },
  );
  t.ok(res1, "res1 truthy OK");
  const healthCheck = res1.health_check_response_pb_200;
  t.ok(healthCheck, "res1.health_check_response_pb_200 truthy OK");
  t.ok(
    healthCheck.created_at,
    "res1.health_check_response_pb_200.created_at truthy OK",
  );
  t.ok(
    healthCheck.memory_usage,
    "res1.health_check_response_pb_200.memory_usage truthy OK",
  );
  t.ok(
    healthCheck.memory_usage.heap_total,
    "res1.health_check_response_pb_200.memory_usage.heap_total truthy OK",
  );
  t.ok(
    healthCheck.memory_usage.heap_used,
    "res1.health_check_response_pb_200.memory_usage.heap_used truthy OK",
  );
  t.ok(
    healthCheck.memory_usage.rss,
    "res1.health_check_response_pb_200.memory_usage.rss truthy OK",
  );
  t.true(
    healthCheck.success,
    "res1.health_check_response_pb_200.success true OK",
  );

  t.end();
});
