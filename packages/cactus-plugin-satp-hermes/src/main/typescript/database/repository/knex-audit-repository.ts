/**
 * @fileoverview Knex-based AuditEntry Repository Implementation
 *
 * This module provides a Knex.js-based implementation of the local log repository
 * interface for SATP gateway persistence. Handles SQLite database operations for
 * storing, retrieving, and managing local SATP protocol logs with support for
 * crash recovery, session management, and chronological queries.
 *
 * @see {@link https://knexjs.org/guide/} Knex.js Documentation
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import type { AuditEntry, Audit } from "../../core/types";
import type { IAuditEntryRepository } from "./interfaces/repository";
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
 * @implements {IAuditEntryRepository}
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
export class KnexAuditEntryRepository implements IAuditEntryRepository {
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
   * @since 0.0.3-beta
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
   * @since 0.0.3-beta
   */
  public getCreated(): boolean {
    return this.created;
  }

  /**
   * Get Knex query builder for the audit entries table.
   *
   * @returns Query builder configured for audit entries table
   * @private
   */
  getAuditEntriesTable(): Knex.QueryBuilder {
    return this.database("audit_entries");
  }

  /**
   * Retrieve audit entry by unique identifier.
   *
   * @param auditEntryId - Unique audit entry identifier
   * @returns Promise resolving to an audit entry or undefined
   */
  readById(auditEntryId: string): Promise<AuditEntry> {
    return this.getAuditEntriesTable()
      .where({ auditEntryId })
      .first()
      .then((row) => ({
        auditEntryId: row.auditEntryId,
        session: JSON.parse(row.session),
        timestamp: row.timestamp,
      }));
  }

  /**
   * Retrieve all audit entries that fall within a specified time interval.
   *
   * @param startTimestamp - ISO string representing the start of the interval
   * @param endTimestamp - ISO string representing the end of the interval
   * @returns Promise resolving to an Audit object containing all matching audit entries
   */
  readByTimeInterval(
    startTimestamp: string,
    endTimestamp: string,
  ): Promise<Audit> {
    return this.getAuditEntriesTable()
      .where("timestamp", ">=", startTimestamp)
      .andWhere("timestamp", "<=", endTimestamp)
      .select()
      .then((rows) => ({
        auditEntries: rows.map((row: any) => ({
          auditEntryId: row.auditEntryId,
          session: JSON.parse(row.session),
          timestamp: row.timestamp,
        })),
      }));
  }

  /**
   * Persist a new AuditEntry in the database.
   *
   * Each AuditEntry represents a single transaction with its associated session data.
   * This method inserts the entry into the audit_entries table (or logs table, depending on implementation)
   * and preserves immutability; it does not modify existing entries.
   *
   * @param auditEntry - The transaction-level AuditEntry to persist, including transaction timestamp and sessions.
   * @returns A promise resolving when the database insertion completes.
   */
  create(auditEntry: AuditEntry): any {
    return this.getAuditEntriesTable().insert(auditEntry);
  }

  /**
   * Reset the database to initial state by rolling back and reapplying migrations.
   *
   * This operation is destructive and will delete all existing data.
   * Primarily used for testing and development environments.
   *
   * @returns Promise resolving when reset completes
   * @since 0.0.3-beta
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
   * @since 0.0.3-beta
   */
  async destroy() {
    await this.database.destroy();
  }
}
