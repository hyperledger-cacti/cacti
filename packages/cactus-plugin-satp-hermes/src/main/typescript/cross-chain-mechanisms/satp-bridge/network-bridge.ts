import type { LedgerType } from "@hyperledger/cactus-core-api";
import type { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import type { TransactionResponse } from "../../types/blockchain-interaction";
import type { Asset } from "./types/asset";

export abstract class NetworkBridge {
  network!: string;
  networkType!: LedgerType;
  claimFormat!: ClaimFormat;

  public networkName(): string {
    return this.network;
  }
  public getNetworkType(): LedgerType {
    return this.networkType;
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

  /**
   * Merges two receipts into one.
   *
   * @param receipt1 - First receipt to merge.
   * @param receipt2 - Second receipt to merge.
   * @returns The merged receipt as a string.
   */
  public abstract merge_receipt(
    receipt1: string | undefined,
    receipt2: string | undefined,
  ): string;
}
