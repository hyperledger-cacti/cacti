import test, { Test } from "tape-promise/tape";

import * as grpc from "@grpc/grpc-js";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import { ApiServer, ConfigService } from "../../../main/typescript/public-api";
import { SelfSignedPkiGenerator } from "../../../main/typescript/public-api";
import { AuthorizationProtocol } from "../../../main/typescript/public-api";
import { default_service } from "../../../main/typescript/public-api";
import { health_check_response_pb } from "../../../main/typescript/public-api";
import { empty } from "../../../main/typescript/public-api";
import { RuntimeError } from "run-time-error";

const testCase = "API server: runs gRPC web services - mTLS";
const logLevel: LogLevelDesc = "TRACE";

test(testCase, async (t: Test) => {
  const generator = new SelfSignedPkiGenerator();
  t.ok(generator, "Instantiated SelfSignedCertificateGenerator OK.");

  const serverCert = generator.create("localhost");
  const clientCert = generator.create("client.localhost", serverCert);
  const serverRootCertPemBuf = Buffer.from(serverCert.certificatePem);

  const configService = new ConfigService();
  const apiSrvOpts = await configService.newExampleConfig();
  apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
  apiSrvOpts.configFile = "";
  apiSrvOpts.logLevel = logLevel;
  apiSrvOpts.apiCorsDomainCsv = "*";
  apiSrvOpts.apiPort = 0;
  apiSrvOpts.apiTlsCertPem = serverCert.certificatePem;
  apiSrvOpts.apiTlsKeyPem = serverCert.privateKeyPem;
  apiSrvOpts.apiTlsClientCaPem = clientCert.certificatePem;
  apiSrvOpts.grpcPort = 0;
  apiSrvOpts.cockpitPort = 0;
  apiSrvOpts.grpcMtlsEnabled = true;
  apiSrvOpts.apiTlsEnabled = false;
  apiSrvOpts.plugins = [];
  const config = await configService.newExampleConfigConvict(apiSrvOpts);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });
  test.onFinish(async () => await apiServer.shutdown());

  const startResponse = apiServer.start();
  await t.doesNotReject(startResponse, "API server started OK");
  t.ok(startResponse, "startResponse truthy OK");

  const addressInfoGrpc = (await startResponse).addressInfoGrpc;
  const { address, port } = addressInfoGrpc;
  const grpcHostAndPort = `${address}:${port}`;

  const tlsCredentials = grpc.credentials.createSsl(
    serverRootCertPemBuf,
    Buffer.from(clientCert.privateKeyPem),
    Buffer.from(clientCert.certificatePem),
  );
  const apiClient = new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
    grpcHostAndPort,
    tlsCredentials,
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

  const resHc = res.toObject();

  t.ok(resHc, `healthcheck response truthy OK`);
  t.ok(resHc.createdAt, `resHc.createdAt truthy OK`);
  t.ok(resHc.memoryUsage, `resHc.memoryUsage truthy OK`);
  t.ok(resHc.memoryUsage?.rss, `resHc.memoryUsage.rss truthy OK`);
  t.ok(resHc.success, `resHc.success truthy OK`);
  t.end();
});
