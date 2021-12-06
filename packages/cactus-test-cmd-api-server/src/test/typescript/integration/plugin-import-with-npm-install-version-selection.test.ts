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
} from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "TRACE";

test("can install plugins at runtime with specified version based on imports", async (t: Test) => {
  const pluginsPath = path.join(
    __dirname,
    "../../../../../../", // walk back up to the project root
    ".tmp/test/test-cmd-api-server/plugin-import-with-npm-install_test/", // the dir path from the root
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
  apiServerOptions.plugins = [
    {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.Local,
      action: PluginImportAction.Install,
      options: {
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel,
        version: "0.9.0",
      },
    },
  ];
  const config = await configService.newExampleConfigConvict(apiServerOptions);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });

  const startResponse = apiServer.start();
  await t.doesNotReject(
    startResponse,
    "failed to start API server with dynamic plugin imports configured for it...",
  );
  t.ok(startResponse, "startResponse truthy OK");

  const packageFilePath = path.join(
    pluginsPath,
    apiServerOptions.plugins[0].options.instanceId,
    "node_modules",
    `${apiServerOptions.plugins[0].packageName}`,
    "package.json",
  );
  const { version } = await import(packageFilePath);
  t.strictEquals(
    version,
    apiServerOptions.plugins[0].options.version,
    `Package version strictly equal to ${version}`,
  );

  test.onFinish(() => apiServer.shutdown());
});
