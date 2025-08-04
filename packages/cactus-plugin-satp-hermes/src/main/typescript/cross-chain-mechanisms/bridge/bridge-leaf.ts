import {
  IPluginLedgerConnector,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { ISignerKeyPair } from "@hyperledger/cactus-common";
import {
  ClaimFormat,
  TokenType,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { OntologyManager } from "./ontology/ontology-manager";
import { v4 as uuidv4 } from "uuid";
import { Asset } from "./ontology/assets/asset";
import { NetworkId } from "../../public-api";

/**
 * Options for configuring a bridge leaf in a cross-chain mechanism.
 *
 * @property {NetworkId} networkIdentification - The identification of the network.
 * @property {OntologyManager} ontologyManager - The manager responsible for the ontology.
 * @property {string} [leafId] - Optional identifier for the leaf.
 * @property {ISignerKeyPairs} [keyPair] - Optional key pair for signing.
 * @property {LogLevelDesc} [logLevel] - Optional log level for logging.
 * @property {ClaimFormat[]} [claimFormats] - Optional format for claims.
 */
export interface IBridgeLeafOptions {
  networkIdentification: NetworkId;
  leafId?: string;
  keyPair?: ISignerKeyPair;
  logLevel?: LogLevelDesc;
  claimFormats?: ClaimFormat[];
}

/**
 * Abstract class representing a bridge leaf in a cross-chain mechanism.
 *
 * In DLT bridges, a “leaf” is analogous to a bascule bridge leaf — an independent module forming half of a cross-chain connection.
 * Each leaf handles specific tasks, and together (2 or more leafs) they provide a secure bridge between ledger.
 *
 * @abstract
 */

export abstract class BridgeLeaf {
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
   * Key pairs used for signing.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly keyPair: ISignerKeyPair;

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
   * Ontology manager instance.
   *
   * @protected
   * @abstract
   * @readonly
   */
  protected abstract readonly ontologyManager: OntologyManager;

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
   * Retrieves the proof of the state of the asset, byt the asset id.
   *
   * This method is abstract and must be implemented by subclasses.
   * It should return a promise that resolves to a string representing the proof.
   *
   * @param {string} assetId - The id of the asset.
   * @param {ClaimFormat} claimFormat - the format of the claim.
   * @returns {Promise<string>} A promise that resolves to the proof string.
   */
  public abstract getProof(
    asset: Asset,
    claimFormat: ClaimFormat,
  ): Promise<string>;

  /**
   * Gets the wrapper contract for the specified type.
   *
   * This method is abstract and must be implemented by subclasses.
   * It should return a string representing the address of the wrapper contract.
   *
   * @param {string} type - The type of the wrapper contract.
   * @returns {unknown} The wrapper contract.
   */

  public abstract getWrapperContract(type: TokenType): unknown;

  /**
   * Retrieves the approval address for a specific asset type.
   *
   * This method is abstract and must be implemented by subclasses.
   * It should return a string representing the address where approval is required.
   *
   * @abstract
   * @param {string} assetType - The type of the asset for which the approval address is needed.
   * @returns {string} The approval address for the specified asset type and network.
   */
  public abstract getApproveAddress(assetType: TokenType): string;
}
