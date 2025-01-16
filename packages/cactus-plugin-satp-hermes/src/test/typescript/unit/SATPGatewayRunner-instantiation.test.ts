import "jest-extended";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  ISATPGatewayRunnerConstructorOptions,
  pruneDockerAllIfGithubAction,
  SATPGatewayRunner,
} from "@hyperledger/cactus-test-tooling";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
} from "../../../main/typescript/core/constants";

const logLevel: LogLevelDesc = "TRACE";

describe("Instantiate SATP Gateway Runner", () => {
  let gatewayRunner: SATPGatewayRunner;

  const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
    containerImageVersion: "latest",
    containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
    serverPort: DEFAULT_PORT_GATEWAY_SERVER,
    clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
    apiPort: DEFAULT_PORT_GATEWAY_API,
    logLevel,
    emitContainerLogs: true,
  };

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).toResolve();
  });

  afterAll(async () => {
    await gatewayRunner.stop();
    await gatewayRunner.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  test("Instantiate SATP Gateway Runner", async () => {
    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);

    await gatewayRunner.start();
    expect(gatewayRunner).toBeTruthy();
    expect(gatewayRunner.getContainer()).toBeTruthy();

    const serverHost = await gatewayRunner.getServerHost();
    expect(serverHost).toBeTruthy();
    expect(serverHost).toMatch(/^http:\/\/localhost:\d+$/);
    console.log(serverHost);

    const clientHost = await gatewayRunner.getClientHost();
    expect(clientHost).toBeTruthy();
    expect(clientHost).toMatch(/^http:\/\/localhost:\d+$/);
    console.log(clientHost);

    const apiHost = await gatewayRunner.getApiHost();
    expect(apiHost).toBeTruthy();
    expect(apiHost).toMatch(/^http:\/\/localhost:\d+$/);
    console.log(apiHost);
  });
});
