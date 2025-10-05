/**
 * @fileoverview IPFS-based Remote Log Repository Implementation
 *
 * This module provides an IPFS-based implementation of the remote log repository
 * interface for SATP gateway distributed persistence. Leverages IPFS for
 * decentralized, immutable storage of remote gateway logs, providing enhanced
 * fault tolerance and censorship resistance for cross-chain asset transfers.
 *
 * The IPFS implementation offers:
 * - Decentralized log storage across IPFS network
 * - Content-addressed immutable log entries
 * - Enhanced fault tolerance through replication
 * - Censorship-resistant persistence
 * - Integration with Hyperledger Cacti IPFS plugin
 *
 * @see {@link https://ipfs.io/} InterPlanetary File System
 * @see {@link https://github.com/hyperledger/cacti/tree/main/packages/cactus-plugin-object-store-ipfs} Cacti IPFS Plugin
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { Configuration } from "@hyperledger/cactus-core-api";
import { IRemoteLogRepository } from "./interfaces/repository";
import { RemoteLog } from "../../core/types";
import { stringify as safeStableStringify } from "safe-stable-stringify";

/**
 * IPFS-based implementation of remote SATP gateway log repository.
 *
 * Provides decentralized, immutable storage for remote SATP protocol logs
 * using the InterPlanetary File System. Each log entry is content-addressed
 * and replicated across the IPFS network, providing enhanced fault tolerance
 * and censorship resistance for cross-chain asset transfer operations.
 *
 * Key features:
 * - Decentralized log storage via IPFS
 * - Content-addressed immutable entries
 * - Enhanced fault tolerance through replication
 * - Integration with Cacti IPFS object store
 * - Base64 encoding for binary safety
 *
 * @implements {IRemoteLogRepository}
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const repository = new IPFSRemoteLogRepository('http://localhost:5001');
 *
 * // Store remote gateway log in IPFS
 * const remoteLog: RemoteLog = {
 *   key: 'remote-log-123',
 *   hash: 'sha256_content_hash',
 *   signature: 'gateway_digital_signature',
 *   signerPubKey: 'gateway_public_key_pem'
 * };
 *
 * await repository.create(remoteLog);
 *
 * // Retrieve log from IPFS
 * const retrievedLog = await repository.readById('remote-log-123');
 * ```
 */
export class IPFSRemoteLogRepository implements IRemoteLogRepository {
  /** Class name constant for debugging and logging */
  public static readonly CLASS_NAME = "IPFSRemoteLogRepository";
  /** IPFS object store API client instance */
  readonly database: ObjectStoreIpfsApi;

  /**
   * Initialize the IPFS remote log repository.
   *
   * Creates an IPFS API client configured to connect to the specified
   * IPFS node endpoint. The repository will use this connection for all
   * log storage and retrieval operations.
   *
   * @param ipfsPath - IPFS API endpoint URL (e.g., 'http://localhost:5001')
   * @since 0.0.3-beta
   */
  public constructor(ipfsPath: string) {
    const config = new Configuration({ basePath: ipfsPath });
    const apiClient = new ObjectStoreIpfsApi(config);
    this.database = apiClient;
  }

  /**
   * Get the class name for debugging and logging purposes.
   *
   * @returns Class name string
   * @since 0.0.3-beta
   */
  public get className(): string {
    return IPFSRemoteLogRepository.CLASS_NAME;
  }

  /**
   * Retrieve remote log entry by key from IPFS.
   *
   * Fetches the log entry from IPFS using the content-addressed key,
   * decodes the Base64 content, and parses the JSON data back into
   * a RemoteLog object.
   *
   * @param logKey - Content-addressed key for the log entry in IPFS
   * @returns Promise resolving to the remote log entry
   * @throws Error if IPFS retrieval fails
   * @since 0.0.3-beta
   */
  readById(logKey: string): Promise<RemoteLog> {
    const fnTag = `${this.className}#readById()`;

    return this.database
      .getObjectV1({ key: logKey })
      .then((response: any) => {
        return JSON.parse(
          Buffer.from(response.data.value, "base64").toString(),
        );
      })
      .catch(() => {
        throw new Error(`${fnTag}, error when logging to ipfs`);
      });
  }

  /**
   * Store remote log entry in IPFS with content addressing.
   *
   * Serializes the log entry to stable JSON, encodes as Base64 for
   * binary safety, and stores in IPFS using the log's key as the
   * content identifier. The immutable nature of IPFS ensures the
   * log cannot be tampered with once stored.
   *
   * @param log - Remote log entry to store in IPFS
   * @returns Promise resolving when storage completes
   * @throws Error if IPFS storage fails
   * @since 0.0.3-beta
   */
  create(log: RemoteLog): any {
    const fnTag = `${this.className}#create()`;
    const logBase64 = Buffer.from(safeStableStringify(log)).toString("base64");

    return this.database
      .setObjectV1({
        key: log.key,
        value: logBase64,
      })
      .catch(() => {
        throw new Error(`${fnTag}, error when logging to ipfs`);
      });
  }

  /**
   * Reset operation (no-op for IPFS).
   *
   * IPFS is immutable by design, so reset operations are not applicable.
   * This method exists to satisfy the interface contract.
   *
   * @returns Promise resolving immediately
   * @since 0.0.3-beta
   */
  async reset() {}

  /**
   * Destroy operation (no-op for IPFS).
   *
   * IPFS connections are stateless, so no cleanup is required.
   * This method exists to satisfy the interface contract.
   *
   * @returns Promise resolving immediately
   * @since 0.0.3-beta
   */
  async destroy() {}
}
