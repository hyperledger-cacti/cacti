// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output

import { Asset } from "./types/asset";

export abstract class BridgeManager {
  /**
   * wraps an asset on the wrapper contract
   * @param asset
   * @returns transaction hash
   */
  public abstract wrapAsset(asset: Asset): Promise<string>;
  /**
   * unwraps an asset on the wrapper contract
   * @param assetId
   * @returns transaction hash
   */
  public abstract unwrapAsset(assetId: string): Promise<string>;
  /**
   * Locks an asset on the blockchain
   * @param assetId
   * @param amount
   * @returns transaction hash
   **/
  public abstract lockAsset(assetId: string, amount: number): Promise<string>;
  /**
   * Unlocks an asset on the blockchain
   * @param assetId
   * @param amount
   * @returns transaction hash
   **/
  public abstract unlockAsset(assetId: string, amount: number): Promise<string>;
  /**
   * Mints an asset on the blockchain
   * @param assetId
   * @param amount
   * @returns transaction hash
   **/
  public abstract mintAsset(assetId: string, amount: number): Promise<string>;
  /**
   * Burns an asset on the blockchain
   * @param assetId
   * @param amount
   * @returns transaction hash
   **/
  public abstract burnAsset(assetId: string, amount: number): Promise<string>;
  /**
   * Assigns an asset to a recipient on the blockchain
   * @param assetId
   * @param recipient
   * @param amount
   * @returns transaction hash
   **/
  public abstract assignAsset(
    assetId: string,
    recipient: string,
    amount: number,
  ): Promise<string>;
  /**
   * Verifies the existence of an asset on the blockchain
   * @param assetId
   * @returns boolean
   **/

  //TODO create-rollback
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
