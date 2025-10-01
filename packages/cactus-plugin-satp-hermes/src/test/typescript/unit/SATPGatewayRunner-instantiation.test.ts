import "jest-extended";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  ISATPGatewayRunnerConstructorOptions,
  pruneDockerAllIfGithubAction,
  SATPGatewayRunner,
} from "@hyperledger/cactus-test-tooling";
import {
  DEFAULT_PORT_GATEWAY_OAPI,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import { Address, GatewayIdentity } from "../../../main/typescript/core/types";
import { setupGatewayDockerFiles } from "../test-utils";
import {
  SATP_DOCKER_IMAGE_VERSION,
  SATP_DOCKER_IMAGE_NAME,
} from "../constants";

const logLevel: LogLevelDesc = "DEBUG";

describe("Instantiate SATP Gateway Runner", () => {
  let gatewayRunner: SATPGatewayRunner;
  const address: Address = `http://localhost`;

  // gateway setup:
  const gatewayIdentity = {
    id: "mockID",
    name: "CustomGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    proofID: "mockProofID10",
    address,
    gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
    gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
    gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
  } as GatewayIdentity;

  const files = setupGatewayDockerFiles({
    gatewayIdentity,
    logLevel,
    counterPartyGateways: [], //only knows itself
    enableCrashRecovery: false, // Crash recovery disabled
  });

  const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
    containerImageVersion: SATP_DOCKER_IMAGE_VERSION,
    containerImageName: SATP_DOCKER_IMAGE_NAME,
    serverPort: DEFAULT_PORT_GATEWAY_SERVER,
    clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
    oapiPort: DEFAULT_PORT_GATEWAY_OAPI,
    logLevel,
    emitContainerLogs: true,
    configPath: files.configPath,
    logsPath: files.logsPath,
    ontologiesPath: files.ontologiesPath,
  };

  afterAll(async () => {
    if (gatewayRunner) {
      try {
        await gatewayRunner.stop();
        await gatewayRunner.destroy();
        await pruneDockerAllIfGithubAction({ logLevel });
      } catch (err) {
        console.error("Error shutting down gateway in afterAll:", err);
      }
    }
  });

  test("Instantiate SATP Gateway Runner", async () => {
    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);

    await gatewayRunner.start();
    expect(gatewayRunner).toBeTruthy();
    expect(gatewayRunner.getContainer()).toBeTruthy();

    const serverHost = await gatewayRunner.getServerHost();
    expect(serverHost).toBeTruthy();
    expect(serverHost).toMatch(/^localhost:\d+$/);
    console.log(serverHost);

    const clientHost = await gatewayRunner.getClientHost();
    expect(clientHost).toBeTruthy();
    expect(serverHost).toMatch(/^localhost:\d+$/);
    console.log(clientHost);

    const apiHost = await gatewayRunner.getOApiHost();
    expect(apiHost).toBeTruthy();
    expect(serverHost).toMatch(/^localhost:\d+$/);
    console.log(apiHost);
  }, 200000);
});
