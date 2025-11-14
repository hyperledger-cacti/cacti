/**
 * @fileoverview Local Database Configuration for SATP Gateway Persistence
 *
 * This module provides Knex.js database configuration for local SATP gateway
 * logging and persistence operations. Configures SQLite database instances
 * with unique identifiers for development and testing environments, ensuring
 * isolation between different gateway instances and test runs.
 *
 * The local database stores:
 * - SATP protocol transaction logs
 * - Session state information
 * - Crash recovery checkpoints
 * - Asset transfer evidence
 *
 * @example
 * ```typescript
 * import { knexLocalInstance } from './database/knexfile';
 * import knex from 'knex';
 *
 * const db = knex(knexLocalInstance.default);
 * await db.migrate.latest();
 * ```
 *
 * @see {@link https://knexjs.org/guide/} Knex.js Documentation
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { Knex } from "knex";

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });

/**
 * Local database configuration instances for SATP gateway persistence.
 *
 * Provides SQLite-based database configuration with unique file names
 * to prevent conflicts between concurrent gateway instances. Each
 * configuration includes migration settings and SQLite-specific options
 * for optimal SATP protocol logging performance.
 *
 * @constant {Object.<string, Knex.Config>}
 * @since 0.0.3-beta
 */
export const knexLocalInstance: { [key: string]: Knex.Config } = {
  /** Default SQLite configuration for local SATP gateway persistence */
  default: {
    /** SQLite3 client for lightweight local storage */
    client: "sqlite3",
    connection: {
      /** Unique SQLite file path to prevent instance conflicts */
      filename: path.resolve(__dirname, `.dev.local-${uuidv4()}.sqlite3`),
    },
    migrations: {
      /** Directory containing database migration files */
      directory: path.resolve(__dirname, "migrations"),
    },
    /** Allow NULL values as default for SQLite compatibility */
    useNullAsDefault: true,
  },
};
