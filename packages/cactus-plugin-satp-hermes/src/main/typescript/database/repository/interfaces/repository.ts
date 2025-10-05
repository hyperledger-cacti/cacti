/**
 * @fileoverview Repository Interface Definitions for SATP Gateway Persistence
 *
 * This module defines the repository pattern interfaces for SATP gateway
 * data persistence operations.
 *
 * @group Database Repositories Provides type-safe contracts for local and
 * remote log repositories, enabling consistent data access patterns across
 * different storage implementations and ensuring SATP protocol compliance.
 *
 * The repository interfaces support:
 * - Local transaction logging and state management
 * - Remote cross-gateway log synchronization
 * - Session-based log retrieval and filtering
 * - Database lifecycle management and cleanup
 *
 * @example
 * ```typescript
 * import { ILocalLogRepository } from './interfaces/repository';
 *
 * class MyRepository implements ILocalLogRepository {
 *   async readById(id: string): Promise<LocalLog> {
 *     // Implementation
 *   }
 *   // ... other methods
 * }
 * ```
 *
 * @see {@link https://martinfowler.com/eaaCatalog/repository.html} Repository Pattern
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import type { LocalLog, RemoteLog } from "../../../core/types";

/**
 * Base repository interface for generic data persistence operations.
 *
 * Defines the fundamental contract that all SATP repository implementations
 * must follow, providing standard CRUD operations and lifecycle management.
 * This interface enables polymorphic repository usage and consistent data
 * access patterns across different storage backends.
 *
 * @template T - Entity type (LocalLog, RemoteLog, etc.)
 * @template K - Key type (string, number, etc.)
 * @interface IRepository
 * @since 0.0.3-beta
 */
export interface IRepository<T, K> {
  /** Retrieve entity by unique identifier */
  readById(id: K): Promise<T>;
  /** Create new entity in storage */
  create(entity: T): any;
  /** Clean up repository resources and connections */
  destroy(): any;
  /** Reset repository to initial state */
  reset(): any;
}

/**
 * Repository interface for local SATP gateway log persistence.
 *
 * Extends the base repository interface to provide specialized operations
 * for local SATP transaction logging, session management, and crash recovery.
 * Supports timestamp-based filtering, sequence-based retrieval, and proof
 * evidence management required for SATP protocol compliance.
 *
 * Key capabilities:
 * - Session-scoped log management
 * - Timestamp-based log filtering
 * - Sequence number-based retrieval
 * - Proof evidence separation
 * - Database lifecycle tracking
 *
 * @interface ILocalLogRepository
 * @extends IRepository<LocalLog, string>
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const localRepo: ILocalLogRepository = new KnexLocalLogRepository(config);
 *
 * // Retrieve latest log for a session
 * const latestLog = await localRepo.readLastestLog('session-123');
 *
 * // Get logs after specific timestamp
 * const recentLogs = await localRepo.readLogsMoreRecentThanTimestamp('2023-01-01T00:00:00Z');
 *
 * // Fetch logs from sequence number
 * const sequenceLogs = await localRepo.fetchLogsFromSequence('session-123', 10);
 * ```
 */
export interface ILocalLogRepository extends IRepository<LocalLog, string> {
  /** Underlying database connection instance */
  database: any;
  /** Retrieve local log by unique identifier */
  readById(id: string): Promise<LocalLog>;
  /** Read all logs excluding proof-type entries */
  readLogsNotProofs(): Promise<LocalLog[]>;
  /** Read logs created after specified timestamp */
  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<LocalLog[]>;
  /** Read most recent log entry for a specific session */
  readLastestLog(sessionID: string): Promise<LocalLog>;
  /** Create new local log entry */
  create(log: LocalLog): Promise<LocalLog>;
  /** Delete all logs associated with a session ID */
  deleteBySessionId(log: string): any;
  /** Fetch logs from a specific sequence number onwards */
  fetchLogsFromSequence(
    sessionId: string,
    sequenceNumber: number,
  ): Promise<LocalLog[]>;
  /** Clean up repository resources and connections */
  destroy(): any;
  /** Reset repository to initial state */
  reset(): any;
  /** Check if repository has been properly initialized */
  getCreated(): boolean;
}

/**
 * Repository interface for remote SATP gateway log persistence.
 *
 * Extends the base repository interface to provide specialized operations
 * for remote SATP transaction logging and cross-gateway synchronization.
 * Enables distributed crash recovery and inter-gateway communication
 * required for multi-party SATP protocol execution.
 *
 * Key capabilities:
 * - Cross-gateway log synchronization
 * - Distributed crash recovery support
 * - Remote evidence verification
 * - Multi-gateway coordination
 *
 * @interface IRemoteLogRepository
 * @extends IRepository<RemoteLog, string>
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const remoteRepo: IRemoteLogRepository = new KnexRemoteLogRepository(config);
 *
 * // Store remote gateway log
 * const remoteLog: RemoteLog = {
 *   id: 'remote-log-123',
 *   sessionId: 'session-456',
 *   gatewayId: 'remote-gateway-001',
 *   data: JSON.stringify(transferData),
 *   timestamp: new Date().toISOString()
 * };
 *
 * await remoteRepo.create(remoteLog);
 *
 * // Retrieve remote log
 * const retrievedLog = await remoteRepo.readById('remote-log-123');
 * ```
 */
export interface IRemoteLogRepository extends IRepository<RemoteLog, string> {
  /** Underlying database connection instance */
  database: any;
  /** Retrieve remote log by unique identifier */
  readById(id: string): Promise<RemoteLog>;
  /** Create new remote log entry */
  create(log: RemoteLog): any;
  /** Clean up repository resources and connections */
  destroy(): any;
  /** Reset repository to initial state */
  reset(): any;
}
