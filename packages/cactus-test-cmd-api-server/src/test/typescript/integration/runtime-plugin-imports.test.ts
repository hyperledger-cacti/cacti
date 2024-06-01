import path from "path";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import {
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "can import plugins at runtime (CLI)";
describe(testCase, () => {
  let apiServer: ApiServer;

  afterEach(() => {
    jest.useRealTimers();
  });

  test(testCase, async () => {
    const pluginsPath = path.join(
      __dirname, // start at the current file's path
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/runtime-plugin-imports_test", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });
    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.crpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    apiServerOptions.plugins = [
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
    const config =
      await configService.newExampleConfigConvict(apiServerOptions);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });
    apiServerOptions.plugins = [
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
    await expect(apiServer.start()).not.toReject();
  });
  afterAll(async () => {
    await apiServer.shutdown();
  });
});
