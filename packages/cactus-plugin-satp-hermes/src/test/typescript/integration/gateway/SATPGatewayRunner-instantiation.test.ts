import "jest-extended";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger-cacti/cactus-common";
import { SupportedSigningAlgorithms } from "../../../../main/typescript/core/types";
import {
  ISATPGatewayRunnerConstructorOptions,
  pruneDockerContainersIfGithubAction,
  SATPGatewayRunner,
} from "@hyperledger-cacti/cactus-test-tooling";
import {
  DEFAULT_PORT_GATEWAY_OAPI,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import { setupGatewayDockerFiles } from "../../test-utils";
import {
  SATP_DOCKER_IMAGE_VERSION,
  SATP_DOCKER_IMAGE_NAME,
} from "../../constants";

const logLevel: LogLevelDesc = "DEBUG";

describe("Instantiate SATP Gateway Runner", () => {
  let gatewayRunner: SATPGatewayRunner;
  const address: Address = `http://localhost`;

  // gateway setup:
  const gatewayKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

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
    identificationCredential: {
      signingAlgorithm: SupportedSigningAlgorithms.SECP256K1,
      pubKey: Buffer.from(gatewayKeyPair.publicKey).toString("hex"),
    },
  } as GatewayIdentity;

  const files = setupGatewayDockerFiles({
    gatewayIdentity,
    logLevel,
    counterPartyGateways: [], //only knows itself
    enableCrashRecovery: false, // Crash recovery disabled
    gatewayKeyPair: {
      privateKey: gatewayKeyPair.privateKey.toString("hex"),
      publicKey: Buffer.from(gatewayKeyPair.publicKey).toString("hex"),
    },
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
        await pruneDockerContainersIfGithubAction({ logLevel });
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
