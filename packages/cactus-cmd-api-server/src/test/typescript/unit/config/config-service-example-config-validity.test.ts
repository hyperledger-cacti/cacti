import path from "path";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { LoggerProvider } from "@hyperledger/cactus-common";

import { IAuthorizationConfig } from "../../../../main/typescript/public-api";
import { ApiServer } from "../../../../main/typescript/public-api";
import { ConfigService } from "../../../../main/typescript/public-api";

test("Generates valid example config for the API server", async (t: Test) => {
  const pluginsPath = path.join(
    __dirname,
    "../../../../../../", // walk back up to the project root
    ".tmp/test/test-cmd-api-server/config-service-example-config-validity_test/", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );
  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

  const configService = new ConfigService();
  t.ok(configService, "Instantiated ConfigService truthy OK");

  const exampleConfig = configService.newExampleConfig();
  t.ok(exampleConfig, "configService.newExampleConfig() truthy OK");

  exampleConfig.pluginManagerOptionsJson = pluginManagerOptionsJson;

  // FIXME - this hack should not be necessary, we need to re-think how we
  // do configuration parsing. The convict library may not be the path forward.
  exampleConfig.authorizationConfigJson = (JSON.stringify(
    exampleConfig.authorizationConfigJson,
  ) as unknown) as IAuthorizationConfig;

  exampleConfig.configFile = "";

  const convictConfig = configService.newExampleConfigConvict(exampleConfig);
  t.ok(convictConfig, "configService.newExampleConfigConvict() truthy OK");

  const config = convictConfig.getProperties();
  t.ok(config, "convictConfig.getProperties() truthy OK");

  LoggerProvider.setLogLevel(config.logLevel);
  const apiServer = new ApiServer({ config });
  await apiServer.start();
  test.onFinish(() => apiServer.shutdown());
  t.end();
});
