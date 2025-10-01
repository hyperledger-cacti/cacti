/**
 * @fileoverview Knex-based Local Log Repository Implementation
 *
 * This module provides a Knex.js-based implementation of the local log repository
 * interface for SATP gateway persistence. Handles SQLite database operations for
 * storing, retrieving, and managing local SATP protocol logs with support for
 * crash recovery, session management, and chronological queries.
 *
 * @see {@link https://knexjs.org/guide/} Knex.js Documentation
 * @author Hyperledger Cacti Contributors
 * @since 2.0.0
 */

import type { LocalLog } from "../../core/types";
import type { ILocalLogRepository } from "./interfaces/repository";
import knex, { type Knex } from "knex";
import { knexLocalInstance } from "../knexfile";
import { createMigrationSource } from "../knex-migration-source";

/**
 * Knex.js-based implementation of local SATP gateway log repository.
 *
 * Provides SQLite-backed persistence for local SATP protocol logs, supporting
 * session-based queries, timestamp filtering, sequence-based retrieval, and
 * crash recovery operations. Integrates with Knex migration system for
 * database schema management and version control.
 *
 * Key features:
 * - Session-scoped log management
 * - Timestamp-based chronological queries
 * - Sequence number-based crash recovery
 * - Proof evidence filtering
 * - Database lifecycle management
 *
 * @implements {ILocalLogRepository}
 * @since 2.0.0
 * @example
 * ```typescript
 * const repository = new KnexLocalLogRepository({
 *   client: 'sqlite3',
 *   connection: { filename: './gateway.db' },
 *   useNullAsDefault: true
 * });
 *
 * // Create log entry
 * await repository.create({
 *   sessionId: 'session-123',
 *   type: 'state-change',
 *   key: 'log-456',
 *   operation: 'lock-asset',
 *   timestamp: new Date().toISOString(),
 *   data: JSON.stringify(logData),
 *   sequenceNumber: 1
 * });
 *
 * // Retrieve latest log for session
 * const latestLog = await repository.readLastestLog('session-123');
 * ```
 */
export class KnexLocalLogRepository implements ILocalLogRepository {
  /** Knex database connection instance */
  readonly database: Knex;
  /** Repository initialization status flag */
  private created = false;

  /**
   * Initialize the local log repository with database configuration.
   *
   * Creates a Knex database connection with migration support and configures
   * the repository for local SATP log operations. Uses environment-specific
   * configuration with fallback to development settings.
   *
   * @param config - Optional Knex configuration (uses default if undefined)
   * @since 2.0.0
   */
  public constructor(config: Knex.Config | undefined) {
    const envName = process.env.ENVIRONMENT || "development";
    const configFile = knexLocalInstance[envName];

    config = config || configFile;

    const migrationSource = createMigrationSource();

    config = {
      ...config,
      migrations: {
        migrationSource: migrationSource,
      },
    } as Knex.Config;
    this.database = knex(config);
  }

  /**
   * Check if repository has been properly initialized.
   *
   * @returns Repository initialization status
   * @since 2.0.0
   */
  public getCreated(): boolean {
    return this.created;
  }

  /**
   * Get Knex query builder for the logs table.
   *
   * @returns Query builder configured for logs table
   * @private
   * @since 2.0.0
   */
  getLogsTable(): Knex.QueryBuilder {
    return this.database("logs");
  }

  /**
   * Retrieve local log entry by unique key identifier.
   *
   * @param logKey - Unique log entry identifier
   * @returns Promise resolving to log entry or undefined
   * @since 2.0.0
   */
  readById(logKey: string): Promise<LocalLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  /**
   * Retrieve the most recent log entry for a specific session.
   *
   * @param sessionID - SATP session identifier
   * @returns Promise resolving to latest log entry for session
   * @since 2.0.0
   */
  readLastestLog(sessionID: string): Promise<LocalLog> {
    return this.getLogsTable()
      .orderBy("timestamp", "desc")
      .where({ sessionID: sessionID })
      .first();
  }

  /**
   * Read all logs created after the specified timestamp, excluding proofs.
   *
   * @param timestamp - ISO timestamp string for filtering
   * @returns Promise resolving to array of matching log entries
   * @since 2.0.0
   */
  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<LocalLog[]> {
    return this.getLogsTable()
      .where("timestamp", ">", timestamp)
      .whereNot("type", "like", "%proof%");
  }

  /**
   * Create a new local log entry in the database.
   *
   * @param log - Local log entry to persist
   * @returns Database insertion promise
   * @since 2.0.0
   * @todo Fix return type annotation
   */
  create(log: LocalLog): any {
    return this.getLogsTable().insert(log);
  }

  /**
   * Delete all log entries associated with a specific session.
   *
   * @param sessionID - SATP session identifier
   * @returns Database deletion promise
   * @since 2.0.0
   * @todo Fix return type annotation
   */
  deleteBySessionId(sessionID: string): any {
    return this.database().where({ sessionID: sessionID }).del();
  }

  /**
   * Read all logs excluding proof-type entries, grouped by session.
   *
   * Returns the latest log for each session that is not a proof entry,
   * useful for getting current session states without proof evidence.
   *
   * @returns Promise resolving to array of non-proof log entries
   * @since 2.0.0
   */
  readLogsNotProofs(): Promise<LocalLog[]> {
    return this.getLogsTable()
      .select(
        this.database.raw(
          "sessionID, key, data, type, operation, MAX(timestamp) as timestamp",
        ),
      )
      .whereNot({ type: "proof" })
      .groupBy("sessionID");
  }

  /**
   * Fetch logs from a specific sequence number onwards for crash recovery.
   *
   * Retrieves all log entries for a session starting from the specified
   * sequence number (exclusive). Used for crash recovery to replay operations
   * from a known checkpoint.
   *
   * @param sessionId - SATP session identifier
   * @param sequenceNumber - Starting sequence number (exclusive)
   * @returns Promise resolving to array of log entries after sequence number
   * @since 2.0.0
   */
  fetchLogsFromSequence(
    sessionId: string,
    sequenceNumber: number,
  ): Promise<LocalLog[]> {
    return this.getLogsTable()
      .where("sessionId", sessionId)
      .andWhere("sequenceNumber", ">", sequenceNumber);
  }

  /**
   * Reset the database to initial state by rolling back and reapplying migrations.
   *
   * This operation is destructive and will delete all existing data.
   * Primarily used for testing and development environments.
   *
   * @returns Promise resolving when reset completes
   * @since 2.0.0
   */
  async reset() {
    await this.database.migrate.rollback();
    await this.database.migrate.latest();
  }

  /**
   * Clean up database connections and resources.
   *
   * Properly closes the database connection and releases associated resources.
   * Should be called when the repository is no longer needed.
   *
   * @returns Promise resolving when cleanup completes
   * @since 2.0.0
   */
  async destroy() {
    await this.database.destroy();
  }
}
