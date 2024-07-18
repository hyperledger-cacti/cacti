/**
 * Test for accessing data in PostgreSQL through persistence plugin PostgresDatabaseClient (packages/cactus-plugin-persistence-fabric).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const postgresImageName = "postgres";
const postgresImageVersion = "14.6-alpine";
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60 * 3; // 3 minutes timeout for setup

import {
  pruneDockerAllIfGithubAction,
  PostgresTestContainer,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import PostgresDatabaseClient from "../../../main/typescript/db-client/db-client";

import "jest-extended";
import { invalidSampleBlock, sampleBlock } from "./sample-block";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-fabric-postgresql-db-client.test",
  level: testLogLevel,
});

describe("Fabric persistence PostgreSQL PostgresDatabaseClient tests", () => {
  const testPluginName = "TestPlugin";
  const testPluginInstanceId = "testInstance";
  let postgresContainer: PostgresTestContainer;
  let dbClient: PostgresDatabaseClient;

  //////////////////////////////////
  // Helper Functions
  //////////////////////////////////

  /**
   * Delete all data from all tables
   */
  async function clearDbSchema() {
    await dbClient.client.query(
      "DELETE FROM fabric.transaction_action_endorsement",
    );
    await dbClient.client.query("DELETE FROM fabric.transaction_action");
    await dbClient.client.query("DELETE FROM fabric.transaction");
    await dbClient.client.query("DELETE FROM fabric.certificate");
    await dbClient.client.query("DELETE FROM fabric.block");
  }

  function checkDbCertificateObject(dbCert: any, sampleCert: any) {
    expect(dbCert.id).toBeTruthy();
    expect(dbCert.serial_number).toEqual(sampleCert.serialNumber);
    expect(dbCert.subject_alt_name).toEqual(sampleCert.subjectAltName);
    expect(dbCert.valid_from).toEqual(new Date(sampleCert.validFrom));
    expect(dbCert.valid_to).toEqual(new Date(sampleCert.validTo));
    expect(dbCert.pem).toEqual(sampleCert.pem);
  }

  async function getDbBlocks() {
    const response = await dbClient.client.query("SELECT * FROM fabric.block");
    return response.rows;
  }

  async function getDbTransactions() {
    const response = await dbClient.client.query(
      "SELECT * FROM fabric.transaction",
    );
    return response.rows;
  }

  async function getDbTransactionActions() {
    const response = await dbClient.client.query(
      "SELECT * FROM fabric.transaction_action",
    );
    return response.rows;
  }

  async function getDbTransactionActionEndorsements() {
    const response = await dbClient.client.query(
      "SELECT * FROM fabric.transaction_action_endorsement",
    );
    return response.rows;
  }

  async function getDbCertificates() {
    const response = await dbClient.client.query(
      "SELECT * FROM fabric.certificate",
    );
    return response.rows;
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Run PostgresTestContainer...");
    postgresContainer = new PostgresTestContainer({
      imageName: postgresImageName,
      imageVersion: postgresImageVersion,
      logLevel: testLogLevel,
      envVars: ["POSTGRES_USER=postgres", "POSTGRES_PASSWORD=postgres"],
    });
    await postgresContainer.start();
    const postgresPort = await postgresContainer.getPostgresPort();
    expect(postgresPort).toBeTruthy();
    log.info(`Postgres running at 127.0.0.1:${postgresPort}`);

    log.info("Create PostgresDatabaseClient");
    dbClient = new PostgresDatabaseClient({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:${postgresPort}/postgres`,
      logLevel: sutLogLevel,
    });

    log.info("Connect the PostgreSQL PostgresDatabaseClient");
    await dbClient.connect();

    log.info("Mock Supabase schema");
    // We use plain postgres for better performance, but the actual GUI will use Supabase which does it's own adjustment to the DB.
    await dbClient.client.query(
      `CREATE SCHEMA extensions;
       CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
       CREATE ROLE anon NOLOGIN;
       CREATE ROLE authenticated NOLOGIN;
       CREATE ROLE service_role NOLOGIN;
       CREATE ROLE supabase_admin NOLOGIN;`,
    );

    log.info("Initialize the test DB Schema");
    await dbClient.initializePlugin(testPluginName, testPluginInstanceId);

    // Assert all tables are created
    const response = await dbClient.client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'fabric'",
    );
    const tableNames = response.rows.map((row) => row.table_name);
    expect(tableNames.sort()).toEqual(
      [
        "block",
        "certificate",
        "transaction",
        "transaction_action",
        "transaction_action_endorsement",
      ].sort(),
    );

    // Assert plugin status was inserted
    const pluginStatus = await dbClient.getPluginStatus(testPluginName);
    expect(pluginStatus).toBeTruthy();
    expect(pluginStatus.name).toEqual(testPluginName);
    expect(pluginStatus.last_instance_id).toEqual(testPluginInstanceId);
    expect(pluginStatus.is_schema_initialized).toBeTrue();
    expect(pluginStatus.created_at).toEqual(pluginStatus.last_connected_at);

    log.info("Ensure DB Schema is empty (in case test is re-run on same DB");
    await clearDbSchema();
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (dbClient) {
      log.info("Disconnect the PostgresDatabaseClient");
      await dbClient.shutdown();
    }

    if (postgresContainer) {
      log.info("Stop PostgreSQL...");
      await postgresContainer.stop();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  afterEach(async () => {
    await clearDbSchema();
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test("Initialize plugin can be called repeatedly and it only updates the last_connected_at", async () => {
    const initPluginStatus = await dbClient.getPluginStatus(testPluginName);
    expect(initPluginStatus).toBeTruthy();

    await dbClient.initializePlugin(testPluginName, testPluginInstanceId);

    // Assert plugin status was inserted
    const pluginStatus = await dbClient.getPluginStatus(testPluginName);
    expect(pluginStatus).toBeTruthy();
    const lastConnectedAt = pluginStatus.last_connected_at;
    delete (pluginStatus as any).last_connected_at;
    expect(initPluginStatus).toMatchObject(pluginStatus);
    expect(lastConnectedAt).not.toEqual(initPluginStatus.last_connected_at);
  });

  // Note: it should also print a warning but we don't assert that
  test("Initialize plugin updates instance ID when it changes", async () => {
    const newInstanceId = "AnotherInstance";
    const initPluginStatus = await dbClient.getPluginStatus(testPluginName);
    expect(initPluginStatus).toBeTruthy();

    await dbClient.initializePlugin(testPluginName, newInstanceId);

    // Assert plugin status was inserted
    const pluginStatus = await dbClient.getPluginStatus(testPluginName);
    expect(pluginStatus).toBeTruthy();
    const { last_connected_at, last_instance_id } = pluginStatus;
    delete (pluginStatus as any).last_connected_at;
    delete (pluginStatus as any).last_instance_id;
    expect(initPluginStatus).toMatchObject(pluginStatus);
    expect(last_connected_at).not.toEqual(initPluginStatus.last_connected_at);
    expect(last_instance_id).toEqual(newInstanceId);
  });

  test("New block data is added to the DB", async () => {
    await dbClient.insertBlockData(sampleBlock);

    // Assert block
    const blocksResponse = await getDbBlocks();
    expect(blocksResponse.length).toBe(1);
    const dbBlock = blocksResponse[0];

    expect(dbBlock.id).toBeTruthy();
    expect(dbBlock.number).toEqual(sampleBlock.blockNumber.toString());
    expect(dbBlock.hash).toEqual(sampleBlock.blockHash);
    expect(dbBlock.transaction_count).toEqual(
      sampleBlock.transactionCount.toString(),
    );

    // Assert transactions
    const transactionsResponse = await getDbTransactions();
    expect(sampleBlock.cactiTransactionsEvents.length).toBe(1);
    expect(transactionsResponse.length).toBe(1);
    const dbTx = transactionsResponse[0];
    const sampleTx = sampleBlock.cactiTransactionsEvents[0];

    expect(dbTx.id).toBeTruthy();
    expect(dbTx.hash).toEqual(sampleTx.hash);
    expect(dbTx.channel_id).toEqual(sampleTx.channelId);
    expect(dbTx.timestamp).toEqual(new Date(sampleTx.timestamp));
    expect(dbTx.protocol_version).toEqual(sampleTx.protocolVersion);
    expect(dbTx.type).toEqual(sampleTx.transactionType);
    expect(dbTx.epoch).toEqual(sampleTx.epoch.toString());
    expect(dbTx.block_id).toBeTruthy();
    expect(dbTx.block_number).toEqual(sampleBlock.blockNumber.toString());

    // Assert transaction actions
    const transactionActionsResponse = await getDbTransactionActions();
    expect(sampleTx.actions.length).toBe(1);
    expect(transactionActionsResponse.length).toBe(1);
    const dbTxAction = transactionActionsResponse[0];
    const sampleTxAction = sampleTx.actions[0];

    expect(dbTxAction.id).toBeTruthy();
    expect(dbTxAction.function_name).toEqual(sampleTxAction.functionName);
    const dbActionArgs = dbTxAction.function_args.split(",");
    for (let i = 0; i < dbActionArgs.length; i++) {
      expect(
        Buffer.from(dbActionArgs[i].substring(2), "hex").toString("utf-8"),
      ).toEqual(sampleTxAction.functionArgs[i]);
    }
    expect(dbTxAction.chaincode_id).toEqual(sampleTxAction.chaincodeId);
    expect(dbTxAction.creator_msp_id).toEqual(sampleTxAction.creator.mspid);
    expect(dbTxAction.creator_certificate_id).toBeTruthy();
    expect(dbTxAction.transaction_id).toBeTruthy();

    // Assert transaction action endorsement
    const transactionActionEndorsementResponse =
      await getDbTransactionActionEndorsements();
    expect(sampleTxAction.endorsements.length).toBe(1);
    expect(transactionActionEndorsementResponse.length).toBe(1);
    const dbTxActionEndorsement = transactionActionEndorsementResponse[0];
    const sampleTxActionEndorsement = sampleTxAction.endorsements[0];

    expect(dbTxActionEndorsement.id).toBeTruthy();
    expect(dbTxActionEndorsement.mspid).toEqual(
      sampleTxActionEndorsement.signer.mspid,
    );
    expect(dbTxActionEndorsement.signature).toEqual(
      sampleTxActionEndorsement.signature,
    );
    expect(dbTxActionEndorsement.certificate_id).toBeTruthy();
    expect(dbTxActionEndorsement.transaction_action_id).toBeTruthy();

    // Assert certificates
    const certificatesResponse = await getDbCertificates();
    expect(certificatesResponse.length).toBe(2);

    const actionCreatorCert = certificatesResponse.find(
      (c) => c.serial_number === sampleTxAction.creator.cert.serialNumber,
    );
    checkDbCertificateObject(actionCreatorCert, sampleTxAction.creator.cert);

    const endorserCert = certificatesResponse.find(
      (c) =>
        c.serial_number === sampleTxActionEndorsement.signer.cert.serialNumber,
    );
    checkDbCertificateObject(
      endorserCert,
      sampleTxActionEndorsement.signer.cert,
    );
  });

  test("insertBlockData does not duplicate certificates in the database", async () => {
    await dbClient.insertBlockData(sampleBlock);

    // should add two certificates from sample block
    expect((await getDbCertificates()).length).toBe(2);

    // clear all other data
    await dbClient.client.query(
      "DELETE FROM fabric.transaction_action_endorsement",
    );
    await dbClient.client.query("DELETE FROM fabric.transaction_action");
    await dbClient.client.query("DELETE FROM fabric.transaction");
    await dbClient.client.query("DELETE FROM fabric.block");

    // add the block again
    await dbClient.insertBlockData(sampleBlock);

    // should not duplicate certificates
    expect((await getDbCertificates()).length).toBe(2);
  });

  test("insertBlockData atomic transaction is reverted on error", async () => {
    try {
      await dbClient.insertBlockData(invalidSampleBlock as any);
      expect(true).toBe(false); // Block insertion should fail
    } catch (error: unknown) {
      log.info("insertBlockData was rejected as expected");
    }

    // Assert no data was added
    expect((await getDbBlocks()).length).toBe(0);
    expect((await getDbCertificates()).length).toBe(0);
    expect((await getDbTransactions()).length).toBe(0);
    expect((await getDbTransactionActions()).length).toBe(0);
    expect((await getDbTransactionActionEndorsements()).length).toBe(0);
  });

  test("getBlock returns a block from the database", async () => {
    await dbClient.insertBlockData(sampleBlock);

    const block = await dbClient.getBlock(sampleBlock.blockNumber);

    expect(block.id).toBeTruthy();
    expect(block.number).toEqual(sampleBlock.blockNumber.toString());
    expect(block.hash).toEqual(sampleBlock.blockHash);
    expect(block.transaction_count).toEqual(
      sampleBlock.transactionCount.toString(),
    );
  });

  test("getMissingBlocksInRange returns all missing block list", async () => {
    await dbClient.insertBlockData(sampleBlock);
    expect(sampleBlock.blockNumber).toEqual(3); // sanity check sample data did not change

    const missingBlocks = await dbClient.getMissingBlocksInRange(1, 5);

    const missingBlocksNumbers = missingBlocks
      .map((b) => b.block_number)
      .sort();
    expect(missingBlocksNumbers).toEqual([1, 2, 4, 5]);
  });
});
