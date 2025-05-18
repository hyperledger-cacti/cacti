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

describe("Ethereum persistence PostgreSQL PostgresDatabaseClient tests", () => {
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
    await dbClient.client.query("DELETE FROM ethereum.token_transfer");
    await dbClient.client.query("DELETE FROM ethereum.transaction");
    await dbClient.client.query("DELETE FROM ethereum.block");
    await dbClient.client.query("DELETE FROM ethereum.token_erc721");
    await dbClient.client.query("DELETE FROM ethereum.token_metadata_erc20");
    await dbClient.client.query("DELETE FROM ethereum.token_metadata_erc721");
  }

  async function getDbBlocks() {
    const response = await dbClient.client.query(
      "SELECT * FROM ethereum.block",
    );
    return response.rows;
  }

  async function getDbTransactions() {
    const response = await dbClient.client.query(
      "SELECT * FROM ethereum.transaction",
    );
    return response.rows;
  }

  async function getDbTokenTransfers() {
    const response = await dbClient.client.query(
      "SELECT * FROM ethereum.token_transfer",
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
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
       CREATE ROLE anon NOLOGIN;
       CREATE ROLE authenticated NOLOGIN;
       CREATE ROLE service_role NOLOGIN;
       CREATE ROLE supabase_admin NOLOGIN;`,
    );

    log.info("Initialize the test DB Schema");
    await dbClient.initializePlugin(testPluginName, testPluginInstanceId);

    // Assert all tables are created
    const response = await dbClient.client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'ethereum'",
    );
    const tableNames = response.rows.map((row) => row.table_name);
    expect(tableNames.sort()).toEqual(
      [
        "block",
        "token_metadata_erc20",
        "token_metadata_erc721",
        "token_erc721",
        "token_transfer",
        "transaction",
        "erc20_token_history_view",
        "erc721_token_history_view",
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

  test("Insert single and get all ERC20 token metadata.", async () => {
    // Metadata table should be empty at first
    const initTokens = await dbClient.getTokenMetadataERC20();
    expect(initTokens.length).toBe(0);

    // Insert single token
    const token = {
      address: "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280",
      name: "TestToken",
      symbol: "TT",
      total_supply: 1000,
    };
    await dbClient.insertTokenMetadataERC20(token);

    // Metadata table should contain token we've just added
    const tokensAfterInsert = await dbClient.getTokenMetadataERC20();
    expect(tokensAfterInsert.length).toBe(1);
    expect(tokensAfterInsert[0]).toMatchObject({
      ...token,
      total_supply: token.total_supply.toString(),
    });

    // Insert another token
    await dbClient.insertTokenMetadataERC20({
      address: "0x58E719254f1564eD29A86dB7554c47FaB778F3fE",
      name: "AnotherToken",
      symbol: "AT",
      total_supply: 999,
    });

    // Ensure new token is returned as well
    const tokensFinal = await dbClient.getTokenMetadataERC20();
    expect(tokensFinal.length).toBe(2);
  });

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

  test("Insert single and get all ERC721 token metadata.", async () => {
    // Metadata table should be empty at first
    const initTokens = await dbClient.getTokenMetadataERC721();
    expect(initTokens.length).toBe(0);

    // Insert single token
    const token = {
      address: "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280",
      name: "TestToken",
      symbol: "TT",
    };
    await dbClient.insertTokenMetadataERC721(token);

    // Metadata table should contain token we've just added
    const tokensAfterInsert = await dbClient.getTokenMetadataERC721();
    expect(tokensAfterInsert.length).toBe(1);
    expect(tokensAfterInsert[0]).toMatchObject(token);

    // Insert another token
    await dbClient.insertTokenMetadataERC721({
      address: "0x58E719254f1564eD29A86dB7554c47FaB778F3fE",
      name: "AnotherToken",
      symbol: "AT",
    });

    // Ensure new token is returned as well
    const tokensFinal = await dbClient.getTokenMetadataERC721();
    expect(tokensFinal.length).toBe(2);
  });

  test("Upsert already issued ERC721 token into table (without duplication)", async () => {
    // Insert token metadata
    const contractAddress = "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280";
    const token = {
      address: contractAddress,
      name: "TestToken",
      symbol: "TT",
    };
    await dbClient.insertTokenMetadataERC721(token);

    // Initially table should be empty
    const initialTokens = await dbClient.getTokenERC721();
    expect(initialTokens.length).toBe(0);

    // Upsert issued token that is not present in the DB
    const issuedToken = {
      account_address: "0x6dfc34609a05bC22319fA4Cce1d1E2929548c0D7",
      token_address: contractAddress,
      uri: "test.uri",
      token_id: 1,
    };
    await dbClient.upsertTokenERC721(issuedToken);

    // Check if new token was added
    const tokensAfterUpsert = await dbClient.getTokenERC721();
    expect(tokensAfterUpsert.length).toBe(1);
    expect(tokensAfterUpsert[0]).toMatchObject({
      ...issuedToken,
      token_id: issuedToken.token_id.toString(),
    });

    // Upsert the same token but with different owner
    const updatedToken = {
      ...issuedToken,
      account_address: "0x8888",
    };
    await dbClient.upsertTokenERC721(updatedToken);

    // Number of tokens should not change, only address should be updated
    const tokensFinal = await dbClient.getTokenERC721();
    expect(tokensFinal.length).toBe(1);
    expect(tokensFinal[0]).toMatchObject({
      ...updatedToken,
      token_id: updatedToken.token_id.toString(),
    });
  });

  test("New block data is added to the DB", async () => {
    const blockTimestamp = new Date(1671702925 * 1000);
    const block = {
      number: 18,
      created_at: blockTimestamp.toUTCString(),
      hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687e5",
      number_of_tx: 1,
    };

    const token_transfer = {
      sender: "0x0000000000000000000000000000000000000000",
      recipient: "0x12b60219Ca56110E53F9E79178713C363e8aF999",
      value: 1,
    };

    const transaction = {
      index: 0,
      hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1f4",
      from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
      to: "0x53F6337d308FfB2c52eDa319Be216cC7321D3725",
      eth_value: 0,
      method_signature: "0xa1448194",
      method_name: "",
    };

    await dbClient.insertBlockData({
      block,
      transactions: [
        {
          ...transaction,
          token_transfers: [token_transfer],
        },
      ],
    });

    // Assert block
    const blocksResponse = await getDbBlocks();
    expect(blocksResponse.length).toBe(1);
    const dbBlock = blocksResponse[0];
    expect(dbBlock.number).toEqual(block.number.toString());
    expect(dbBlock.hash).toEqual(block.hash);
    expect(dbBlock.number_of_tx).toEqual(block.number_of_tx.toString());

    // Assert transaction
    const txResponse = await getDbTransactions();
    expect(txResponse.length).toBe(1);
    const dbTx = txResponse[0];
    expect(dbTx).toMatchObject({
      ...transaction,
      index: transaction.index.toString(),
      block_number: block.number.toString(),
      eth_value: transaction.eth_value.toString(),
    });

    // Assert token transfer
    const transferResponse = await getDbTokenTransfers();
    expect(transferResponse.length).toBe(1);
    const dbTransfer = transferResponse[0];
    expect(dbTransfer).toMatchObject({
      ...token_transfer,
      value: token_transfer.value.toString(),
    });
  });

  test("insertBlockData atomic transaction is reverted on error ", async () => {
    const blockTimestamp = new Date(1671702925 * 1000);
    const block = {
      number: 18,
      created_at: blockTimestamp.toUTCString(),
      hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687e5",
      number_of_tx: 1,
    };

    const token_transfer = {
      sender: "0x0000000000000000000000000000000000000000",
      recipient: "0x12b60219Ca56110E53F9E79178713C363e8aF999",
      value: "asd" as any, // Invalid value type, should fail after already adding block and tx
    };

    const transaction = {
      index: 0,
      hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1f4",
      from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
      to: "0x53F6337d308FfB2c52eDa319Be216cC7321D3725",
      eth_value: 0,
      method_signature: "0xa1448194",
      method_name: "",
    };

    try {
      await dbClient.insertBlockData({
        block,
        transactions: [
          {
            ...transaction,
            token_transfers: [token_transfer],
          },
        ],
      });
      expect(true).toBe(false); // Block insertion should fail
    } catch (error: unknown) {
      log.info("insertBlockData was rejected as expected");
    }

    // Assert no data was added
    const blocksResponse = await getDbBlocks();
    expect(blocksResponse.length).toBe(0);
    const txResponse = await getDbTransactions();
    expect(txResponse.length).toBe(0);
    const transferResponse = await getDbTokenTransfers();
    expect(transferResponse.length).toBe(0);
  });

  test("ERC20 token balance is updated on new block", async () => {
    // Current balance table should be empty
    const currentBalance = await dbClient.getTokenERC20();
    expect(currentBalance.length).toBe(0);

    // Insert test token metadata
    const contractAddr = "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280";
    await dbClient.insertTokenMetadataERC20({
      address: contractAddr,
      name: "TestToken",
      symbol: "TT",
      total_supply: 1000,
    });

    // Insert block with several transfers of our tokens
    const blockTimestamp = new Date(1671702925 * 1000);
    const firstAccount = "0x12b60219Ca56110E53F9E79178713C363e8aF999";
    const secondAccount = "0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263";
    await dbClient.insertBlockData({
      block: {
        number: 18,
        created_at: blockTimestamp.toUTCString(),
        hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687e5",
        number_of_tx: 1,
      },
      transactions: [
        {
          index: 0,
          hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1f4",
          from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
          to: contractAddr,
          eth_value: 0,
          method_signature: "0xa1448194",
          method_name: "",
          token_transfers: [
            {
              sender: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
              recipient: firstAccount,
              value: 100,
            },
            {
              sender: firstAccount,
              recipient: secondAccount,
              value: 25,
            },
          ],
        },
      ],
    });
    await dbClient.syncTokenBalanceERC20();

    const balanceAfterInsert = await dbClient.getTokenERC20();
    log.debug("balanceAfterInsert", balanceAfterInsert);
    expect(balanceAfterInsert.length).toBe(2);

    // Assert first account balance
    const firstAccountBalance = balanceAfterInsert.find(
      (b) => b.account_address === firstAccount,
    );
    expect(firstAccountBalance).toBeTruthy();
    expect(firstAccountBalance?.balance).toEqual("75");

    // Assert second account balance
    const secondAccountBalance = balanceAfterInsert.find(
      (b) => b.account_address === secondAccount,
    );
    expect(secondAccountBalance).toBeTruthy();
    expect(secondAccountBalance?.balance).toEqual("25");
  });

  test("ERC721 token balance is updated on new block", async () => {
    // Current balance table should be empty
    const currentBalance = await dbClient.getTokenERC721();
    expect(currentBalance.length).toBe(0);

    // Insert test token metadata
    const contractAddr = "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280";
    await dbClient.insertTokenMetadataERC721({
      address: contractAddr,
      name: "TestToken",
      symbol: "TT",
    });

    // Insert block with initial transfers
    const firstAccount = "0x12b60219Ca56110E53F9E79178713C363e8aF999";
    const secondAccount = "0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263";
    await dbClient.insertBlockData({
      block: {
        number: 18,
        created_at: new Date(1671702925 * 1000).toUTCString(),
        hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687e5",
        number_of_tx: 1,
      },
      transactions: [
        {
          index: 0,
          hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1f4",
          from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
          to: contractAddr,
          eth_value: 0,
          method_signature: "0xa1448194",
          method_name: "",
          token_transfers: [
            {
              sender: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
              recipient: firstAccount,
              value: 1,
            },
            {
              sender: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
              recipient: firstAccount,
              value: 2,
            },
          ],
        },
      ],
    });
    await dbClient.syncTokenBalanceERC721(18);

    // Insert block with transfer to second account
    await dbClient.insertBlockData({
      block: {
        number: 19,
        created_at: new Date(1671702999 * 1000).toUTCString(),
        hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687ff",
        number_of_tx: 1,
      },
      transactions: [
        {
          index: 0,
          hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1aa",
          from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
          to: contractAddr,
          eth_value: 0,
          method_signature: "0xa1448194",
          method_name: "",
          token_transfers: [
            {
              sender: firstAccount,
              recipient: secondAccount,
              value: 2,
            },
          ],
        },
      ],
    });
    await dbClient.syncTokenBalanceERC721(19);

    const balanceAfterInsert = await dbClient.getTokenERC721();
    log.debug("balanceAfterInsert", balanceAfterInsert);
    expect(balanceAfterInsert.length).toBe(2);

    // Assert first token owner
    const firstToken = balanceAfterInsert.find(
      (b) => (b.token_id as unknown as string) === "1",
    );
    expect(firstToken).toBeTruthy();
    expect(firstToken?.account_address).toEqual(firstAccount);

    // Assert second token owner
    const secondToken = balanceAfterInsert.find(
      (b) => (b.token_id as unknown as string) === "2",
    );
    expect(secondToken).toBeTruthy();
    expect(secondToken?.account_address).toEqual(secondAccount);
  });

  test("Only ERC721 token owner and last_owner_change is updated on already issued token", async () => {
    // Insert token metadata
    const contractAddress = "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280";
    const token = {
      address: contractAddress,
      name: "TestToken",
      symbol: "TT",
    };
    await dbClient.insertTokenMetadataERC721(token);

    // Initially there should be no issued tokens
    const initialTokens = await dbClient.getTokenERC721();
    expect(initialTokens.length).toBe(0);

    // Insert already issued token
    const issuedTokenUri = "my-test-token.uri";
    const firstAccount = "0x12b60219Ca56110E53F9E79178713C363e8aF999";
    await dbClient.upsertTokenERC721({
      account_address: firstAccount,
      token_address: contractAddress,
      uri: issuedTokenUri,
      token_id: 1,
    });

    // Transfer our token
    const blockTimestamp = Date.now() + 1000 * 60 * 60 * 24 * 365; // Year from now
    const secondAccount = "0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263";
    await dbClient.insertBlockData({
      block: {
        number: 18,
        created_at: new Date(blockTimestamp).toUTCString(),
        hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687e5",
        number_of_tx: 1,
      },
      transactions: [
        {
          index: 0,
          hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1f4",
          from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
          to: contractAddress,
          eth_value: 0,
          method_signature: "0xa1448194",
          method_name: "",
          token_transfers: [
            {
              sender: firstAccount,
              recipient: secondAccount,
              value: 1,
            },
          ],
        },
      ],
    });
    await dbClient.syncTokenBalanceERC721(18);

    const balanceAfterInsert = await dbClient.getTokenERC721();
    log.debug("balanceAfterInsert", balanceAfterInsert);
    expect(balanceAfterInsert.length).toBe(1);

    // Assert only token owner and last_owner_change were updated
    const updatedToken = balanceAfterInsert[0];
    expect(updatedToken).toMatchObject({
      account_address: secondAccount, // owner changed
      token_address: contractAddress,
      uri: issuedTokenUri,
      token_id: "1",
    });
    // timestamp updated
    expect(new Date(updatedToken.last_owner_change).toDateString()).toEqual(
      new Date(blockTimestamp).toDateString(),
    );
  });

  test("ERC721 token is not updated if if was updated after the transaction was committed (manual token sync)", async () => {
    // Insert token metadata
    const contractAddress = "0x42EA16C9B9e529dA492909F34f416fEd2bE7c280";
    const token = {
      address: contractAddress,
      name: "TestToken",
      symbol: "TT",
    };
    await dbClient.insertTokenMetadataERC721(token);

    // Initially there should be no issued tokens
    const initialTokens = await dbClient.getTokenERC721();
    expect(initialTokens.length).toBe(0);

    // Insert already issued token
    const issuedTokenUri = "my-test-token.uri";
    const firstAccount = "0x12b60219Ca56110E53F9E79178713C363e8aF999";
    await dbClient.upsertTokenERC721({
      account_address: firstAccount,
      token_address: contractAddress,
      uri: issuedTokenUri,
      token_id: 1,
    });

    // Transfer our token
    const blockTimestamp = Date.now() - 1000 * 60 * 60 * 24 * 365; // Year before now (e.g. we process old blocks)
    const secondAccount = "0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263";
    await dbClient.insertBlockData({
      block: {
        number: 18,
        created_at: new Date(blockTimestamp).toUTCString(),
        hash: "0x2bdfd1957e88297b012a1dc15a51f3691371980749378d10a6186b221d6687e5",
        number_of_tx: 1,
      },
      transactions: [
        {
          index: 0,
          hash: "0x29a3ad97041d01ed610cfab19a091239135ee6bef6d2d7513e94dbb26f8bb1f4",
          from: "0x00a329c0648769A73afAc7F9381E08FB43dBEA72",
          to: contractAddress,
          eth_value: 0,
          method_signature: "0xa1448194",
          method_name: "",
          token_transfers: [
            {
              sender: firstAccount,
              recipient: secondAccount,
              value: 1,
            },
          ],
        },
      ],
    });
    await dbClient.syncTokenBalanceERC721(18);

    const balanceAfterInsert = await dbClient.getTokenERC721();
    log.debug("balanceAfterInsert", balanceAfterInsert);
    expect(balanceAfterInsert.length).toBe(1);

    // Assert only token owner and last_owner_change were updated
    const updatedToken = balanceAfterInsert[0];
    expect(updatedToken).toMatchObject({
      account_address: firstAccount, // owner not changed
      token_address: contractAddress,
      uri: issuedTokenUri,
      token_id: "1",
    });
  });
});
