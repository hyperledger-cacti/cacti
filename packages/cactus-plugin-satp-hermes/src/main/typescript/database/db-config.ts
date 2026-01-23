/**
 * @fileoverview Centralized Database Configuration for SATP Gateway
 *
 * This module provides shared database configuration settings for both
 * SQLite (local/development) and PostgreSQL (Docker/production) environments.
 * Centralizes pool settings, timeouts, and database-specific optimizations.
 *
 * @example
 * ```typescript
 * import { createEnhancedKnexConfig, COMMON_POOL_CONFIG } from './db-config';
 *
 * // For PostgreSQL
 * const pgConfig = createEnhancedKnexConfig(basePgConfig);
 *
 * // For SQLite
 * const sqliteConfig = createEnhancedKnexConfig(baseSqliteConfig);
 * ```
 *
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { Knex } from "knex";

/**
 * Common pool configuration settings shared across all database types.
 * These settings optimize connection management and prevent pool exhaustion.
 */
export const COMMON_POOL_CONFIG = {
  /** Minimum connections in pool (0 allows pool to shrink when idle) */
  min: 0,
  /** Maximum connections in pool */
  max: 10,
  /** Timeout for acquiring a connection from the pool (ms) */
  acquireTimeoutMillis: 60000,
  /** Timeout for creating a new connection (ms) */
  createTimeoutMillis: 30000,
  /** Timeout for destroying a connection (ms) */
  destroyTimeoutMillis: 5000,
  /** Time a connection can be idle before being removed (ms) */
  idleTimeoutMillis: 30000,
  /** Interval for checking and removing idle connections (ms) */
  reapIntervalMillis: 1000,
  /** Interval between connection creation retries (ms) */
  createRetryIntervalMillis: 200,
} as const;

/**
 * Extended pool configuration for SQLite with longer acquire timeout.
 * SQLite benefits from longer timeouts due to file-level locking.
 */
export const SQLITE_POOL_CONFIG = {
  ...COMMON_POOL_CONFIG,
  /** Extended acquire timeout for SQLite file locking scenarios */
  acquireTimeoutMillis: 100000,
} as const;

/**
 * Common connection acquisition timeout (ms).
 * Used at the Knex config level for connection timeout.
 */
export const ACQUIRE_CONNECTION_TIMEOUT = 100000;

/**
 * SQLite busy timeout in milliseconds.
 * Time to wait when the database is locked before returning SQLITE_BUSY.
 */
export const SQLITE_BUSY_TIMEOUT = 10000;

/**
 * SQLite connection interface for afterCreate hook.
 * The sqlite3 library uses this callback pattern for PRAGMA commands.
 */
interface SqliteConnection {
  run(sql: string, callback?: (err?: Error) => void): void;
}

/**
 * Creates the SQLite-specific afterCreate hook that enables WAL mode
 * and sets busy_timeout for better concurrent write handling.
 *
 * WAL (Write-Ahead Logging) mode allows concurrent reads while writes
 * are in progress and significantly reduces SQLITE_BUSY lock contention.
 *
 * @returns Pool afterCreate callback for SQLite connections
 */
export function createSqliteAfterCreate(): (
  conn: SqliteConnection,
  done: (err?: Error) => void,
) => void {
  return (conn: SqliteConnection, done: (err?: Error) => void) => {
    conn.run("PRAGMA journal_mode = WAL", (err?: Error) => {
      if (err) {
        done(err);
        return;
      }
      conn.run(`PRAGMA busy_timeout = ${SQLITE_BUSY_TIMEOUT}`, done);
    });
  };
}

/**
 * Creates an enhanced Knex configuration with optimized pool and timeout settings.
 * Automatically detects SQLite and applies appropriate optimizations.
 *
 * @param config - Base Knex configuration
 * @returns Enhanced Knex configuration with timeout and pool settings
 *
 * @example
 * ```typescript
 * // PostgreSQL config
 * const pgConfig = createEnhancedKnexConfig({
 *   client: 'pg',
 *   connection: { host, user, password, database }
 * });
 *
 * // SQLite config (auto-detects and adds WAL mode)
 * const sqliteConfig = createEnhancedKnexConfig({
 *   client: 'sqlite3',
 *   connection: { filename: './db.sqlite' }
 * });
 * ```
 */
export function createEnhancedKnexConfig(config: Knex.Config): Knex.Config {
  const isSqlite = config.client === "sqlite3";

  const poolConfig = isSqlite
    ? {
        ...SQLITE_POOL_CONFIG,
        afterCreate: createSqliteAfterCreate(),
      }
    : COMMON_POOL_CONFIG;

  return {
    ...config,
    acquireConnectionTimeout: isSqlite ? ACQUIRE_CONNECTION_TIMEOUT : undefined,
    pool: {
      ...((config.pool as object) || {}),
      ...poolConfig,
    },
  };
}

/**
 * Creates enhanced Knex configuration specifically for PostgreSQL.
 * Use this when you know the database is PostgreSQL.
 *
 * @param config - Base PostgreSQL Knex configuration
 * @returns Enhanced Knex configuration with pool settings
 */
export function createEnhancedPgConfig(config: Knex.Config): Knex.Config {
  return {
    ...config,
    pool: {
      ...((config.pool as object) || {}),
      ...COMMON_POOL_CONFIG,
    },
  };
}

/**
 * Creates enhanced Knex configuration specifically for SQLite.
 * Includes WAL mode and busy_timeout optimizations.
 *
 * @param config - Base SQLite Knex configuration
 * @returns Enhanced Knex configuration with SQLite optimizations
 */
export function createEnhancedSqliteConfig(config: Knex.Config): Knex.Config {
  return {
    ...config,
    acquireConnectionTimeout: ACQUIRE_CONNECTION_TIMEOUT,
    pool: {
      ...((config.pool as object) || {}),
      ...SQLITE_POOL_CONFIG,
      afterCreate: createSqliteAfterCreate(),
    },
    useNullAsDefault: true,
  };
}
