// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output

import { Asset } from "./ontology/assets/asset";

export interface TransactionReceipt {
  receipt: string;
  proof: string;
}

export abstract class SATPBridgeExecutionLayer {
  /**
   * wraps an asset on the wrapper contract
   * @param asset
   * @returns transaction hash
   */
  public abstract wrapAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * unwraps an asset on the wrapper contract
   * @param asset
   * @returns transaction hash
   */
  public abstract unwrapAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Locks an asset on the blockchain
   * @param asset
   * @returns transaction hash
   **/
  public abstract lockAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Unlocks an asset on the blockchain
   * @param asset
   * @returns transaction hash
   **/
  public abstract unlockAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Mints an asset on the blockchain
   * @param asset
   * @returns transaction hash
   **/
  public abstract mintAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Burns an asset on the blockchain
   * @param asset
   * @returns transaction hash
   **/
  public abstract burnAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Assigns an asset to a recipient on the blockchain
   * @param asset
   * @returns transaction hash
   **/
  public abstract assignAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Verifies the existence of an asset on the blockchain
   * @param assetId
   * @returns boolean
   **/
  public abstract verifyAssetExistence(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined>;
  /**
   * Verifies if an asset is locked on the blockchain
   * @param assetId
   * @returns boolean
   **/
  public abstract verifyLockAsset(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined>;
}
