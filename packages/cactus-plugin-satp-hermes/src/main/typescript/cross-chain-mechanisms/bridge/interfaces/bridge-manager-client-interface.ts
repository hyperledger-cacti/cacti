import {
  ClaimFormat,
  TokenType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkId } from "../../../public-api";
import { BridgeLeaf } from "../bridge-leaf";
import { SATPBridgeExecutionLayer } from "../satp-bridge-execution-layer";

/**
 * An abstract class that defines the interface for a Bridge Manager Client.
 * This interface provides methods to interact with bridge endpoints and
 * retrieve execution layers for cross-chain mechanisms.
 */
export abstract class BridgeManagerClientInterface {
  /**
   * Retrieves the bridge endpoint for a given network ID and claim format.
   *
   * @param id - The network ID for which the bridge endpoint is requested.
   * @param claimFormat - The format of the claim for which the bridge endpoint is requested.
   * @returns The bridge leaf corresponding to the specified network ID and claim format.
   */
  public abstract getBridgeEndPoint(
    id: NetworkId,
    claimFormat: ClaimFormat,
  ): BridgeLeaf;

  /**
   * Retrieves a list of available network IDs for which bridge endpoints are available.
   *
   * @returns An array of network IDs that have available bridge endpoints.
   */
  public abstract getAvailableEndPoints(): NetworkId[];

  /**
   * Retrieves the SATP execution layer for a given network ID and claim format.
   *
   * @param id - The network ID for which the SATP execution layer is requested.
   * @param claimFormat - The format of the claim for which the SATP execution layer is requested.
   * @returns The SATP bridge execution layer corresponding to the specified network ID and claim format.
   */
  public abstract getSATPExecutionLayer(
    id: NetworkId,
    claimFormat?: ClaimFormat,
  ): SATPBridgeExecutionLayer;

  /**
   * Retrieves the approval address for a specific asset type on a given network.
   *
   * This method is abstract and must be implemented by subclasses.
   * It should return a string representing the address where approval is required.
   *
   * @abstract
   * @param {NetworkId} networkIdentification - The identification details of the network.
   * @param {TokenType} assetType - The type of the asset for which the approval address is needed.
   * @returns {string} The approval address for the specified asset type and network.
   */
  public abstract getApproveAddress(
    networkIdentification: NetworkId,
    assetType: TokenType,
  ): string;
}
