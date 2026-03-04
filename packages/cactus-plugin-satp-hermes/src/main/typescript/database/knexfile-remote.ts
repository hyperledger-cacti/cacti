/**
 * @fileoverview Remote Database Configuration for SATP Gateway Persistence
 *
 * This module provides Knex.js database configuration for remote SATP gateway
 * logging and cross-gateway persistence operations. Supports both SQLite for
 * development/testing and PostgreSQL for production deployments, enabling
 * distributed logging and inter-gateway communication.
 *
 * The remote database enables:
 * - Cross-gateway transaction coordination
 * - Distributed crash recovery
 * - Multi-gateway session synchronization
 * - Production-grade persistence scaling
 *
 * @example
 * ```typescript
 * import { knexRemoteInstance } from './database/knexfile-remote';
 * import knex from 'knex';
 *
 * // Development with SQLite
 * const devDb = knex(knexRemoteInstance.default);
 *
 * // Production with PostgreSQL
 * const prodDb = knex(knexRemoteInstance.production);
 * await prodDb.migrate.latest();
 * ```
 *
 * @see {@link https://knexjs.org/guide/} Knex.js Documentation
 * @see {@link https://www.postgresql.org/docs/} PostgreSQL Documentation
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { Knex } from "knex";
import {
  ACQUIRE_CONNECTION_TIMEOUT,
  SQLITE_POOL_CONFIG,
  createSqliteAfterCreate,
} from "./db-config";

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });

/**
 * Remote database configuration instances for distributed SATP gateway persistence.
 *
 * Provides both SQLite (for development) and PostgreSQL (for production)
 * configurations to support various deployment scenarios. Remote databases
 * enable cross-gateway coordination and distributed crash recovery capabilities.
 *
 * @constant {Object.<string, Knex.Config>}
 * @since 0.0.3-beta
 */
export const knexRemoteInstance: { [key: string]: Knex.Config } = {
  /** Default SQLite configuration for remote gateway development/testing */
  default: {
    /** SQLite3 client for lightweight remote development */
    client: "sqlite3",
    connection: {
      /** Unique remote SQLite file path for cross-gateway testing */
      filename: path.resolve(
        __dirname,
        "data",
        `.dev.remote-${uuidv4()}.sqlite3`,
      ),
    },
    migrations: {
      /** Directory containing database migration files */
      directory: path.resolve(__dirname, "migrations"),
    },
    /** Allow NULL values as default for SQLite compatibility */
    useNullAsDefault: true,
    acquireConnectionTimeout: ACQUIRE_CONNECTION_TIMEOUT,
    pool: {
      ...SQLITE_POOL_CONFIG,
      afterCreate: createSqliteAfterCreate(),
    },
  },
  /** Production PostgreSQL configuration for scalable remote persistence */
  production: {
    /** PostgreSQL client for production distributed operations */
    client: "pg",
    connection: {
      /** Database server hostname from environment */
      host: process.env.DB_HOST,
      /** Database server port from environment */
      port: Number(process.env.DB_PORT),
      /** Database username from environment */
      user: process.env.DB_USER,
      /** Database password from environment */
      password: process.env.DB_PASSWORD,
      /** Database name from environment */
      database: process.env.DB_NAME,
    },
    migrations: {
      /** Directory containing database migration files */
      directory: path.resolve(__dirname, "migrations"),
    },
  },
};
