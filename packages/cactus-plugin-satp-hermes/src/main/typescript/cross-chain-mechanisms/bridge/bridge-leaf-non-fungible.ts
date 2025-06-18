import { Asset } from "./ontology/assets/asset";
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
  public abstract deployNonFungibleWrapperContract(): Promise<void>;

  /**
   * Retrieves the receipt of the deployed non-fungible wrapper contract.
   * This method should be implemented to return the deployment receipt.
   *
   * @returns {unknown} The receipt of the deployed non-fungible wrapper contract.
   */
  public abstract getDeployNonFungibleWrapperContractReceipt(): unknown;

  public abstract wrapAsset(asset: Asset): Promise<TransactionResponse>;

  public abstract unwrapNonFungibleAsset(
    assetId: string,
  ): Promise<TransactionResponse>;

  public abstract lockNonFungibleAsset(
    assetId: string,
    nftID: string,
  ): Promise<TransactionResponse>;

  public abstract unlockNonFungibleAsset(
    assetId: string,
    nftID: string,
  ): Promise<TransactionResponse>;

  public abstract mintNonFungibleAsset(
    assetId: string,
    nftID: string,
  ): Promise<TransactionResponse>;

  public abstract burnNonFungibleAsset(
    assetId: string,
    nftID: string,
  ): Promise<TransactionResponse>;

  public abstract assignNonFungibleAsset(
    assetId: string,
    to: string,
    nftID: string,
  ): Promise<TransactionResponse>;

  public abstract runTransaction(
    methodName: string,
    params: string[],
    invocationType: unknown,
  ): Promise<TransactionResponse>;

  public abstract getReceipt(transactionId: string): Promise<string>;
}
