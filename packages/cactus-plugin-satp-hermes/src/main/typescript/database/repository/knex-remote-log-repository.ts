/**
 * @fileoverview Knex-based Remote Log Repository Implementation
 *
 * This module provides a Knex.js-based implementation of the remote log repository
 * interface for SATP gateway cross-gateway persistence. Handles database operations
 * for storing, retrieving, and managing cryptographically signed log entries from
 * remote gateways, enabling distributed crash recovery and inter-gateway coordination.
 *
 * @see {@link https://knexjs.org/guide/} Knex.js Documentation
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import type { IRemoteLogRepository } from "./interfaces/repository";
import type { RemoteLog } from "../../core/types";
import knex, { type Knex } from "knex";
import { knexRemoteInstance } from "../../database/knexfile-remote";
import { createMigrationSource } from "../knex-migration-source";

/**
 * Knex.js-based implementation of remote SATP gateway log repository.
 *
 * Provides database-backed persistence for remote SATP protocol logs from
 * other gateways, supporting cross-gateway coordination, distributed crash
 * recovery, and cryptographic verification of remote log entries.
 *
 * Key features:
 * - Cross-gateway log synchronization
 * - Cryptographic signature storage and verification
 * - Distributed crash recovery support
 * - Database lifecycle management
 * - Environment-specific configuration
 *
 * @implements {IRemoteLogRepository}
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const repository = new KnexRemoteLogRepository({
 *   client: 'pg',
 *   connection: {
 *     host: 'remote-db.example.com',
 *     port: 5432,
 *     user: 'satp_user',
 *     password: 'secret',
 *     database: 'satp_remote'
 *   }
 * });
 *
 * // Store remote gateway log
 * await repository.create({
 *   key: 'remote-log-123',
 *   hash: 'sha256_hash_of_content',
 *   signature: 'digital_signature_from_remote_gateway',
 *   signerPubKey: 'remote_gateway_public_key_pem'
 * });
 * ```
 */
export class KnexRemoteLogRepository implements IRemoteLogRepository {
  /** Knex database connection instance */
  readonly database: Knex;

  /**
   * Initialize the remote log repository with database configuration.
   *
   * Creates a Knex database connection configured for remote log storage,
   * enabling cross-gateway coordination and distributed persistence.
   * Uses static configuration to ensure multiple gateways can access
   * the same remote log database.
   *
   * @param config - Optional Knex configuration (uses environment default if undefined)
   * @since 0.0.3-beta
   */
  public constructor(config: Knex.Config | undefined) {
    const envName = process.env.ENVIRONMENT || "development";
    const configFile = knexRemoteInstance[envName];

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
   * Get Knex query builder for the remote-logs table.
   *
   * @returns Query builder configured for remote-logs table
   * @private
   * @since 0.0.3-beta
   */
  getLogsTable(): Knex.QueryBuilder {
    return this.database("remote-logs");
  }

  /**
   * Retrieve remote log entry by unique key identifier.
   *
   * @param logKey - Unique remote log entry identifier
   * @returns Promise resolving to remote log entry or undefined
   * @since 0.0.3-beta
   */
  readById(logKey: string): Promise<RemoteLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  /**
   * Create a new remote log entry in the database.
   *
   * Stores a cryptographically signed log entry from a remote gateway,
   * including the content hash, digital signature, and signer public key
   * for verification purposes.
   *
   * @param log - Remote log entry with cryptographic verification data
   * @returns Database insertion promise
   * @since 0.0.3-beta
   * @todo Fix return type annotation
   */
  create(log: RemoteLog): any {
    return this.getLogsTable().insert(log);
  }

  /**
   * Reset the database to initial state by rolling back and reapplying migrations.
   *
   * This operation is destructive and will delete all existing remote log data.
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
