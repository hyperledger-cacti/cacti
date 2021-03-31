import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { JWK } from "jose";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import { IPluginKeychainMemoryOptions } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginConsortiumManual,
  IPluginConsortiumManualOptions,
} from "@hyperledger/cactus-plugin-consortium-manual";

import {
  PluginImportType,
  ConsortiumDatabase,
} from "@hyperledger/cactus-core-api";

import { ApiServer, ConfigService } from "../../../main/typescript/public-api";

import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as ApiServerApi } from "../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";

test("can import plugins at runtime (CLI)", async (t: Test) => {
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = 0;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.plugins = [
    {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.LOCAL,
      options: {
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel,
      } as IPluginKeychainMemoryOptions,
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

  const apiClient = new ApiServerApi({ basePath: apiHost });
  apiServer.prometheusExporter.setTotalPluginImports(
    apiServer.getPluginImportsCount(),
  );

  {
    const res = await apiClient.getPrometheusExporterMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      " Total number of plugins imported\n" +
      "# TYPE " +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      " gauge\n" +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      '{type="' +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      '"} 1';
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(
      res.data.includes(promMetricsOutput),
      "Total 1 plugins imported as expected. RESULT OK",
    );
  }

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

  const options: IPluginConsortiumManualOptions = {
    instanceId: uuidv4(),
    keyPairPem: keyPairPem,
    consortiumDatabase: db,
  };

  const pluginConsortiumManual: PluginConsortiumManual = new PluginConsortiumManual(
    options,
  );

  const pluginRegistry = await apiServer.getOrInitPluginRegistry();
  pluginRegistry.add(pluginConsortiumManual);

  {
    const res = await apiClient.getPrometheusExporterMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      " Total number of plugins imported\n" +
      "# TYPE " +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      " gauge\n" +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      '{type="' +
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
      '"} 2';
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(
      res.data.includes(promMetricsOutput),
      "Total 2 plugins imported as expected. RESULT OK",
    );
  }

  test.onFinish(() => apiServer.shutdown());
});
