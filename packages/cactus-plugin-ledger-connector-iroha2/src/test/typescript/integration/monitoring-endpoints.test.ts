/**
 * SocketIO monitoring endpoints test.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "info";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Checks,
} from "@hyperledger/cactus-common";

import {
  IrohaInstruction,
  BlockTypeV1,
  WatchBlocksOptionsV1,
  WatchBlocksResponseV1,
  TransactionStatus,
} from "../../../main/typescript/public-api";
import {
  IrohaV2TestEnv,
  waitForCommit,
} from "../test-helpers/iroha2-env-setup";
import { addRandomSuffix } from "../test-helpers/utils";

import { VersionedCommittedBlock } from "@iroha2/data-model";
import "jest-extended";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "monitoring-endpoints.test",
  level: testLogLevel,
});

/**
 * WatchBlocks test
 */
describe("Block monitoring tests", () => {
  let env: IrohaV2TestEnv;

  beforeAll(async () => {
    env = new IrohaV2TestEnv(log);
    await env.start();
  });

  afterAll(async () => {
    if (env) {
      await env.stop();
    }
  });

  /**
   * Common test template for checking watchBlocksV1 endpoint.
   * Sends watchBlocks request, creates new dummy domain to trigger block creation, calls onEvent
   * when block is received. Caller should define all assertion in onEvent and throw new exception
   * if test should fail.
   *
   * @param monitorOptions `apiClient.watchBlocksV1` argument.
   * @param onEvent callback with received block data to be checked.
   */
  async function testWatchBlocks(
    monitorOptions: WatchBlocksOptionsV1,
    onEvent: (event: WatchBlocksResponseV1) => void,
  ) {
    // Start monitoring
    const monitorPromise = new Promise<void>((resolve, reject) => {
      const watchObservable = env.apiClient.watchBlocksV1(monitorOptions);
      const subscription = watchObservable.subscribe({
        next(event) {
          try {
            onEvent(event);
            resolve();
          } catch (err) {
            log.error("watchBlocksV1() event check error:", err);
            reject(err);
          } finally {
            subscription.unsubscribe();
          }
        },
        error(err) {
          log.error("watchBlocksV1() error:", err);
          subscription.unsubscribe();
          reject(err);
        },
      });
    });

    // Wait for monitor setup just to be sure
    await waitForCommit();

    // Create new domain to trigger new block creation
    const domainName = addRandomSuffix("watchBlocksTest");
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      baseConfig: env.defaultBaseConfig,
    });
    log.info("Watch block trigger tx sent to create domain", domainName);
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.status).toEqual(
      TransactionStatus.Submitted,
    );

    await expect(monitorPromise).toResolve();
  }

  test("watchBlocksV1 reports new blocks in raw json (default) format", async () => {
    const monitorOptions = {
      type: BlockTypeV1.Raw,
      baseConfig: env.defaultBaseConfig,
    };

    const testPromise = testWatchBlocks(monitorOptions, (event) => {
      log.info("Received block event from the connector");
      if (!("blockData" in event)) {
        throw new Error("Unknown response type, wanted raw JSON data");
      }
      Checks.truthy(event.blockData);
      log.debug("block:", event.blockData);
      expect(event.blockData).toBeTruthy();
      const parsedBlock = JSON.parse(event.blockData).value;
      expect(parsedBlock).toBeTruthy();
      expect(parsedBlock.header).toBeTruthy();
      expect(parsedBlock.transactions).toBeDefined();
      expect(parsedBlock.rejected_transactions).toBeDefined();
      expect(parsedBlock.event_recommendations).toBeDefined();
    });

    await expect(testPromise).toResolve();
  });

  test("watchBlocksV1 reports new blocks in binary format", async () => {
    const monitorOptions = {
      type: BlockTypeV1.Binary,
      baseConfig: env.defaultBaseConfig,
    };

    const testPromise = testWatchBlocks(monitorOptions, (event) => {
      log.info("Received block event from the connector");
      if (!("binaryBlock" in event)) {
        throw new Error("Unknown response type, wanted binary data");
      }
      Checks.truthy(event.binaryBlock);
      const decodedBlock = VersionedCommittedBlock.fromBuffer(
        Buffer.from(event.binaryBlock),
      );
      log.debug("decodedBlock:", decodedBlock);
      expect(decodedBlock.as("V1").header).toBeTruthy();
    });

    await expect(testPromise).toResolve();
  });
});
