/**
 * @fileoverview SATP Oracle Abstract Base Class
 *
 * This module provides the abstract base class for oracle implementations
 * in the SATP cross-chain system. Oracles handle off-chain computations,
 * data validation, and task execution that support complex cross-chain
 * operations following the IETF SATP v2 specification.
 *
 * The oracle abstraction provides:
 * - Network-specific oracle deployment
 * - Task execution and result handling
 * - Cross-chain data validation
 * - Event listening and notification
 * - Integration with Bungee Hermes for data transport
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.2-beta
 */

import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { IOracleEntryBase, IOracleListenerBase } from "./oracle-types";
import {
  IPluginLedgerConnector,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import { v4 as uuidv4 } from "uuid";
import { NetworkId, OracleOperation, OracleResponse } from "../../public-api";
import { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { MonitorService } from "../../services/monitoring/monitor";

/**
 * Configuration options for oracle implementations.
 *
 * Defines the common parameters required across all oracle implementations
 * including network identification, data transport configuration, and
 * monitoring service integration.
 *
 * @since 0.0.2-beta
 * @example
 * ```typescript
 * const oracleOptions: OracleAbstractOptions = {
 *   networkIdentification: { id: 'ethereum-1', ledgerType: LedgerType.Ethereum },
 *   leafId: 'oracle-leaf-001',
 *   bungee: bungeeHermesInstance,
 *   logLevel: 'debug',
 *   monitorService: monitoringService
 * };
 * ```
 */
export interface OracleAbstractOptions {
  /** Network identification parameters */
  networkIdentification: NetworkId;
  /** Optional unique identifier for the oracle leaf */
  leafId?: string;
  /** Bungee Hermes plugin for cross-chain data transport */
  bungee: PluginBungeeHermes;
  /** Optional logging level for oracle operations */
  logLevel?: LogLevelDesc;
  /** Monitoring service for telemetry and metrics */
  monitorService: MonitorService;
}

/**
 * Abstract base class for oracle implementations.
 *
 * Provides the common interface and functionality for oracle implementations
 * across different blockchain networks. Oracles handle off-chain computations,
 * data validation, and complex task execution that cannot be performed
 * directly on-chain as part of SATP cross-chain operations.
 *
 * @abstract
 * @since 0.0.2-beta
 * @example
 * ```typescript
 * class EthereumOracle extends OracleAbstract {
 *   async executeTask(operation: OracleOperation): Promise<OracleResponse> {
 *     // Network-specific oracle task implementation
 *   }
 * }
 * ```
 */
export abstract class OracleAbstract {
  /**
   * Unique identifier for the bridge leaf.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly id: string;

  /**
   * Network identification details.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly networkIdentification: NetworkId;

  /**
   * Logging level.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly logLevel: LogLevelDesc;

  /**
   * Format of the claim.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly claimFormats: ClaimFormat[];

  /**
   * Optional bungee plugin for Hermes.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly bungee?: PluginBungeeHermes;

  /**
   * Connector for the ledger plugin.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly connector: IPluginLedgerConnector<
    unknown,
    unknown,
    unknown,
    unknown
  >;

  /**
   * Retrieves the unique identifier of the bridge leaf.
   *
   * @returns {string} The unique identifier.
   * @throws Will throw the identifier.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Creates a unique identifier for the bridge leaf based on the provided leaf name.
   *
   * @param {string} leafName - The name of the leaf.
   * @returns {string} The generated unique identifier.
   */
  public createId(leafName: string): string {
    return `${leafName}-${this.networkIdentification.id}-${this.networkIdentification.ledgerType}-${uuidv4()}`;
  }

  /**
   * Retrieves the network identifier.
   *
   * @returns {string} The network identifier.
   * @throws Will throw the network identifier.
   */
  public getNetworkId(): string {
    throw this.networkIdentification.id;
  }

  /**
   * Retrieves the ledger type.
   *
   * @returns {LedgerType} The ledger type.
   */
  public getLedgerType(): LedgerType {
    return this.networkIdentification.ledgerType;
  }

  /**
   * Retrieves the network identification details.
   *
   * @returns {NetworkId} The network identification details.
   */
  public getNetworkIdentification(): NetworkId {
    return this.networkIdentification;
  }

  /**
   * Retrieves the supported claim formats.
   *
   * @returns {ClaimFormat[]} An array of supported claim formats.
   */
  public getSupportedClaimFormats(): ClaimFormat[] {
    return this.claimFormats;
  }

  /**
   * Represents an abstract base class for a bridge leaf in a cross-chain mechanism.
   *
   * @abstract
   */
  public abstract deployContracts(): Promise<void>;

  /**
   * Updates the ledger with the provided payload.
   * This method is abstract and must be implemented by subclasses
   * specific to the target ledger (e.g., Fabric, EVM, etc.).
   *
   * @param entry - The payload to be updated on the ledger.
   * @returns A promise resolving to an object containing the transaction response and proof.
   */
  public abstract updateEntry(entry: IOracleEntryBase): Promise<OracleResponse>;

  /**
   * Reads data from the ledger, such as querying a specific method.
   * This method must be implemented by the subclass to define the
   * specific behavior for the target ledger.
   *
   * @param args - The arguments required to perform the read operation on the ledger.
   * @returns A promise resolving to an object containing the call output and proof.
   */
  public abstract readEntry(args: IOracleEntryBase): Promise<OracleResponse>;

  /**
   * Subscribes to events emitted by the ledger.
   * This method must be implemented by the subclass to define the
   * specific behavior for the target ledger.
   *
   * @param args - The listener configuration containing event details.
   * @param callback - The callback function to handle the event data.
   * @param filter - Optional filter parameters for the event subscription.
   * @returns A subscription object that can be used to unsubscribe from the event.
   */
  public abstract subscribeContractEvent(
    args: IOracleListenerBase,
    callback: (params: string[]) => void,
    filter?: string[],
  ): Promise<{ unsubscribe: () => void }>;

  /**
   * Converts an operation to an oracle entry.
   * This method must be implemented by the subclass to define the
   * specific behavior for the target ledger.
   *
   * @param operation - The operation to be converted.
   * @returns The converted oracle entry.
   */
  public abstract convertOperationToEntry(
    operation: OracleOperation,
  ): IOracleEntryBase;

  /**
   * Extracts named parameters from the decoded event.
   * @param decodedEvent - The decoded event object.
   * @param filter - Optional filter for specific parameter names.
   * @returns An array of parameter values.
   */
  extractNamedParams(
    decodedEvent: Record<string, string>,
    filter?: string[],
  ): string[] {
    const params = [];

    for (const key in decodedEvent) {
      // skip numeric keys and special properties
      if (!isNaN(Number(key))) {
        continue;
      }

      // if filter is provided, check if the key is in the filter
      if (filter && !filter.includes(key)) {
        continue;
      }

      params.push(String(decodedEvent[key]));
    }

    return params;
  }
}
