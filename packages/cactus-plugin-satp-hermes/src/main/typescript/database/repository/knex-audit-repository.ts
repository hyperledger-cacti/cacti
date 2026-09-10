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

import type { AuditEntry, Audit, SessionProof } from "../../core/types";
import type { IAuditEntryRepository } from "./interfaces/repository";
import { AuditEntryNotFoundError } from "../../core/errors/satp-errors";
import knex, { type Knex } from "knex";
import { knexAuditInstance } from "../knexfile-audit";
import { createMigrationSource } from "../knex-migration-source";
import { createHash } from "crypto";
import { LoggerProvider } from "@hyperledger-cacti/cactus-common";

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
  private readonly logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "KnexAuditEntryRepository",
  });

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
    const configFile = knexAuditInstance[envName];

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
   * Get Knex query builder for the session proofs table.
   *
   * @returns Query builder configured for session proofs table
   * @private
   */
  getSessionProofsTable(): Knex.QueryBuilder {
    return this.database("session_proofs");
  }

  /**
   * Retrieve audit entry by unique identifier.
   *
   * @param auditEntryId - Unique audit entry identifier
   * @returns Promise resolving to an audit entry or undefined
   * @throws AuditEntryNotFoundError if no entry is found with the given ID
   */
  async readById(auditEntryId: string): Promise<AuditEntry> {
    const row = await this.getAuditEntriesTable()
      .where({ auditEntryId })
      .first();

    if (!row) {
      throw new AuditEntryNotFoundError(auditEntryId);
    }

    const session = JSON.parse(row.session);
    const proofs = await this.readProofsBySessionIds([session.sessionId]);

    return {
      auditEntryId: row.auditEntryId,
      session,
      timestamp: row.timestamp,
      proofs,
    };
  }

  /**
   * Retrieve all audit entries that fall within a specified time interval.
   *
   * @param startTimestamp - epoch timestamp representing the start of the interval
   * @param endTimestamp - epoch timestamp representing the end of the interval
   * @returns Promise resolving to an Audit object containing all matching audit entries
   */
  async readByTimeInterval(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<Audit> {
    const rows = await this.getAuditEntriesTable()
      .where("timestamp", ">=", startTimestamp)
      .andWhere("timestamp", "<=", endTimestamp)
      .select();

    const sessionIds = rows.map(
      (row: any) => JSON.parse(row.session).sessionId,
    );
    const proofs = await this.readProofsBySessionIds(sessionIds);
    const proofsBySessionId = new Map<string, SessionProof[]>();
    for (const proof of proofs) {
      const existing = proofsBySessionId.get(proof.sessionId) ?? [];
      existing.push(proof);
      proofsBySessionId.set(proof.sessionId, existing);
    }

    return {
      auditEntries: rows.map((row: any) => {
        const session = JSON.parse(row.session);
        return {
          auditEntryId: row.auditEntryId,
          session,
          timestamp: row.timestamp,
          proofs: proofsBySessionId.get(session.sessionId) ?? [],
        };
      }),
    };
  }

  /**
   * Persist a session proof (signed protocol claim) in the audit database.
   *
   * Each SessionProof captures the signature-verified claim exchanged at a
   * SATP protocol step, keeping it provable for dispute resolution and audit
   * after transport ends. Proofs are immutable once persisted.
   *
   * The write is idempotent: the proof identifier is derived deterministically
   * from the session ID, step tag and claim, so re-verifying the same claim at
   * the same step (e.g. after a retry or crash recovery) does not duplicate
   * rows — the existing proof is left untouched.
   *
   * @param proof - The SessionProof to persist
   * @returns A promise resolving to the persisted proof
   */
  async createProof(proof: SessionProof): Promise<SessionProof> {
    this.logger.debug(
      `Creating session proof for session: ${proof.sessionId}, step: ${proof.step.tag}`,
    );

    const proofId = createHash("sha256")
      .update(`${proof.sessionId}:${proof.step.tag}:${proof.claim}`)
      .digest("hex");

    await this.getSessionProofsTable()
      .insert({
        proofId,
        sessionId: proof.sessionId,
        step: JSON.stringify(proof.step),
        claim: proof.claim,
        signedClaim: proof.signedClaim,
        timestamp: Date.now(),
      })
      .onConflict("proofId")
      .ignore();

    return proof;
  }

  /**
   * Retrieve all session proofs associated with the given session IDs.
   *
   * @param sessionIds - Session IDs to look up proofs for
   * @returns A promise resolving to the matching proofs (empty if none)
   */
  async readProofsBySessionIds(sessionIds: string[]): Promise<SessionProof[]> {
    if (sessionIds.length === 0) {
      return [];
    }

    const rows = await this.getSessionProofsTable()
      .whereIn("sessionId", sessionIds)
      .orderBy("timestamp", "asc")
      .select();

    return rows.map((row: any) => ({
      sessionId: row.sessionId,
      step: JSON.parse(row.step),
      claim: row.claim,
      signedClaim: row.signedClaim,
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
  async create(auditEntry: AuditEntry): Promise<AuditEntry> {
    this.logger.debug(
      `Creating audit entry with ID: ${auditEntry.auditEntryId}`,
    );

    await this.getAuditEntriesTable().insert({
      auditEntryId: auditEntry.auditEntryId,
      session: JSON.stringify(auditEntry.session),
      timestamp: auditEntry.timestamp,
    });

    return auditEntry;
  }

  /**
   * Run pending database migrations to bring the schema up to date.
   *
   * @returns Promise resolving when all pending migrations have been applied
   * @since 0.0.3-beta
   */
  async migrate(): Promise<void> {
    await this.database.migrate.latest();
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
    await this.getSessionProofsTable().del();
    await this.getAuditEntriesTable().del();
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
