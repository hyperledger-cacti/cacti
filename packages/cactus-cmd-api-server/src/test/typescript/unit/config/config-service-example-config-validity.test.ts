import path from "path";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import { LoggerProvider } from "@hyperledger-cacti/cactus-common";

import {
  IAuthorizationConfig,
  ICactusApiServerOptions,
} from "../../../../main/typescript/public-api";
import { ApiServer } from "../../../../main/typescript/public-api";
import { ConfigService } from "../../../../main/typescript/public-api";

describe("ConfigService", () => {
  const configService = new ConfigService();
  let apiServer: ApiServer,
    exampleConfig: ICactusApiServerOptions,
    convictConfig: any,
    config: any;

  beforeAll(async () => {
    exampleConfig = await configService.newExampleConfig();
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../../", // walk back up to the project root
      ".tmp/test/test-cmd-api-server/config-service-example-config-validity_test/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    exampleConfig.pluginManagerOptionsJson = pluginManagerOptionsJson;

    // Override plugins to install from local workspace paths so the test does
    // not depend on the packages being published to npm (e.g. on a staging
    // branch before a release).
    const pkgRoot = path.join(__dirname, "../../../../../../../");
    exampleConfig.plugins = exampleConfig.plugins.map((plugin) => {
      const localSrcByPkg: Record<string, string> = {
        "@hyperledger-cacti/cactus-plugin-keychain-memory": path.join(
          pkgRoot,
          "packages/cactus-plugin-keychain-memory",
        ),
        "@hyperledger-cacti/cacti-plugin-consortium-static": path.join(
          pkgRoot,
          "packages/cacti-plugin-consortium-static",
        ),
      };
      const packageSrc = localSrcByPkg[plugin.packageName];
      if (packageSrc) {
        return { ...plugin, options: { ...plugin.options, packageSrc } };
      }
      return plugin;
    });

    // FIXME - this hack should not be necessary, we need to re-think how we
    // do configuration parsing. The convict library may not be the path forward.
    exampleConfig.authorizationConfigJson = JSON.stringify(
      exampleConfig.authorizationConfigJson,
    ) as unknown as IAuthorizationConfig;

    exampleConfig.configFile = "";
    exampleConfig.apiPort = 0;
    exampleConfig.cockpitPort = 0;
    convictConfig = await configService.newExampleConfigConvict(exampleConfig);
    config = convictConfig.getProperties();
    apiServer = new ApiServer({ config });
  });

  afterAll(() => apiServer.shutdown());

  test("Generates valid example config for the API server", async () => {
    expect(configService).toBeTruthy();
    expect(exampleConfig).toBeTruthy();
    expect(convictConfig).toBeTruthy();

    expect(config).toBeTruthy();

    LoggerProvider.setLogLevel(config.logLevel);
    await apiServer.start();
  });
});
