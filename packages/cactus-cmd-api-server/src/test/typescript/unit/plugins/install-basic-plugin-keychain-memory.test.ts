import path from "node:path";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { StatusCodes } from "http-status-codes";

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

import {
  Configuration,
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "../../../../main/typescript/public-api";

import { ICactusApiServerOptions } from "../../../../main/typescript/config/config-service";

import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "../../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as ApiServerApi } from "../../../../main/typescript/public-api";
import convict from "convict";

const logLevel: LogLevelDesc = "INFO";

describe("ApiServer", () => {
  const log = LoggerProvider.getOrCreate({
    label: "install-basic-plugin-keychain-memory.test.ts",
    level: logLevel,
  });

  let config: convict.Config<ICactusApiServerOptions>;
  let apiServer: ApiServer;
  let apiSrvOpts: ICactusApiServerOptions;

  beforeAll(async () => {
    const pluginsPath = path.join(
      __dirname, // start at the current file's path
      "../../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/install-basic-plugin-keychain-memory_test", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    log.info("Plugin install dir: %s", pluginsPath);

    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();
    apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidv4(),
          keychainId: uuidv4(),
          logLevel,
        },
      },
    ];
    config = await configService.newExampleConfigConvict(apiSrvOpts);
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  it("can import plugins at runtime (CLI)", async () => {
    apiServer = new ApiServer({
      config: config.getProperties(),
    });

    const startResponse = apiServer.start();
    expect(startResponse).toResolve();

    const addressInfoApi = (await startResponse).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;
    log.debug(
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
        '"} 1';

      expect(res).toMatchObject({
        data: expect.stringContaining(promMetricsOutput),
        status: StatusCodes.OK,
      });
      expect(res.data.includes(promMetricsOutput)).toBeTrue();
    }
  });
});
