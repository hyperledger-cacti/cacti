import test, { Test } from "tape-promise/tape";

import * as grpc from "@grpc/grpc-js";

import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";

import { ApiServer, ConfigService } from "../../../main/typescript/public-api";
import { SelfSignedPkiGenerator } from "../../../main/typescript/public-api";
import { AuthorizationProtocol } from "../../../main/typescript/public-api";
import { default_service } from "../../../main/typescript/public-api";
import { empty } from "../../../main/typescript/public-api";
import { RuntimeError } from "run-time-error-cjs";

const testCase = "API server: runs gRPC web services - mTLS";
const logLevel: LogLevelDesc = "TRACE";

test(testCase, async (t: Test) => {
  const generator = new SelfSignedPkiGenerator();
  t.ok(generator, "Instantiated SelfSignedCertificateGenerator OK.");

  const serverCert = generator.create("127.0.0.1");
  const clientCert = generator.create("client.127.0.0.1", serverCert);
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
  apiSrvOpts.crpcPort = 0;
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
  const apiClient =
    new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
      grpcHostAndPort,
      tlsCredentials,
    );
  t.ok(apiClient, "apiClient truthy OK");

  const responsePromise =
    new Promise<default_service.org.hyperledger.cactus.cmd_api_server.GetHealthCheckV1Response>(
      (resolve, reject) => {
        apiClient.GetHealthCheckV1(
          new empty.google.protobuf.Empty(),
          (
            error: grpc.ServiceError | null,
            response?: default_service.org.hyperledger.cactus.cmd_api_server.GetHealthCheckV1Response,
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
      },
    );

  await t.doesNotReject(responsePromise, "No error in healthcheck OK");
  const res = await responsePromise;

  t.ok(res, `healthcheck response truthy OK`);
  const resHc = res.health_check_response_pb_200?.toObject();

  t.ok(resHc, `resHc truthy OK`);
  t.ok(resHc?.created_at, `resHc.created_at truthy OK`);
  t.ok(resHc?.memory_usage, `resHc.memory_usage truthy OK`);
  t.ok(resHc?.memory_usage?.rss, `resHc.memory_usage.rss truthy OK`);
  t.ok(resHc?.success, `resHc.success truthy OK`);
  t.end();
});
