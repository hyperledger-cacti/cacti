import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { JWK } from "jose";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  PluginImportType,
  ConsortiumDatabase,
} from "@hyperledger/cactus-core-api";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "TRACE";

test("can instal plugins at runtime based on imports", async (t: Test) => {
  // Adding a new plugin to update the prometheus metric K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS
  const keyPair = await JWK.generate("EC", "secp256k1", { use: "sig" }, true);
  const keyPairPem = keyPair.toPEM(true);
  const db: ConsortiumDatabase = {
    cactusNode: [],
    consortium: [],
    consortiumMember: [],
    ledger: [],
    pluginInstance: [],
  };

  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = 0;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.plugins = [
    {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.Local,
      options: {
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel,
      },
    },
    {
      packageName: "@hyperledger/cactus-plugin-consortium-manual",
      type: PluginImportType.Local,
      options: {
        instanceId: uuidv4(),
        keyPairPem: keyPairPem,
        consortiumDatabase: db,
      },
    },
  ];
  const config = configService.newExampleConfigConvict(apiServerOptions);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });

  const startResponse = apiServer.start();
  await t.doesNotReject(
    startResponse,
    "failed to start API server with dynamic plugin imports configured for it...",
  );
  t.ok(startResponse, "startResponse truthy OK");

  const addressInfoApi = (await startResponse).addressInfoApi;
  const protocol = apiServerOptions.apiTlsEnabled ? "https" : "http";
  const { address, port } = addressInfoApi;
  const apiHost = `${protocol}://${address}:${port}`;
  t.comment(
    `Metrics URL: ${apiHost}/api/v1/api-server/get-prometheus-exporter-metrics`,
  );

  test.onFinish(() => apiServer.shutdown());
});
