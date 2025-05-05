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

/**
 * Common interface options for all Oracles.
 */
export interface OracleAbstractOptions {
  networkIdentification: NetworkId;
  leafId?: string;
  bungee: PluginBungeeHermes;
  logLevel?: LogLevelDesc;
}

export abstract class OracleAbstract {
  /**
   * Unique identifier for the bridge leaf.
   *
   * @protected
   * @abstract
   * @readonlyf
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
   * @param eventName - The name of the event to listen for.
   * @param callback - The callback function to handle the event data.
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
}
