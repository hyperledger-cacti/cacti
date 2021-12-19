import path from "path";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import { LoggerProvider } from "@hyperledger/cactus-common";

import {
  IAuthorizationConfig,
  ICactusApiServerOptions,
} from "../../../../main/typescript/public-api";
import { ApiServer } from "../../../../main/typescript/public-api";
import { ConfigService } from "../../../../main/typescript/public-api";

const testcase = "";

describe(testcase, () => {
  const configService = new ConfigService();
  let apiServer: ApiServer,
    exampleConfig: ICactusApiServerOptions,
    convictConfig: any,
    config: any;

  beforeAll(async () => {
    exampleConfig = await configService.newExampleConfig();
    const pluginsPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
      ".tmp/test/test-cmd-api-server/config-service-example-config-validity_test/", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    exampleConfig.pluginManagerOptionsJson = pluginManagerOptionsJson;

    // FIXME - this hack should not be necessary, we need to re-think how we
    // do configuration parsing. The convict library may not be the path forward.
    exampleConfig.authorizationConfigJson = (JSON.stringify(
      exampleConfig.authorizationConfigJson,
    ) as unknown) as IAuthorizationConfig;

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
