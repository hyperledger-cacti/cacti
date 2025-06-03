import { Asset, UniqueTokenID } from "./ontology/assets/asset";
import { TransactionResponse } from "./bridge-types";

/**
 * Abstract class representing a non-fungible bridge leaf.
 * This class provides the structure for deploying and retrieving
 * the receipt of a non-fungible wrapper contract.
 */
export abstract class BridgeLeafNonFungible {
  /**
   * Deploys the non-fungible wrapper contract.
   * This method should be implemented to handle the deployment logic.
   */
  public abstract deployWrapperContract(): Promise<void>;

  /**
   * Retrieves the receipt of the deployed non-fungible wrapper contract.
   * This method should be implemented to return the deployment receipt.
   *
   * @returns {unknown} The receipt of the deployed non-fungible wrapper contract.
   */
  public abstract getDeployWrapperContractReceipt(): unknown;

  public abstract wrapAsset(asset: Asset): Promise<TransactionResponse>;

  public abstract unwrapAsset(assetId: string): Promise<TransactionResponse>;

  public abstract lockAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract unlockAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract mintAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract burnAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract assignAsset(
    assetId: string,
    to: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract runTransaction(
    methodName: string,
    params: string[],
    invocationType: unknown,
  ): Promise<TransactionResponse>;

  public abstract getReceipt(transactionId: string): Promise<string>;
}
