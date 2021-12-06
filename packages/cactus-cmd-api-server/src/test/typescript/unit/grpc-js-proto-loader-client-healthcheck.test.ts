import test, { Test } from "tape-promise/tape";
import path from "path";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  ApiServer,
  ConfigService,
  HealthCheckResponse,
} from "../../../main/typescript/public-api";
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

  const res1 = await new Promise<HealthCheckResponse>((resolve, reject) => {
    client.getHealthCheckV1(
      request,
      (err: grpc.ServiceError | null, value: HealthCheckResponse) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      },
    );
  });
  t.ok(res1, "res1 truthy OK");
  t.ok(res1.createdAt, "res1.createdAt truthy OK");
  t.ok(res1.memoryUsage, "res1.memoryUsage truthy OK");
  t.ok(res1.memoryUsage.heapTotal, "res1.memoryUsage.heapTotal truthy OK");
  t.ok(res1.memoryUsage.heapUsed, "res1.memoryUsage.heapUsed truthy OK");
  t.ok(res1.memoryUsage.rss, "res1.memoryUsage.rss truthy OK");
  t.true(res1.success, "res1.success true OK");

  t.end();
});
