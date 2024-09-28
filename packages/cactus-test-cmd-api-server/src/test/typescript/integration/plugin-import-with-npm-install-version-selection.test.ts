import { randomUUID as uuidv4 } from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";

import "jest-extended";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  PluginImport,
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "INFO";

describe("ApiServer", () => {
  const pluginsPath = path.join(
    __dirname,
    "../../../../../../", // walk back up to the project root
    ".tmp/test/test-cmd-api-server/plugin-import-with-npm-install_test/", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );
  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

  const aPluginImport: PluginImport = {
    packageName: "@hyperledger/cactus-plugin-keychain-memory",
    type: PluginImportType.Local,
    action: PluginImportAction.Install,
    options: {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel,
      version: "0.9.0",
    },
  };

  const packageFilePath = path.join(
    pluginsPath,
    aPluginImport.options.instanceId,
    "node_modules",
    `${aPluginImport.packageName}`,
    "package.json",
  );

  const configService = new ConfigService();

  let apiServer: ApiServer;

  beforeAll(async () => {
    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [aPluginImport];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  test("can install plugins at runtime with specified version based on imports", async () => {
    const startResponse = apiServer.start();
    await expect(startResponse).toResolve();

    const pkgJsonStr = await readFile(packageFilePath, "utf-8");
    const { version } = JSON.parse(pkgJsonStr);

    expect(version).toEqual(aPluginImport.options.version);
  });
});
