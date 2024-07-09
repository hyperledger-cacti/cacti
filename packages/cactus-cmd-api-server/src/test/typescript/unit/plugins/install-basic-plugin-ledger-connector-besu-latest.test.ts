import path from "path";
import "jest-extended";
import { v4 as uuidv4 } from "uuid";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  Configuration,
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
  ICactusApiServerOptions,
} from "../../../../main/typescript/public-api";

import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "../../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as ApiServerApi } from "../../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "INFO";

describe("ApiServer", () => {
  const pluginsPath = path.join(
    __dirname, // start at the current file's path
    "../../../../../../../", // walk back up to the project root
    ".tmp/test/cmd-api-server/install-basic-plugin-ledger-connector-besu-latest_test", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );
  const pluginManagerOptionsJson = JSON.stringify({
    pluginsPath,
    npmInstallMode: "noCache",
  });

  const configService = new ConfigService();

  let apiServer: ApiServer;
  let isApiServerRunning = false;
  let apiSrvOpts: ICactusApiServerOptions;

  beforeAll(async () => {
    apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-ledger-connector-besu",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidv4(),
          logLevel,
          rpcApiHttpHost: "http://127.0.0.1:8545",
          rpcApiWsHost: "ws://127.0.0.1:8546",
        },
      },
    ];
  });

  afterAll(async () => {
    if (isApiServerRunning) {
      await apiServer.shutdown();
    }
  });

  it("can import plugins at runtime (CLI)", async () => {
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });
    const startResponse = apiServer.start();
    isApiServerRunning = true;
    await expect(startResponse).not.toReject();
    expect(startResponse).toBeTruthy();

    const addressInfoApi = (await startResponse).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;
    const apiConfig = new Configuration({ basePath: apiHost });
    const apiClient = new ApiServerApi(apiConfig);

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
      '"} 1';
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data.includes(promMetricsOutput)).toBeTrue();
  });
});
