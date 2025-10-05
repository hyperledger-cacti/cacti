/**
 * @fileoverview Remote Logs Table Migration for SATP Gateway
 *
 * Creates the remote logs table for cross-gateway SATP transaction logging
 * and verification. This table stores cryptographically signed log entries
 * from remote gateways, enabling distributed crash recovery and inter-gateway
 * coordination required for multi-party SATP protocol execution.
 *
 * Table schema includes:
 * - hash: Cryptographic hash of log content for integrity verification
 * - signature: Digital signature from remote gateway for authenticity
 * - signerPubKey: Public key of the signing gateway for verification
 * - key: Unique log entry identifier (primary key)
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { Knex } from "knex";

/**
 * Create the remote logs table for cross-gateway SATP persistence.
 *
 * Establishes the table for storing cryptographically signed log entries
 * from remote SATP gateways. This enables distributed crash recovery,
 * evidence verification, and cross-gateway coordination for multi-party
 * asset transfer protocols.
 *
 * @param knex - Knex database connection instance
 * @returns Promise resolving when table creation completes
 * @since 0.0.3-beta
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("remote-logs", (table) => {
    /** Cryptographic hash of log content for integrity verification */
    table.string("hash").notNullable();
    /** Digital signature from remote gateway for authenticity */
    table.string("signature").notNullable();
    /** Public key of the signing gateway for signature verification */
    table.string("signerPubKey").notNullable();
    /** Unique log entry identifier serving as primary key */
    table.string("key").notNullable().primary();
  });
}

/**
 * Drop the remote logs table (rollback migration).
 *
 * Removes the remote-logs table and all associated data as part of
 * migration rollback. This operation is destructive and will permanently
 * delete all remote gateway log data and verification signatures.
 *
 * @param knex - Knex database connection instance
 * @returns Promise resolving when table removal completes
 * @since 0.0.3-beta
 */
export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("remote-logs");
}

/**
 * Get the unique migration identifier.
 *
 * Returns the timestamp-based migration ID used for tracking
 * migration execution order and preventing duplicate applications.
 *
 * @returns Migration identifier string
 * @since 0.0.3-beta
 */
export function getId(): Readonly<string> {
  return "20240130234303_create_remote_logs_table";
}
