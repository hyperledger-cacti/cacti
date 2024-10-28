import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { TransactionResponse } from "../../../types/blockchain-interaction";
import { Asset } from "./types/asset";

export abstract class NetworkBridge {
  network!: string;
  claimFormat!: ClaimFormat;

  public networkName(): string {
    return this.network;
  }

  public abstract wrapAsset(asset: Asset): Promise<TransactionResponse>;

  public abstract unwrapAsset(assetId: string): Promise<TransactionResponse>;

  public abstract lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse>;

  public abstract unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse>;

  public abstract mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse>;

  public abstract burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse>;

  public abstract assignAsset(
    assetId: string,
    to: string,
    amount: number,
  ): Promise<TransactionResponse>;

  public abstract runTransaction(
    methodName: string,
    params: string[],
    invocationType: unknown,
  ): Promise<TransactionResponse>;

  public abstract getReceipt(
    //assetId: string,
    transactionId: string,
  ): Promise<string>;
  public abstract getView(assetId: string): Promise<string>;
}
