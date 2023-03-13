/**
 * Test for accessing data in PostgreSQL through persistence plugin PostgresDatabaseClient (packages/cactus-plugin-persistence-ethereum).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// const postgresImageName = "postgres";
// const postgresImageVersion = "14.6-alpine";
const testLogLevel: LogLevelDesc = "info";
// const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

import {
  pruneDockerAllIfGithubAction,
  // PostgresTestContainer,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import PostgresDatabaseClient from "../../../main/typescript/db-client/db-client";

import "jest-extended";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-ethereum-postgresql-db-client.test",
  level: testLogLevel,
});

describe("Fabric persistence PostgreSQL PostgresDatabaseClient tests", () => {
  const testPluginName = "TestPlugin";
  const testPluginInstanceId = "testInstance";
  // let postgresContainer: PostgresTestContainer;
  let dbClient: PostgresDatabaseClient;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Create PostgresDatabaseClient");
    dbClient = new PostgresDatabaseClient({
      connectionString: `postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres`,
    });

    log.info("Connect the PostgreSQL PostgresDatabaseClient");
    await dbClient.connect();

    log.info("Mock Supabase schema");
    log.info("Ensure DB Schema is empty (in case test is re-run on same DB");
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (dbClient) {
      log.info("Disconnect the PostgresDatabaseClient");
      await dbClient.shutdown();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);
  // query the db schema located in dbClient Folder
  test.skip("plugins checks", async () => {
    log.info("Initialize the test DB Schema");
    const response = await dbClient.initializePlugin(
      testPluginName,
      testPluginInstanceId,
    );
    expect(response).toBeTruthy;
  });
  //insert simple BlockData into db
  test("insert into fabric_blocks", async () => {
    const block_data = {
      fabric_block_id: "1",
      fabric_block_num: 1,
      fabric_block_data:
        "dd9c20b516743ac44da1afe5242b38baa4c7523bb66f8473ae94299f1fbff810",
    };
    const response = await dbClient.insertBlockDataEntry(block_data);

    expect(response.command).toEqual("INSERT");
    expect(response.rowCount).toEqual(1);
    expect(response).toBeTruthy;
  });
  // check simple database query
  test("maxblock", async () => {
    const getMaxBlockNumber = await dbClient.getMaxBlockNumber();

    expect(getMaxBlockNumber).toBeTruthy();
    expect(getMaxBlockNumber).toBeGreaterThanOrEqual(1);
  });
});
