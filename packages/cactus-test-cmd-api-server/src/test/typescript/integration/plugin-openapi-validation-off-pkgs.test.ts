import { randomUUID as uuidv4 } from "node:crypto";
import path from "node:path";

import "jest-extended";

import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";

import {
  PluginImportType,
  PluginImportAction,
} from "@hyperledger-cacti/cactus-core-api";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger-cacti/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "TRACE";
const testcase = "can instal plugins at runtime based on imports";

describe(testcase, () => {
  let apiServer: ApiServer;

  beforeAll(async () => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/test-cmd-api-server/plugin-import-with-npm-install_test/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.openApiValidationOffPkgs = [
      "@hyperledger-cacti/cactus-plugin-keychain-memory",
    ];
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger-cacti/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidv4(),
          keychainId: uuidv4(),
          logLevel,
        },
      },
    ];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });
  });
  afterAll(() => apiServer.shutdown());

  test(testcase, async () => {
    const openApiValidationOffPlugins =
      await apiServer.getOpenApiValidationOffPlugins();
    expect(openApiValidationOffPlugins.length).toBe(0);
    const startResponse = apiServer.start();
    await expect(startResponse).resolves.toBeTruthy();
    expect(openApiValidationOffPlugins.length).toBe(1);
    const [plugin] = openApiValidationOffPlugins;
    expect(plugin.getPackageName()).toBe(
      "@hyperledger-cacti/cactus-plugin-keychain-memory",
    );
  });
});
