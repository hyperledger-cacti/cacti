/**
 * @fileoverview Local Logs Table Migration for SATP Gateway
 *
 * Creates the primary logs table for local SATP gateway transaction logging.
 * This table stores all local protocol events, state changes, and crash recovery
 * checkpoints required for SATP protocol compliance and fault tolerance.
 *
 * Table schema includes:
 * - sessionId: SATP session identifier
 * - type: Log entry type (state, event, proof, etc.)
 * - key: Unique log entry identifier (primary key)
 * - operation: SATP operation being logged
 * - timestamp: ISO timestamp for chronological ordering
 * - data: JSON-serialized log payload
 * - sequenceNumber: Monotonic sequence for crash recovery
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2
 * @author Hyperledger Cacti Contributors
 * @since 2.0.0
 */

import { Knex } from "knex";

/**
 * Create the local logs table for SATP gateway persistence.
 *
 * Establishes the primary table for storing local SATP protocol logs,
 * including session state, transaction events, and crash recovery data.
 * The table schema is optimized for chronological queries and session-based
 * filtering required for SATP protocol operations.
 *
 * @param knex - Knex database connection instance
 * @returns Schema builder for table creation
 * @since 2.0.0
 */
export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable("logs", (table) => {
    /** SATP session identifier for grouping related logs */
    table.string("sessionId").notNullable();
    /** Log entry type classification (state, event, proof, etc.) */
    table.string("type").notNullable();
    /** Unique log entry identifier serving as primary key */
    table.string("key").notNullable().primary();
    /** SATP protocol operation being logged */
    table.string("operation").notNullable();
    /** ISO timestamp for chronological ordering */
    table.string("timestamp").notNullable();
    /** JSON-serialized log payload containing event data */
    table.text("data").notNullable();
    /** Monotonic sequence number for crash recovery ordering */
    table.bigInteger("sequenceNumber").notNullable();
  });
}

/**
 * Drop the local logs table (rollback migration).
 *
 * Removes the logs table and all associated data as part of migration
 * rollback. This operation is destructive and will permanently delete
 * all local SATP gateway log data.
 *
 * @param knex - Knex database connection instance
 * @returns Schema builder for table removal
 * @since 2.0.0
 */
export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable("logs");
}

/**
 * Get the unique migration identifier.
 *
 * Returns the timestamp-based migration ID used for tracking
 * migration execution order and preventing duplicate applications.
 *
 * @returns Migration identifier string
 * @since 2.0.0
 */
export function getId(): Readonly<string> {
  return "20220331132128_create_logs_table";
}
