import { randomUUID } from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";

import "jest-extended";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ConfigService } from "../../../main/typescript/config/config-service";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { ApiServer } from "../../../main/typescript/api-server";

describe("ApiServer", () => {
  let apiServer: ApiServer;

  const logLevel: LogLevelDesc = "INFO";

  const log = LoggerProvider.getOrCreate({
    label: "plugin-import-from-github.test.ts",
    level: logLevel,
  });

  const pluginsPath = path.join(
    __dirname,
    "../../../../../../", // walk back up to the project root
    ".tmp/test/test-cmd-api-server/plugin-import-from-github_test/", // the dir path from the root
    randomUUID(), // then a random directory to ensure proper isolation
  );
  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });
  const configService = new ConfigService();

  afterAll(async () => {
    await apiServer.shutdown();
  });

  it("can install plugins at runtime from GitHub", async () => {
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
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger/cactus-dummy-package",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: randomUUID(),
          keychainId: randomUUID(),
          logLevel,
          packageSrc:
            "https://gitpkg.now.sh/hyperledger/cactus/packages/cactus-cmd-api-server/src/test/resources/cactus-dummy-package?main",
        },
      },
    ];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });

    const startPromise = apiServer.start();
    await expect(startPromise).toResolve();
    await expect(startPromise).toBeTruthy();
    await expect((await startPromise).addressInfoApi).toBeTruthy();
    await expect((await startPromise).addressInfoCrpc).toBeTruthy();
    await expect((await startPromise).addressInfoGrpc).toBeTruthy();

    const packageFilePath = path.join(
      pluginsPath,
      apiSrvOpts.plugins[0].options.instanceId,
      "node_modules",
      `${apiSrvOpts.plugins[0].packageName}`,
      "package.json",
    );

    const pkgJsonStr = await readFile(packageFilePath, "utf-8");
    const { name, version } = JSON.parse(pkgJsonStr);

    log.debug("installed package name on file-system:", name);
    log.debug("installed package version on file-system:", version);
    expect(name).toEqual(apiSrvOpts.plugins[0].packageName);
  });
});
