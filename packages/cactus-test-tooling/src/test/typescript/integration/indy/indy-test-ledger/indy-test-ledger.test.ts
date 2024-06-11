/**
 * Tests of Indy helper typescript setup class.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const containerImageName = "ghcr.io/outsh/cactus-indy-all-in-one";
const containerImageVersion = "0.1";

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const leaveLedgerRunning = false;
const useRunningLedger = false;

// Log settings
const testLogLevel: LogLevelDesc = "info";

import {
  IndyTestLedger,
  pruneDockerAllIfGithubAction,
} from "../../../../../main/typescript/index";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import * as path from "node:path";
import * as os from "node:os";
import { rm } from "node:fs/promises";
import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import {
  Agent,
  DidsModule,
  TypedArrayEncoder,
  KeyType,
} from "@aries-framework/core";
import {
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from "@aries-framework/indy-vdr";
import { AskarModule } from "@aries-framework/askar";
import { agentDependencies } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";

const TEST_WALLET_PATH = path.join(
  os.tmpdir(),
  "indy-test-ledger.test-test-wallet",
);
const TEST_INDY_NAMESPACE = "cacti:test";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "indy-test-ledger.test",
  level: testLogLevel,
});

/**
 * Import endorser DID using it's seed.
 * @warn If there's any endorser DID already in a wallet then it will be returned. New one (`seed`) will be ignored!
 *
 * @param agent Aries agent
 * @param seed private DID seed
 *
 * @returns endorser fully-qualified DID
 */
async function importExistingIndyDidFromPrivateKey(
  agent: Agent<any>,
  seed: string,
): Promise<string> {
  const [endorserDid] = await agent.dids.getCreatedDids({ method: "indy" });
  if (endorserDid) {
    throw new Error("Endorser DID already present in a wallet");
  }

  const seedBuffer = TypedArrayEncoder.fromString(seed);
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    privateKey: seedBuffer,
  });

  // did is first 16 bytes of public key encoded as base58
  const unqualifiedIndyDid = TypedArrayEncoder.toBase58(
    key.publicKey.slice(0, 16),
  );

  const did = `did:indy:${TEST_INDY_NAMESPACE}:${unqualifiedIndyDid}`;

  await agent.dids.import({
    did,
  });

  return did;
}

/**
 * Main test suite
 */
describe("Indy Test Ledger checks", () => {
  const walletName = uuidv4();
  let ledger: IndyTestLedger;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start IndyTestLedger...");
    ledger = new IndyTestLedger({
      containerImageName,
      containerImageVersion,
      useRunningLedger,
      emitContainerLogs: false,
      logLevel: testLogLevel,
    });
    log.debug("Indy image:", ledger.fullContainerImageName);
    expect(ledger).toBeTruthy();

    await ledger.start();
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the indy ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    try {
      await rm(TEST_WALLET_PATH, {
        recursive: true,
        force: true,
        maxRetries: 5,
      });
      log.info(`${TEST_WALLET_PATH} removed successfully.`);
    } catch (error) {
      log.warn(`${TEST_WALLET_PATH} could not be removed:`, error);
    }
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Check if started container is still healthy.
   */
  test("Started container is healthy", async () => {
    const status = await ledger.getContainerStatus();
    expect(status).toEndWith("(healthy)");
  });

  test("Can read pool_transactions_genesis file from a container", async () => {
    const genesisObj = await ledger.readPoolTransactionsGenesis();
    const genesisTxList = genesisObj
      .split("\n")
      .filter((v: string) => v.trim()); // remove empty lines
    expect(genesisTxList.length).toBeGreaterThan(0);

    for (const tx of genesisTxList) {
      expect(tx).toBeTruthy();
      const parsedTx = JSON.parse(tx);
      expect(parsedTx).toBeTruthy();
      const txData = parsedTx.txn.data.data;
      expect(txData).toBeTruthy();
      expect(txData.node_ip).toBeTruthy();
      expect(txData.node_port).toBeTruthy();
    }
  });

  test("Can get valid IndyVdrPoolConfig", async () => {
    const indyPoolConfig = await ledger.getIndyVdrPoolConfig();
    expect(indyPoolConfig).toBeTruthy();
    expect(indyPoolConfig.isProduction).toBeDefined();
    expect(indyPoolConfig.genesisTransactions).toBeTruthy();
    expect(indyPoolConfig.indyNamespace).toBeTruthy();
    expect(indyPoolConfig.connectOnStartup).toBeDefined();
  });

  test("Indy agent can connect and resolve did on the pool", async () => {
    const indyPoolConfig =
      await ledger.getIndyVdrPoolConfig(TEST_INDY_NAMESPACE);
    expect(indyPoolConfig).toBeTruthy();
    const agent = new Agent({
      config: {
        label: walletName,
        walletConfig: {
          id: walletName,
          key: walletName,
          storage: {
            type: "sqlite",
            path: path.join(TEST_WALLET_PATH, "test-wallet.sqlite"),
          },
        },
      },
      modules: {
        indyVdr: new IndyVdrModule({
          indyVdr,
          networks: [indyPoolConfig],
        }),
        dids: new DidsModule({
          resolvers: [new IndyVdrIndyDidResolver()],
        }),
        askar: new AskarModule({ ariesAskar }),
      },
      dependencies: agentDependencies,
    });
    expect(agent).toBeTruthy();

    try {
      await agent.initialize();
      expect(agent.isInitialized).toBeTrue();

      await importExistingIndyDidFromPrivateKey(
        agent,
        ledger.getEndorserDidSeed(),
      );
      const createdDids = await agent.dids.getCreatedDids();
      expect(createdDids.length).toBeGreaterThan(0);
    } finally {
      agent.shutdown();
    }
  });
});
