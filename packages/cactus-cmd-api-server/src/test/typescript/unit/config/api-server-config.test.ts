import "jest-extended";
import {
  ApiServer,
  // AuthorizationProtocol,
  ConfigService,
} from "../../../../main/typescript/public-api";

describe("api-server shutdown-hook configuration tests", () => {
  // create a config service as base for the following UTs
  const configService = new ConfigService();

  it("enables the shutdown hook based on schema-default", async () => {
    const expectedResult = true;
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.configFile = "";

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
    );

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    // check apiServerOptions
    expect(apiServerOptions).not.toBeUndefined();
    expect(apiServerOptions.enableShutdownHook).toBe(expectedResult);

    // check apiServer
    expect(apiServer).toBeTruthy();
    const result = apiServer["enableShutdownHook"];
    expect(result).toBe(expectedResult);
  });

  it("disables the shutdown hook based on the config value set to false", async () => {
    const expectedResult = false;
    const apiServerOptions = await configService.newExampleConfig();

    // disable shutdown hook
    apiServerOptions.enableShutdownHook = false;
    apiServerOptions.configFile = "";

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
      true,
    );

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    // check apiServerOptions
    expect(apiServerOptions).not.toBeUndefined();
    expect(apiServerOptions.enableShutdownHook).toBe(expectedResult);

    // check apiServer
    expect(apiServer).toBeTruthy();
    const result = apiServer["enableShutdownHook"];
    expect(result).toBe(expectedResult);
  });

  it("enables the shutdown hook based on the config value set to true", async () => {
    const expectedResult = true;
    const apiServerOptions = await configService.newExampleConfig();

    // disable shutdown hook
    apiServerOptions.enableShutdownHook = true;
    apiServerOptions.configFile = "";

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
      true,
    );

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });

    // check apiServerOptions
    expect(apiServerOptions).not.toBeUndefined();
    expect(apiServerOptions.enableShutdownHook).toBe(expectedResult);

    // check apiServer
    expect(apiServer).toBeTruthy();
    const result = apiServer["enableShutdownHook"];
    expect(result).toBe(expectedResult);
  });
});
