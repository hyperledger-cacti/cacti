/**
 * Client class to communicate with PostgreSQL database.
 */

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { Database as DatabaseSchemaType } from "./database.types";
import { getRuntimeErrorCause } from "../utils";

import fs from "fs";
import path from "path";
import { Client as PostgresClient } from "pg";
import { RuntimeError } from "run-time-error-cjs";

//////////////////////////////////
// Helper Types
//////////////////////////////////

type SchemaTables = DatabaseSchemaType["ethereum"]["Tables"];
type PluginStatusRowType = SchemaTables["plugin_status"]["Row"];
type BlockRowType = SchemaTables["block"]["Row"];
type BlockInsertType = SchemaTables["block"]["Insert"];
type TransactionInsertType = SchemaTables["transaction"]["Insert"];
type TokenTransferInsertType = SchemaTables["token_transfer"]["Insert"];
type TokenERC72RowType = SchemaTables["token_erc721"]["Row"];
type TokenERC72InsertType = SchemaTables["token_erc721"]["Insert"];
type TokenMetadataERC20RowType = SchemaTables["token_metadata_erc20"]["Row"];
type TokenMetadataERC20InsertType =
  SchemaTables["token_metadata_erc20"]["Insert"];
type TokenMetadataERC721RowType = SchemaTables["token_metadata_erc721"]["Row"];
type TokenMetadataERC721InsertType =
  SchemaTables["token_metadata_erc721"]["Insert"];

type SchemaFunctions = DatabaseSchemaType["ethereum"]["Functions"];
type GetMissingBlocksInRangeReturnType =
  SchemaFunctions["get_missing_blocks_in_range"]["Returns"];

// Supabase doesn't generate materialized view types
type TokenERC20RowType = {
  account_address: string;
  token_address: string;
  balance: number;
};

export type BlockDataTransferInput = Omit<
  TokenTransferInsertType,
  "transaction_id"
>;

export type BlockDataTransactionInput = Omit<
  TransactionInsertType,
  "block_number"
> & {
  token_transfers: BlockDataTransferInput[];
};

type InsertBlockDataInput = {
  block: BlockInsertType;
  transactions: BlockDataTransactionInput[];
};

export interface PostgresDatabaseClientOptions {
  connectionString: string;
  logLevel: LogLevelDesc;
}

//////////////////////////////////
// PostgresDatabaseClient
//////////////////////////////////

/**
 * Client class to communicate with PostgreSQL database.
 * Remember to call `connect()` before using ano of the methods.
 *
 * @todo Use pg connection pool
 */
export default class PostgresDatabaseClient {
  private log: Logger;
  public static readonly CLASS_NAME = "PostgresDatabaseClient";
  public client: PostgresClient;
  public isConnected = false;

  constructor(public options: PostgresDatabaseClientOptions) {
    const fnTag = `${PostgresDatabaseClient.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.connectionString,
      `${fnTag} arg options.connectionString`,
    );

    const level = this.options.logLevel || "INFO";
    const label = PostgresDatabaseClient.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.client = new PostgresClient({
      connectionString: options.connectionString,
    });
  }

  /**
   * Internal method that throws if postgres client is not connected yet.
   */
  private assertConnected(): void {
    if (!this.isConnected) {
      throw new Error(
        `${PostgresDatabaseClient.CLASS_NAME} method called before connecting to the DB!`,
      );
    }
  }

  /**
   * Connect to a PostgreSQL database using connection string from the constructor.
   */
  public async connect(): Promise<void> {
    this.log.info("Connect to PostgreSQL database...");
    await this.client.connect();
    this.isConnected = true;
  }

  /**
   * Close the connection to to a PostgreSQL database.
   */
  public async shutdown(): Promise<void> {
    this.log.info("Close connection with PostgreSQL database.");
    await this.client.end();
    this.isConnected = false;
  }

  /**
   * Read status of persistence plugin with specified name.
   * @param pluginName name of the persistence plugin
   * @returns status row
   */
  public async getPluginStatus(
    pluginName: string,
  ): Promise<PluginStatusRowType> {
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM public.plugin_status WHERE name = $1",
      [pluginName],
    );

    if (queryResponse.rows.length !== 1) {
      throw new Error(
        `Could not read status of plugin #${pluginName} from the DB`,
      );
    }

    return queryResponse.rows[0];
  }

  /**
   * Initialize / update entry for specific persistence plugin in the database.
   * Create database schema for ethereum data if it was not created yet.
   * @param pluginName name of the persistence plugin
   * @param instanceId instance id of the persistence plugin
   */
  public async initializePlugin(
    pluginName: string,
    instanceId: string,
  ): Promise<void> {
    this.assertConnected();

    let isSchemaInitialized = false;

    try {
      const pluginStatus = await this.getPluginStatus(pluginName);

      if (pluginStatus.last_instance_id != instanceId) {
        this.log.warn(
          `Instance ID in DB different from this plugin id (${pluginStatus.last_instance_id} != ${instanceId})! Make sure only one persistence plugin is running at a time!`,
        );
      }

      isSchemaInitialized = pluginStatus.is_schema_initialized;
    } catch (error) {
      this.log.info("No status in the DB for plugin", pluginName);
    }

    if (!isSchemaInitialized) {
      const schemaPath = path.join(__dirname, "../../sql/schema.sql");
      this.log.info(
        "Path to SQL script to create a database schema:",
        schemaPath,
      );

      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      this.log.debug("Schema file length:", schemaSql.length);

      await this.client.query(schemaSql);
      isSchemaInitialized = true;

      this.log.info("Schema DB initialized.");
    }

    this.log.info(
      `Update status for plugin ${pluginName} with instanceId ${instanceId}`,
    );
    const updatePluginInfo = await this.client.query(
      `INSERT INTO public.plugin_status("name", "last_instance_id", "is_schema_initialized")
       VALUES ($1, $2, $3)
       ON CONFLICT ON CONSTRAINT plugin_status_pkey
       DO
        UPDATE SET
          last_instance_id = EXCLUDED.last_instance_id,
          is_schema_initialized = EXCLUDED.is_schema_initialized,
          last_connected_at=now();
        `,
      [pluginName, instanceId, isSchemaInitialized],
    );
    this.log.debug(
      `Plugin status updated for ${updatePluginInfo.rowCount} rows.`,
    );
  }

  /**
   * Read all ERC20 token metadata.
   * @returns ERC20 token metadata
   */
  public async getTokenMetadataERC20(): Promise<TokenMetadataERC20RowType[]> {
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM ethereum.token_metadata_erc20",
    );
    this.log.debug(
      `Received ${queryResponse.rowCount} rows from table token_metadata_erc20`,
    );
    return queryResponse.rows;
  }

  /**
   * Insert new ERC20 token metadata into the database.
   * @param token ERC20 token metadata
   */
  public async insertTokenMetadataERC20(
    token: TokenMetadataERC20InsertType,
  ): Promise<void> {
    this.assertConnected();

    this.log.debug("Insert ERC20 token metadata:", token);
    const insertResponse = await this.client.query(
      `INSERT INTO ethereum.token_metadata_erc20("address", "name", "symbol", "total_supply") VALUES ($1, $2, $3, $4)`,
      [token.address, token.name, token.symbol, token.total_supply],
    );
    this.log.info(
      `Inserted ${insertResponse.rowCount} rows into table token_metadata_erc20`,
    );
  }

  /**
   * Read all ERC721 token metadata.
   * @returns ERC721 token metadata
   */
  public async getTokenMetadataERC721(): Promise<TokenMetadataERC721RowType[]> {
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM ethereum.token_metadata_erc721",
    );
    this.log.debug(
      `Received ${queryResponse.rowCount} rows from table token_metadata_erc721`,
    );
    return queryResponse.rows;
  }

  /**
   * Insert new ERC721 token metadata into the database.
   * @param token ERC721 token metadata
   */
  public async insertTokenMetadataERC721(
    token: TokenMetadataERC721InsertType,
  ): Promise<void> {
    this.assertConnected();

    this.log.debug("Insert ERC721 token metadata:", token);
    const insertResponse = await this.client.query(
      `INSERT INTO ethereum.token_metadata_erc721("address", "name", "symbol") VALUES ($1, $2, $3)`,
      [token.address, token.name, token.symbol],
    );
    this.log.info(
      `Inserted ${insertResponse.rowCount} rows into table token_metadata_erc721`,
    );
  }

  /**
   * Insert or update data of issued ERC721 token.
   * @param token ERC721 token data.
   */
  public async upsertTokenERC721(token: TokenERC72InsertType): Promise<void> {
    this.assertConnected();

    this.log.debug("Insert ERC721 token if not present yet:", token);
    const insertResponse = await this.client.query(
      `INSERT INTO ethereum.token_erc721("account_address", "token_address", "uri", "token_id")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT token_erc721_contract_tokens_unique
       DO
        UPDATE SET account_address = EXCLUDED.account_address;
        `,
      [token.account_address, token.token_address, token.uri, token.token_id],
    );
    this.log.debug(
      `Inserted ${insertResponse.rowCount} rows into table token_erc721`,
    );
  }

  /**
   * Read all ERC20 token balances
   * @returns ERC20 token balances
   */
  public async getTokenERC20(): Promise<TokenERC20RowType[]> {
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM ethereum.token_erc20",
    );
    this.log.debug(
      `Received ${queryResponse.rowCount} rows from table token_erc20`,
    );
    return queryResponse.rows;
  }

  /**
   * Read all issued ERC721 tokens.
   * @returns ERC721 tokens
   */
  public async getTokenERC721(): Promise<TokenERC72RowType[]> {
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM ethereum.token_erc721",
    );
    this.log.debug(
      `Received ${queryResponse.rowCount} rows from table token_erc721`,
    );
    return queryResponse.rows;
  }

  /**
   * Synchronize current ERC20 token balances in the DB.
   */
  public async syncTokenBalanceERC20(): Promise<void> {
    this.assertConnected();

    await this.client.query(
      "REFRESH MATERIALIZED VIEW CONCURRENTLY ethereum.token_erc20",
    );
    this.log.debug("Refreshing view ethereum.token_erc20 done");
  }

  /**
   * Synchronize current ERC721 token balances in the DB.
   * @param fromBlockNumber block number from which token transfer should be checked (for performance reasons)
   */
  public async syncTokenBalanceERC721(fromBlockNumber: number): Promise<void> {
    this.assertConnected();
    this.log.debug(
      "Call update_issued_erc721_tokens from block",
      fromBlockNumber,
    );

    await this.client.query("CALL ethereum.update_issued_erc721_tokens($1);", [
      fromBlockNumber,
    ]);
    this.log.debug("Calling update_issued_erc721_tokens procedure done.");
  }

  /**
   * Read block data. Throws if block was not found.
   *
   * @param blockNumber ethereum block number
   * @returns Block data.
   */
  public async getBlock(blockNumber: number): Promise<BlockRowType> {
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM ethereum.block WHERE number = $1",
      [blockNumber],
    );

    if (queryResponse.rows.length !== 1) {
      throw new Error(`Could not read block #${blockNumber} from the DB`);
    }

    return queryResponse.rows[0];
  }

  /**
   * Insert entire block data into the database (the block itself, transactions and token transfers if there were any).
   * Everything is committed in single atomic transaction (rollback on error).
   * @param blockData new block data.
   */
  public async insertBlockData(blockData: InsertBlockDataInput): Promise<void> {
    this.assertConnected();

    this.log.debug(
      "Insert block data including transactions and token transfers.",
    );

    const { block, transactions } = blockData;

    try {
      await this.client.query("BEGIN");

      this.log.debug("Insert new block", block);
      const blockInsertResponse = await this.client.query(
        `INSERT INTO ethereum.block("number", "created_at", "hash", "number_of_tx")
         VALUES ($1, $2, $3, $4)`,
        [block.number, block.created_at, block.hash, block.number_of_tx],
      );
      if (blockInsertResponse.rowCount !== 1) {
        throw new Error(`Block ${block.number} was not inserted into the DB`);
      }

      for (const tx of transactions) {
        this.log.debug("Insert new transaction", tx);
        const txInsertResponse = await this.client.query(
          `INSERT INTO
            ethereum.transaction("index", "hash", "block_number", "from", "to", "eth_value", "method_signature", "method_name")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id;`,
          [
            tx.index,
            tx.hash,
            block.number,
            tx.from,
            tx.to,
            tx.eth_value,
            tx.method_signature,
            tx.method_name,
          ],
        );
        if (txInsertResponse.rowCount !== 1) {
          throw new Error(
            `Transaction ${tx.hash} was not inserted into the DB`,
          );
        }
        const txId = txInsertResponse.rows[0].id;
        this.log.debug("New transaction inserted with id", txId);

        for (const transfer of tx.token_transfers) {
          this.log.debug("Insert new token transfer", transfer);
          const transInsertResponse = await this.client.query(
            `INSERT INTO
              ethereum.token_transfer("transaction_id", "sender", "recipient", "value")
             VALUES ($1, $2, $3, $4)`,
            [txId, transfer.sender, transfer.recipient, transfer.value],
          );
          if (transInsertResponse.rowCount !== 1) {
            throw new Error(
              `Transfer from ${transfer.sender} to ${transfer.recipient} was not inserted into the DB`,
            );
          }
        }
      }

      await this.client.query("COMMIT");
    } catch (err: unknown) {
      await this.client.query("ROLLBACK");
      this.log.warn("insertBlockData() exception:", err);
      throw new RuntimeError(
        "Could not insert block data into the database - transaction reverted",
        getRuntimeErrorCause(err),
      );
    }
  }

  /**
   * Compare committed block numbers with requested range, return list of blocks that are missing.
   * @param startBlockNumber block to check from (including)
   * @param endBlockNumber block to check to (including)
   * @returns list of missing block numbers
   */
  public async getMissingBlocksInRange(
    startBlockNumber: number,
    endBlockNumber: number,
  ): Promise<GetMissingBlocksInRangeReturnType> {
    Checks.truthy(
      endBlockNumber >= startBlockNumber,
      `getMissingBlocksInRange startBlockNumber larger than endBlockNumber`,
    );
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM ethereum.get_missing_blocks_in_range($1, $2) as block_number",
      [startBlockNumber, endBlockNumber],
    );
    this.log.debug(
      `Found ${queryResponse.rowCount} missing blocks between ${startBlockNumber} and ${endBlockNumber}`,
    );

    return queryResponse.rows;
  }
}
