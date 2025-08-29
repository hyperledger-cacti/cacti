import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { CbdcBridgingApp } from "../../../main/typescript";
import { ICbdcBridgingApp } from "../../../main/typescript/cbdc-bridging-app";

const logLevel: LogLevelDesc = "DEBUG";
const TIMEOUT: number = 1000000;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "CBDC Bridging Backend",
});
beforeAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

afterAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Setup CBDC app infrastructure", () => {
  jest.setTimeout(TIMEOUT);
  let app: CbdcBridgingApp;
  it(
    "Should setup everything successfully",
    async () => {
      const options: ICbdcBridgingApp = {
        apiHost: "localhost",
        logLevel,
      };
      app = new CbdcBridgingApp(options);
      expect(app).toBeDefined();

      await app.start();
    },
    TIMEOUT,
  );

  it(
    "Should shutdown everything successfully",
    async () => {
      await app.stop();
    },
    TIMEOUT,
  );
});
