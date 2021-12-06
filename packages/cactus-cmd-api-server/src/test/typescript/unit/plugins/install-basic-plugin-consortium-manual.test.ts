import path from "path";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportPKCS8 } from "jose";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  PluginImportType,
  ConsortiumDatabase,
  ICactusPlugin,
  Configuration,
  IPluginConsortium,
  PluginImportAction,
} from "@hyperledger/cactus-core-api";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "../../../../main/typescript/public-api";

import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "../../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as ApiServerApi } from "../../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";

test("can install plugin-consortium-manual", async (t: Test) => {
  const keychainId = uuidv4();
  const consortiumPluginInstanceId = uuidv4();

  // Adding a new plugin to update the prometheus metric K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS
  const keyPair = await await generateKeyPair("ES256K");
  const keyPairPem = await exportPKCS8(keyPair.privateKey);
  const db: ConsortiumDatabase = {
    cactusNode: [],
    consortium: [],
    consortiumMember: [],
    ledger: [],
    pluginInstance: [],
  };

  const pluginsPath = path.join(
    __dirname, // start at the current file's path
    "../../../../../../../", // walk back up to the project root
    ".tmp/test/cmd-api-server/plugin-import-with-npm-install_test", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );

  const configService = new ConfigService();

  const apiServerOptions = await configService.newExampleConfig();
  const pluginManagerOptions = { pluginsPath };
  const pluginManagerOptionsJson = JSON.stringify(pluginManagerOptions);

  apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = 0;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.grpcPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.plugins = [
    {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.Local,
      action: PluginImportAction.Install,
      options: {
        instanceId: uuidv4(),
        keychainId,
        logLevel,
      },
    },
    {
      packageName: "@hyperledger/cactus-plugin-consortium-manual",
      type: PluginImportType.Local,
      action: PluginImportAction.Install,
      options: {
        instanceId: consortiumPluginInstanceId,
        keyPairPem: keyPairPem,
        consortiumDatabase: db,
      },
    },
  ];
  const config = await configService.newExampleConfigConvict(apiServerOptions);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });

  test.onFinish(() => apiServer.shutdown());

  const startResponse = apiServer.start();
  await t.doesNotReject(startResponse, "started API server OK");
  t.ok(startResponse, "startResponse truthy OK");

  const addressInfoApi = (await startResponse).addressInfoApi;
  const protocol = apiServerOptions.apiTlsEnabled ? "https" : "http";
  const { address, port } = addressInfoApi;
  const apiHost = `${protocol}://${address}:${port}`;
  t.comment(
    `Metrics URL: ${apiHost}/api/v1/api-server/get-prometheus-exporter-metrics`,
  );

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new ApiServerApi(apiConfig);

  {
    const res = await apiClient.getPrometheusMetricsV1();
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

  const pluginRegistry = await apiServer.getOrInitPluginRegistry();

  // this is not a working plugin but we are just testing the monitoring so
  // it's okay for this particular test case. Do not copy this to other test
  // cases or if you do remove right after you copied it ;-)
  pluginRegistry.plugins.push({} as ICactusPlugin);

  {
    const res = await apiClient.getPrometheusMetricsV1();
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
      '"} 3';
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(
      res.data.includes(promMetricsOutput),
      "Total 3 plugins imported as expected. RESULT OK",
    );
  }
  // clean up after ourselves,
  // e.g. remove the dummy plugin instance we just pushed
  pluginRegistry.plugins.pop();

  const keychain = pluginRegistry.findOneByKeychainId(keychainId);

  const hasX1 = await keychain.has("x");
  t.false(hasX1, "hasX1 === false OK");

  await keychain.set("x", "y");

  const hasX2 = await keychain.has("x");
  t.true(hasX2, "hasX2 === true OK");

  type DummyConsortiumPlugin = IPluginConsortium<
    unknown,
    unknown,
    unknown,
    unknown
  >;

  // TODO - use the new getOneById implementation once
  // https://github.com/hyperledger/cactus/issues/1197
  // has been resolved
  const consortiumPlugin = pluginRegistry
    .getPlugins()
    .find(
      (it) => it.getInstanceId() === consortiumPluginInstanceId,
    ) as DummyConsortiumPlugin;

  t.ok(consortiumPlugin, "consortiumPlugin located via instance ID truthy OK");

  // FIXME - uncomment this once https://github.com/hyperledger/cactus/issues/1199
  // has been resolved (and also published to npm)
  // const nodeJwsRes = await consortiumPlugin.getNodeJws({});
  // t.ok(nodeJwsRes, "nodeJwsRes truthy OK");

  t.end();
});
