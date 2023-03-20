/**
 * Test for accessing data in PostgreSQL through persistence plugin PostgresDatabaseClient (packages/cactus-plugin-persistence-ethereum).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const postgresImageName = "postgres";
const postgresImageVersion = "14.6-alpine";
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

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

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-ethereum-postgresql-db-client.test",
  level: testLogLevel,
});

describe("Fabric persistence PostgreSQL PostgresDatabaseClient tests", () => {
  const testPluginName = "TestPlugin";
  const testPluginInstanceId = "testInstance";
  let postgresContainer: PostgresTestContainer;
  let dbClient: PostgresDatabaseClient;

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
    log.info(`Postgres running at localhost:${postgresPort}`);

    log.info("Create PostgresDatabaseClient");
    dbClient = new PostgresDatabaseClient({
      connectionString: `postgresql://postgres:postgres@localhost:${postgresPort}/postgres`,
      logLevel: sutLogLevel,
    });

    log.info("Connect the PostgreSQL PostgresDatabaseClient");
    await dbClient.connect();
    await dbClient.client.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
       CREATE ROLE anon NOLOGIN;
       CREATE ROLE authenticated NOLOGIN;
       CREATE ROLE service_role NOLOGIN;
       CREATE ROLE supabase_admin NOLOGIN;`,
    );

    log.info("Initialize the test DB Schema");
    await dbClient.initializePlugin(testPluginName, testPluginInstanceId);

    log.info("Mock Supabase schema");
    log.info("Ensure DB Schema is empty (in case test is re-run on same DB");
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

  test("isThisBlockInDB method", async () => {
    const isThisBlockInDB = await dbClient.isThisBlockInDB(-1);
    log.warn("isThisBlockInDB", isThisBlockInDB);
    expect(isThisBlockInDB).toBeTruthy();
    expect(isThisBlockInDB.rowCount).toEqual(0);
  });
});
