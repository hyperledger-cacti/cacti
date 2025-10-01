/**
 * @fileoverview Knex Migration Source for SATP Database Schema Management
 *
 * This module provides a custom migration source implementation for managing
 * SATP gateway database schema evolution. Implements programmatic migration
 * registration and execution, ensuring consistent database structure across
 * different deployment environments and gateway instances.
 *
 * The migration source handles:
 * - Local log table creation and management
 * - Remote log table schema definition
 * - Migration dependency resolution
 * - Database version control and rollback
 *
 * @example
 * ```typescript
 * import { createMigrationSource } from './knex-migration-source';
 * import knex from 'knex';
 *
 * const config = {
 *   client: 'sqlite3',
 *   connection: { filename: './satp.db' },
 *   migrations: {
 *     migrationSource: createMigrationSource()
 *   }
 * };
 *
 * const db = knex(config);
 * await db.migrate.latest();
 * ```
 *
 * @see {@link https://knexjs.org/guide/migrations.html} Knex Migration Guide
 * @author Hyperledger Cacti Contributors
 * @since 2.0.0
 */

import { Knex } from "knex";
import { Err, Ok, Result } from "ts-results";

import * as create_logs_table from "./migrations/20220331132128_create_logs_table";
import * as create_remote_logs_table from "./migrations/20240130234303_create_remote_logs_table";

/**
 * Interface for SATP database migration implementations.
 *
 * Defines the contract that all SATP database migrations must implement,
 * providing standardized methods for schema evolution, rollback operations,
 * and migration identification. Ensures consistent database versioning
 * across SATP gateway deployments.
 *
 * @interface IKnexMigration
 * @since 2.0.0
 */
export interface IKnexMigration {
  /** Execute migration to upgrade database schema */
  up(knex: Readonly<Knex>): Promise<void>;
  /** Execute rollback to downgrade database schema */
  down(knex: Readonly<Knex>): Promise<void>;
  /** Get unique migration identifier */
  getId(): Readonly<string>;
}

/**
 * Interface for Knex migration source implementations.
 *
 * Defines the contract for providing migrations to Knex.js programmatically
 * rather than from filesystem. Enables controlled migration execution and
 * custom migration loading strategies for SATP gateway databases.
 *
 * @interface IKnexMigrationSource
 * @template T - Migration type (typically IKnexMigration)
 * @since 2.0.0
 */
export interface IKnexMigrationSource<T> {
  /** Retrieve list of available migration identifiers */
  getMigrations(): Promise<string[]>;
  /** Format migration name for display purposes */
  getMigrationName(migrationName: Readonly<string>): string;
  /** Load specific migration implementation by name */
  getMigration(migrationName: string): Promise<T>;
}

/**
 * Register a migration with duplicate ID detection.
 *
 * Safely adds a migration to the registry with validation to prevent
 * duplicate migration IDs which could cause database inconsistencies.
 * Returns a Result type to enable functional error handling.
 *
 * @param migrations - Map of registered migrations
 * @param aMigration - Migration to register
 * @returns Result indicating success or duplicate ID error
 * @since 2.0.0
 */
function registerMigration(
  migrations: Map<string, IKnexMigration>,
  aMigration: IKnexMigration,
): Result<void, Error> {
  const id = aMigration.getId();
  if (migrations.has(id)) {
    return Err(new Error("Duplicate migration ID detected: " + id));
  } else {
    migrations.set(id, aMigration);
  }
  return Ok.EMPTY;
}

/**
 * Create a configured migration source for SATP database management.
 *
 * Instantiates and configures a migration source with all required SATP
 * database migrations registered. The returned source can be used directly
 * with Knex.js to manage database schema evolution for SATP gateways.
 *
 * Registered migrations include:
 * - Local logs table creation
 * - Remote logs table creation
 * - Future schema evolution migrations
 *
 * @returns Configured migration source ready for Knex.js integration
 * @throws Error if duplicate migration IDs are detected
 * @since 2.0.0
 * @example
 * ```typescript
 * const migrationSource = createMigrationSource();
 * const dbConfig = {
 *   client: 'sqlite3',
 *   connection: { filename: './gateway.db' },
 *   migrations: { migrationSource }
 * };
 *
 * const db = knex(dbConfig);
 * await db.migrate.latest();
 * ```
 */
export function createMigrationSource(): IKnexMigrationSource<IKnexMigration> {
  const migrations: Map<string, IKnexMigration> = new Map();

  registerMigration(migrations, create_logs_table);
  registerMigration(migrations, create_remote_logs_table);

  const kms: IKnexMigrationSource<IKnexMigration> = {
    getMigrations: async (): Promise<string[]> => {
      return Array.from(migrations.keys());
    },
    getMigrationName: (migrationName: Readonly<string>): Readonly<string> => {
      return migrationName;
    },
    getMigration: async function (
      migrationName: string,
    ): Promise<IKnexMigration> {
      const aMigration = migrations.get(migrationName);
      if (!aMigration) {
        throw new Error("No such migration present: " + migrationName);
      }
      return aMigration;
    },
  };
  return kms;
}
