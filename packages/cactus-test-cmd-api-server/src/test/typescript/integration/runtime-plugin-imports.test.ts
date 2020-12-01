import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core-api";

import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { IPluginKeychainMemoryOptions } from "@hyperledger/cactus-plugin-keychain-memory";

const logLevel: LogLevelDesc = "TRACE";

test("can import plugins at runtime (CLI)", async (t: Test) => {
  // const pluginRegistry = new PluginRegistry({ plugins: [] });

  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = 0;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.plugins = [
    {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      options: {
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel,
      } as IPluginKeychainMemoryOptions,
    },
  ];
  const config = configService.newExampleConfigConvict(apiServerOptions);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });

  await t.doesNotReject(
    apiServer.start(),
    "failed to start API server with dynamic plugin imports configured for it..."
  );
  test.onFinish(() => apiServer.shutdown());
});
