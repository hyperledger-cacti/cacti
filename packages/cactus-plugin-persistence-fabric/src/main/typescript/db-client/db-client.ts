/**
 * Client class to communicate with PostgreSQL database.
 */

import fs from "fs";
import path from "path";
import { Client as PostgresClient } from "pg";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  CactiBlockFullEventV1,
  FabricX509CertificateV1,
  FullBlockTransactionActionV1,
  FullBlockTransactionEndorsementV1,
  FullBlockTransactionEventV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric/src/main/typescript/generated/openapi/typescript-axios/api";
import { Database as DatabaseSchemaType } from "./database.types";

//////////////////////////////////
// Helper Types
//////////////////////////////////

type PublicSchemaTables = DatabaseSchemaType["public"]["Tables"];
type PluginStatusRowType = PublicSchemaTables["plugin_status"]["Row"];

type SchemaTables = DatabaseSchemaType["fabric"]["Tables"];
type SchemaFunctions = DatabaseSchemaType["fabric"]["Functions"];
type BlockRowType = SchemaTables["block"]["Row"];
type CertificateRowType = SchemaTables["certificate"]["Row"];
type GetMissingRowsInRangeReturnType =
  SchemaFunctions["get_missing_blocks_in_range"]["Returns"];

//////////////////////////////////
// PostgresDatabaseClient
//////////////////////////////////

export interface PostgresDatabaseClientOptions {
  connectionString: string;
  logLevel: LogLevelDesc;
}

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
   *
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
   * Create database schema for fabric data if it was not created yet.
   *
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
   * Convert certificate subject attributes to map, throw if string is invalid.
   *
   * @param attrString cert subject
   *
   * @returns Map of cert attributes
   */
  private certificateAttrsStringToMap(attrString: string): Map<string, string> {
    const separatorSplitRegex = new RegExp(`[/,+;\n]`);

    return new Map(
      attrString.split(separatorSplitRegex).map((a) => {
        const splitAttrs = a.split("=");
        if (splitAttrs.length !== 2) {
          throw new Error(
            `Invalid certificate attribute string: ${attrString}`,
          );
        }
        const [key, value] = splitAttrs;
        return [key.trim(), value.trim()];
      }),
    );
  }

  /**
   * Search for certificate object in database using it's serial number.
   * If it's not found, insert.
   *
   * @param fabricCert fabric x.509 certificate
   *
   * @returns certificate ID in the DB.
   */
  private async insertCertificateIfNotExists(
    fabricCert: FabricX509CertificateV1,
  ): Promise<string> {
    // Try fetching cert ID from the DB
    const queryResponse = await this.client.query<CertificateRowType>(
      "SELECT id FROM fabric.certificate WHERE serial_number = $1",
      [fabricCert.serialNumber],
    );

    if (queryResponse.rows.length === 1) {
      return queryResponse.rows[0].id;
    }

    // Insert certificate not existing in the database
    const subjectAttrs = this.certificateAttrsStringToMap(fabricCert.subject);
    const issuerAttrs = this.certificateAttrsStringToMap(fabricCert.issuer);

    this.log.debug(
      `Insert to fabric.certificate with serial number ${fabricCert.serialNumber})`,
    );
    const certInsertResponse = await this.client.query(
      `INSERT INTO
              fabric.certificate("serial_number", "subject_common_name", "subject_org_unit", "subject_org", "subject_locality",
                "subject_state", "subject_country", "issuer_common_name", "issuer_org_unit", "issuer_org", "issuer_locality",
                "issuer_state", "issuer_country", "subject_alt_name", "valid_from", "valid_to", "pem")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING id;`,
      [
        fabricCert.serialNumber,
        subjectAttrs.get("CN") ?? "",
        subjectAttrs.get("OU") ?? "",
        subjectAttrs.get("O") ?? "",
        subjectAttrs.get("L") ?? "",
        subjectAttrs.get("ST") ?? "",
        subjectAttrs.get("C") ?? "",
        issuerAttrs.get("CN") ?? "",
        issuerAttrs.get("OU") ?? "",
        issuerAttrs.get("O") ?? "",
        issuerAttrs.get("L") ?? "",
        issuerAttrs.get("ST") ?? "",
        issuerAttrs.get("C") ?? "",
        fabricCert.subjectAltName,
        fabricCert.validFrom,
        fabricCert.validTo,
        fabricCert.pem,
      ],
    );

    if (certInsertResponse.rowCount !== 1) {
      throw new Error(
        `Certificate with serial number ${fabricCert.serialNumber} was not inserted into the DB`,
      );
    }

    return certInsertResponse.rows[0].id;
  }

  /**
   * Insert data to block table.
   */
  private async insertToBlockTable(
    block: CactiBlockFullEventV1,
  ): Promise<string> {
    this.log.debug(
      `Insert to fabric.block #${block.blockNumber} (${block.blockHash})`,
    );
    const blockInsertResponse = await this.client.query(
      `INSERT INTO fabric.block("number", "hash", "transaction_count")
         VALUES ($1, $2, $3)
         RETURNING id;`,
      [block.blockNumber, block.blockHash, block.transactionCount],
    );
    if (blockInsertResponse.rowCount !== 1) {
      throw new Error(
        `Block ${block.blockNumber} was not inserted into the DB`,
      );
    }

    return blockInsertResponse.rows[0].id;
  }

  /**
   * Insert data to transaction table.
   */
  private async insertToTransactionTable(
    tx: FullBlockTransactionEventV1,
    blockId: string,
    blockNumber: number,
  ): Promise<string> {
    this.log.debug(`Insert to fabric.transaction with hash ${tx.hash})`);

    const txInsertResponse = await this.client.query(
      `INSERT INTO
          fabric.transaction("hash", "timestamp", "type", "epoch", "channel_id", "protocol_version", "block_id", "block_number")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id;`,
      [
        tx.hash,
        tx.timestamp,
        tx.transactionType,
        tx.epoch,
        tx.channelId,
        tx.protocolVersion,
        blockId,
        blockNumber,
      ],
    );
    if (txInsertResponse.rowCount !== 1) {
      throw new Error(`Transaction ${tx.hash} was not inserted into the DB`);
    }

    return txInsertResponse.rows[0].id;
  }

  /**
   * Insert data to transaction_action table.
   */
  private async insertToTransactionActionTable(
    action: FullBlockTransactionActionV1,
    txId: string,
  ): Promise<string> {
    const creatorCertId = await this.insertCertificateIfNotExists(
      action.creator.cert,
    );

    this.log.debug("Insert to fabric.transaction_action");
    const txActionInsertResponse = await this.client.query(
      `INSERT INTO
          fabric.transaction_action("function_name", "function_args", "chaincode_id", "creator_msp_id", "creator_certificate_id", "transaction_id")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id;`,
      [
        action.functionName,
        action.functionArgs
          .map((a) => "0x" + Buffer.from(a).toString("hex"))
          .join(","),
        action.chaincodeId,
        action.creator.mspid,
        creatorCertId,
        txId,
      ],
    );
    if (txActionInsertResponse.rowCount !== 1) {
      throw new Error("Transaction action was not inserted into the DB");
    }

    return txActionInsertResponse.rows[0].id;
  }

  /**
   * Insert data to transaction_action_endorsement table.
   */
  private async insertToTransactionActionEndorsementTable(
    endorsement: FullBlockTransactionEndorsementV1,
    txActionId: string,
  ): Promise<void> {
    const signerCertId = await this.insertCertificateIfNotExists(
      endorsement.signer.cert,
    );

    this.log.debug("Insert to fabric.transaction_action_endorsement");
    const txActionEndorsementInsertResponse = await this.client.query(
      `INSERT INTO
                  fabric.transaction_action_endorsement("mspid", "signature", "certificate_id", "transaction_action_id")
                 VALUES ($1, $2, $3, $4);`,
      [
        endorsement.signer.mspid,
        endorsement.signature,
        signerCertId,
        txActionId,
      ],
    );
    if (txActionEndorsementInsertResponse.rowCount !== 1) {
      throw new Error(
        "Transaction action endorsement was not inserted into the DB",
      );
    }
  }

  /**
   * Read block data. Throws if block was not found.
   *
   * @param blockNumber fabric block number
   * @returns Block data.
   */
  public async getBlock(blockNumber: number): Promise<BlockRowType> {
    this.assertConnected();

    const queryResponse = await this.client.query<BlockRowType>(
      "SELECT * FROM fabric.block WHERE number = $1",
      [blockNumber],
    );

    if (queryResponse.rows.length !== 1) {
      throw new Error(`Could not read block #${blockNumber} from the DB`);
    }

    return queryResponse.rows[0];
  }

  /**
   * Insert entire block data into the database (the block itself and transactions).
   * Everything is committed in single atomic transaction (rollback on error).
   * @param blockData new block data.
   */
  public async insertBlockData(block: CactiBlockFullEventV1): Promise<void> {
    this.assertConnected();

    this.log.debug("Insert block data, including transactions");

    try {
      await this.client.query("BEGIN");

      const blockId = await this.insertToBlockTable(block);

      for (const tx of block.cactiTransactionsEvents) {
        // Insert transaction
        const txId = await this.insertToTransactionTable(
          tx,
          blockId,
          block.blockNumber,
        );

        for (const action of tx.actions) {
          // Insert transaction actions
          const txActionId = await this.insertToTransactionActionTable(
            action,
            txId,
          );

          for (const endorsement of action.endorsements) {
            // Insert transaction action endorsements
            await this.insertToTransactionActionEndorsementTable(
              endorsement,
              txActionId,
            );
          }
        }
      }

      await this.client.query("COMMIT");
    } catch (err: unknown) {
      await this.client.query("ROLLBACK");
      this.log.warn("insertBlockData() exception:", err);
      throw new Error(
        "Could not insert block data into the database - transaction reverted",
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
  ): Promise<GetMissingRowsInRangeReturnType> {
    Checks.truthy(
      endBlockNumber >= startBlockNumber,
      `getMissingBlocksInRange startBlockNumber larger than endBlockNumber`,
    );
    this.assertConnected();

    const queryResponse = await this.client.query(
      "SELECT * FROM fabric.get_missing_blocks_in_range($1, $2) as block_number",
      [startBlockNumber, endBlockNumber],
    );
    this.log.debug(
      `Found ${queryResponse.rowCount} missing blocks between ${startBlockNumber} and ${endBlockNumber}`,
    );

    return queryResponse.rows;
  }
}
