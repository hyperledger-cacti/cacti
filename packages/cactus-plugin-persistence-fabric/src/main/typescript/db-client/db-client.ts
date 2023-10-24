/**
 * Client class to communicate with PostgreSQL database.
 */

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

//   import { Database as DatabaseSchemaType } from "./database.types";
//   import { getRuntimeErrorCause } from "../utils";

import fs from "fs";
import path from "path";
import { Client as PostgresClient, QueryResult } from "pg";
import {
  InsertBlockDataEntryInterface,
  InsertBlockDetailsInterface,
  InsertBlockTransactionEntryInterface,
  InsertDetailedTransactionEntryInterface,
} from "../types";
// import { RuntimeError } from "run-time-error-cjs";

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

  public async getPluginStatus(pluginName: string): Promise<any> {
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

  public async insertBlockDataEntry(
    block: InsertBlockDataEntryInterface,
  ): Promise<QueryResult> {
    this.assertConnected();

    const insertResponse = await this.client.query(
      `INSERT INTO public.fabric_blocks_entry("id", "block_num", "block_data") VALUES ($1, $2, $3)`,
      [block.fabric_block_id, block.fabric_block_num, block.fabric_block_data],
    );
    this.log.info(
      `Inserted ${insertResponse.rowCount} rows into table fabric_blocks_entry`,
    );
    return insertResponse;
  }

  public async insertBlockDetails(
    block: InsertBlockDetailsInterface,
  ): Promise<QueryResult> {
    this.assertConnected();

    const insertResponse = await this.client.query(
      `INSERT INTO public.fabric_blocks("id", "block_number", "data_hash", "tx_count", "created_at", "prev_blockhash", "channel_id") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        block.fabric_block_id,
        block.fabric_blocknum,
        block.fabric_datahash,
        block.fabric_tx_count,
        block.fabric_createdat,
        block.fabric_prev_blockhash,
        block.fabric_channel_id,
      ],
    );
    this.log.info(
      `Inserted ${insertResponse.rowCount} rows into table fabric_blocks`,
    );

    return insertResponse;
  }

  public async insertBlockTransactionEntry(
    transactions: InsertBlockTransactionEntryInterface,
  ): Promise<QueryResult> {
    this.assertConnected();

    const insertResponse: QueryResult = await this.client.query(
      `INSERT INTO public.fabric_transactions_entry("id", "block_id", "transaction_data") VALUES ($1, $2, $3)`,
      [
        transactions.transaction_id,
        transactions.fabric_block_id,
        transactions.fabric_transaction_data,
      ],
    );
    this.log.info(
      `Inserted ${insertResponse.rowCount} rows into table fabric_transactions_entry`,
    );
    return insertResponse;
  }

  public async insertDetailedTransactionEntry(
    transactions: InsertDetailedTransactionEntryInterface,
  ): Promise<QueryResult> {
    this.assertConnected();

    const insertResponse = await this.client.query(
      `INSERT INTO public.fabric_transactions( "block_number","block_id", "transaction_id", "created_at", "chaincode_name", "status", "creator_msp_id", "endorser_msp_id", "chaincode_id", "type", "read_set", "write_set", "channel_id", "payload_extension", "creator_id_bytes", "creator_nonce", "chaincode_proposal_input", "tx_response", "payload_proposal_hash", "endorser_id_bytes", "endorser_signature") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        // id integer BIGSERIAL, this should auto increment , total number of transactions counter
        transactions.block_number,
        transactions.block_id,
        transactions.transaction_id,
        transactions.createdat,
        transactions.chaincodename,
        transactions.status,
        transactions.creator_msp_id,
        transactions.endorser_msp_id,
        transactions.chaincode_id,
        transactions.type,
        transactions.read_set,
        transactions.write_set,
        transactions.channel_id,
        transactions.payload_extension,
        transactions.creator_id_bytes,
        transactions.creator_nonce,
        transactions.chaincode_proposal_input,
        transactions.tx_response,
        transactions.payload_proposal_hash,
        transactions.endorser_id_bytes,
        transactions.endorser_signature,
      ],
    );
    this.log.info(
      `Inserted ${insertResponse.rowCount} rows into table fabric_transactions_entry`,
    );
    return insertResponse;
  }

  public async getMaxBlockNumber(): Promise<number> {
    this.log.error("getMaxBlockNumber");
    this.assertConnected();
    const response = await this.client.query(
      `select MAX(block_num) from public.fabric_blocks_entry`,
    );

    return +response.rows[0].max;
  }

  public async isThisBlockInDB(block_num: number): Promise<QueryResult> {
    this.assertConnected();
    const response = await this.client.query(
      `select * from public.fabric_blocks_entry where block_num = $1`,
      [block_num],
    );

    return response;
  }
}
