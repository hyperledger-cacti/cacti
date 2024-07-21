import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import "jest-extended";
import lmify from "lmify";
import fs from "fs-extra";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import { ConfigService } from "../../../main/typescript/config/config-service";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { ApiServer } from "../../../main/typescript/api-server";

describe("ApiServer", () => {
  const logLevel: LogLevelDesc = "INFO";
  const instanceId = randomUUID();
  const keychainId = randomUUID();

  it("checks for invalid case of PluginImportAction.Instantiate and PluginImportType.Local", async () => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/plugin-import-without-install/", // the dir path from the root
      randomUUID(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;

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

    apiSrvOpts.plugins = [plugin];

    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await expect(apiServer.start()).rejects.toThrowError(
      expect.toSatisfy((x) => {
        expect(x).toBeObject();
        expect(x).toMatchObject({
          toJSON: expect.toBeFunction(),
        });
        const xAsJsonString = JSON.stringify(x.toJSON());
        return (
          xAsJsonString.includes("MODULE_NOT_FOUND") &&
          xAsJsonString.includes("Failed to init PluginRegistry") &&
          xAsJsonString.includes("Failed to start ApiServer")
        );
      }),
    );
  });

  test("if plugin is already installed and we send a different version, it keeps using plugin installed before call apiServer", async () => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/plugin-import-without-install/", // the dir path from the root
      randomUUID(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;

    const versionToSendServer = "0.7.0";
    const instanceId = randomUUID();
    const keychainId = randomUUID();
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
    apiSrvOpts.plugins = [plugin];

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
    expect(out.exitCode).toEqual(0);

    const config = await configService.newExampleConfigConvict(
      apiSrvOpts,
      true,
    );
    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await expect(apiServer.start()).toResolve();

    const packageFilePath = path.join(
      pluginsPath,
      plugin.options.instanceId,
      "node_modules",
      `${plugin.packageName}`,
      "package.json",
    );

    const pkgJsonStr = await readFile(packageFilePath, "utf-8");
    const { version } = JSON.parse(pkgJsonStr);

    expect(version).toEqual(versionToInstall);

    const pluginsCount = apiServer.getPluginImportsCount();
    expect(pluginsCount).toEqual(1);

    await expect(apiServer.shutdown()).toResolve();
  });

  test("if we send action as Installation, apiServer will install the plugin", async () => {
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/plugin-import-without-install/", // the dir path from the root
      randomUUID(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    const versionToInstall = "0.8.0";
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: randomUUID(),
          keychainId: randomUUID(),
          logLevel,
          version: versionToInstall,
        },
      },
    ];

    const config = await configService.newExampleConfigConvict(
      apiSrvOpts,
      true,
    );

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await expect(apiServer.start()).toResolve();

    const packageFilePath = path.join(
      pluginsPath,
      apiSrvOpts.plugins[0].options.instanceId,
      "node_modules",
      `${apiSrvOpts.plugins[0].packageName}`,
      "package.json",
    );

    const pkgJsonStr = await readFile(packageFilePath, "utf-8");
    const { version } = JSON.parse(pkgJsonStr);

    expect(version).toEqual(versionToInstall);

    const pluginsCount = apiServer.getPluginImportsCount();
    expect(pluginsCount).toEqual(1);

    await expect(apiServer.shutdown()).toResolve();
  });
});
