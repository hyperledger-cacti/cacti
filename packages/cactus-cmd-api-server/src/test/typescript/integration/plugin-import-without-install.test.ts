import path from "path";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "../../../main/typescript/public-api";
import lmify from "lmify";
import fs from "fs-extra";

const logLevel: LogLevelDesc = "TRACE";

test("can instantiate plugins at runtime without install them", async (t: Test) => {
  test("if plugin is not already installed and we set action to instantiate, server starting will fail", async (t2: Test) => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/plugin-import-without-install/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;

    const instanceId = uuidv4();
    const keychainId = uuidv4();
    const plugin = {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.Local,
      action: PluginImportAction.Instantiate,
      options: {
        instanceId,
        keychainId,
        logLevel,
        version: "0.9.0",
      },
    };

    apiServerOptions.plugins = [plugin];

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
    );

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await t2.rejects(apiServer.start());

    t2.end();
  });

  test("if plugin is already installed and we send a different version, it keeps using plugin installed before call apiServer", async (t2: Test) => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/plugin-import-without-install/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;

    const versionToSendServer = "0.7.0";
    const instanceId = uuidv4();
    const keychainId = uuidv4();
    const plugin = {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.Local,
      action: PluginImportAction.Instantiate,
      options: {
        instanceId,
        keychainId,
        logLevel,
        version: versionToSendServer,
      },
    };
    apiServerOptions.plugins = [plugin];

    const pluginPackageDir = path.join(pluginsPath, instanceId);
    const versionToInstall = "0.10.0";

    await fs.mkdirp(pluginPackageDir);
    lmify.setPackageManager("npm");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    lmify.setRootDir(pluginPackageDir);
    const out = await lmify.install([
      `${plugin.packageName}@${versionToInstall}`,
      "--production",
      "--audit=false",
      "--progress=false",
      "--fund=false",
      `--prefix=${pluginPackageDir}`,
      // "--ignore-workspace-root-check",
    ]);
    t2.equal(out.exitCode, 0, "Plugin installed correctly");

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
      true,
    );
    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await t2.doesNotReject(
      apiServer.start(),
      "apiServer was starting instantiating a plugin previously installed",
    );

    const packageFilePath = path.join(
      pluginsPath,
      plugin.options.instanceId,
      "node_modules",
      `${plugin.packageName}`,
      "package.json",
    );

    const { version } = await import(packageFilePath);

    t2.strictEquals(
      version,
      versionToInstall,
      "apiServer did not overwrite package",
    );

    const pluginsCount = apiServer.getPluginImportsCount();
    t2.equal(pluginsCount, 1, "apiServer instantiated 1 plugin");

    await t2.doesNotReject(
      apiServer.shutdown(),
      "apiServer was stopped instantiating a plugin previously installed",
    );

    t2.end();
  });

  test("if we send action as Installation, apiServer will install the plugin", async (t2: Test) => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/plugin-import-without-install/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const versionToInstall = "0.8.0";
    apiServerOptions.plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidv4(),
          keychainId: uuidv4(),
          logLevel,
          version: versionToInstall,
        },
      },
    ];

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
      true,
    );

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await t2.doesNotReject(
      apiServer.start(),
      "apiServer was starting instantiating a plugin previously installed",
    );

    const packageFilePath = path.join(
      pluginsPath,
      apiServerOptions.plugins[0].options.instanceId,
      "node_modules",
      `${apiServerOptions.plugins[0].packageName}`,
      "package.json",
    );

    const { version } = await import(packageFilePath);

    t2.strictEquals(
      version,
      versionToInstall,
      "apiServer installed the package",
    );

    const pluginsCount = apiServer.getPluginImportsCount();
    t2.equal(pluginsCount, 1, "apiServer instantiated 1 plugin");

    await t2.doesNotReject(apiServer.shutdown(), "apiServer was stopped");

    t2.end();
  });

  t.end();
});
