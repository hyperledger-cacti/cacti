import "jest-extended";
import axios from "axios";
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
import { setupGatewayDockerFiles, CI_TEST_TIMEOUT } from "../../test-utils";
import {
  SATP_DOCKER_IMAGE_VERSION,
  SATP_DOCKER_IMAGE_NAME,
} from "../../constants";

// Acceptance check for the pre-published upstream gateway image: the container
// must boot and serve its OAPI healthcheck endpoint. Deliberately minimal so
// it can run as a fast smoke test in CI; the full oracle/transfer scenarios
// live in the docker-local suite.
const HEALTHCHECK_PATH =
  "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck";
const HEALTHCHECK_TIMEOUT_MS = 5 * 60 * 1000;
const HEALTHCHECK_POLL_INTERVAL_MS = 5000;

const logLevel: LogLevelDesc = "DEBUG";

async function waitUntilHealthy(oapiHost: string): Promise<void> {
  const deadline = Date.now() + HEALTHCHECK_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const res = await axios.get(`http://${oapiHost}${HEALTHCHECK_PATH}`);
      if (res.status === 200 && res.data?.status === "AVAILABLE") {
        return;
      }
      lastError = new Error(
        `Unexpected healthcheck response: status=${res.status} body=${JSON.stringify(res.data)}`,
      );
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, HEALTHCHECK_POLL_INTERVAL_MS),
    );
  }

  throw new Error(
    `Gateway did not become healthy within ${HEALTHCHECK_TIMEOUT_MS}ms: ${lastError}`,
  );
}

describe("SATP Gateway upstream image acceptance", () => {
  let gatewayRunner: SATPGatewayRunner;
  // Must NOT be "localhost": the gateway only binds 0.0.0.0 (reachable via
  // the container's published ports) for non-localhost gid addresses.
  const address: Address = `http://gateway.satp-hermes`;

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
  }, CI_TEST_TIMEOUT);

  test(
    "Upstream image boots and reports healthy",
    async () => {
      gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);

      await gatewayRunner.start();
      expect(gatewayRunner).toBeTruthy();
      expect(gatewayRunner.getContainer()).toBeTruthy();

      const serverHost = await gatewayRunner.getServerHost();
      expect(serverHost).toBeTruthy();
      expect(serverHost).toMatch(/^localhost:\d+$/);

      const clientHost = await gatewayRunner.getClientHost();
      expect(clientHost).toBeTruthy();
      expect(clientHost).toMatch(/^localhost:\d+$/);

      const apiHost = await gatewayRunner.getOApiHost();
      expect(apiHost).toBeTruthy();
      expect(apiHost).toMatch(/^localhost:\d+$/);

      await waitUntilHealthy(apiHost);
    },
    CI_TEST_TIMEOUT,
  );
});
