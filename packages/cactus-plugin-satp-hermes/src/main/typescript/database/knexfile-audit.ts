/**
 * @fileoverview Audit Database Configuration for SATP Gateway Persistence
 *
 * This module provides Knex.js database configuration for SATP gateway
 * audit logging and persistence operations. Supports both SQLite for
 * development/testing and PostgreSQL for production deployments, enabling
 * reliable audit trails and cross-gateway logging.
 *
 * The audit database enables:
 * - Session and transaction audit logging
 * - Historical record keeping
 * - Multi-gateway session tracking
 * - Production-grade persistence scaling
 *
 * @example
 * ```typescript
 * import { knexAuditInstance } from './database/knexfile-audit';
 * import knex from 'knex';
 *
 * // Development with SQLite
 * const devDb = knex(knexAuditInstance.default);
 *
 * // Production with PostgreSQL
 * const prodDb = knex(knexAuditInstance.production);
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

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });

/**
 * Audit database configuration instances for distributed SATP gateway persistence.
 *
 * Provides both SQLite (for development) and PostgreSQL (for production)
 * configurations to support various deployment scenarios.
 *
 * @constant {Object.<string, Knex.Config>}
 * @since 0.0.3-beta
 */
export const knexAuditInstance: { [key: string]: Knex.Config } = {
  /** Default SQLite configuration for gateway development/testing */
  default: {
    /** SQLite3 client for lightweight development */
    client: "sqlite3",
    connection: {
      /** Unique SQLite file path for cross-gateway testing */
      //filename: path.resolve(__dirname, `.dev.audit-${uuidv4()}.sqlite3`),
      filename: ":memory:",
    },
    migrations: {
      /** Directory containing database migration files */
      directory: path.resolve(__dirname, "migrations"),
    },
    /** Allow NULL values as default for SQLite compatibility */
    useNullAsDefault: true,
  },
  /** Production PostgreSQL configuration for scalable audit persistence */
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
