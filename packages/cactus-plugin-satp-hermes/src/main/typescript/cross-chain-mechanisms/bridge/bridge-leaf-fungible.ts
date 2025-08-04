import { Amount, Asset } from "./ontology/assets/asset";
import { TransactionResponse } from "./bridge-types";

/**
 * Abstract class representing a bridge leaf for fungible assets.
 * Provides methods for deploying contracts, wrapping/unwrapping assets,
 * locking/unlocking assets, minting/burning assets, assigning assets,
 * running transactions, and retrieving transaction receipts.
 */
export abstract class BridgeLeafFungible {
  /**
   * Deploys the fungible wrapper contract.
   * @returns A promise that resolves when the contract is deployed.
   */
  public abstract deployWrapperContract(): Promise<void>;

  /**
   * Retrieves the receipt for the deployment of the fungible wrapper contract.
   * @returns The receipt of the deployment.
   */
  public abstract getDeployWrapperContractReceipt(): unknown;

  /**
   * Wraps an asset into the fungible wrapper.
   * @param asset - The asset to be wrapped.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract wrapAsset(asset: Asset): Promise<TransactionResponse>;

  /**
   * Unwraps an asset from the fungible wrapper.
   * @param assetId - The ID of the asset to be unwrapped.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract unwrapAsset(assetId: string): Promise<TransactionResponse>;

  /**
   * Locks a specified amount of an asset.
   * @param assetId - The ID of the asset to be locked.
   * @param amount - The amount of the asset to be locked.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract lockAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Unlocks a specified amount of an asset.
   * @param assetId - The ID of the asset to be unlocked.
   * @param amount - The amount of the asset to be unlocked.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract unlockAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Mints a specified amount of an asset.
   * @param assetId - The ID of the asset to be minted.
   * @param amount - The amount of the asset to be minted.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract mintAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Burns a specified amount of an asset.
   * @param assetId - The ID of the asset to be burned.
   * @param amount - The amount of the asset to be burned.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract burnAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Assigns a specified amount of an asset to a recipient.
   * @param assetId - The ID of the asset to be assigned.
   * @param to - The recipient of the asset.
   * @param amount - The amount of the asset to be assigned.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract assignAsset(
    assetId: string,
    to: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Runs a transaction with the specified method and parameters.
   * @param methodName - The name of the method to be invoked.
   * @param params - The parameters for the method invocation.
   * @param invocationType - The type of invocation.
   * @returns A promise that resolves with the transaction response.
   */
  public abstract runTransaction(
    methodName: string,
    params: string[],
    invocationType: unknown,
  ): Promise<TransactionResponse>;

  /**
   * Retrieves the receipt for a specified transaction.
   * @param transactionId - The ID of the transaction.
   * @returns A promise that resolves with the transaction receipt.
   */
  public abstract getReceipt(transactionId: string): Promise<string>;
}
