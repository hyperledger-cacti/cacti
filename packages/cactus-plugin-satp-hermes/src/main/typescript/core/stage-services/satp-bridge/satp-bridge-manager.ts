// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output
import { BridgeManager } from "./bridge-manager";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPBridgeConfig } from "../../types";
import { Asset } from "./types/asset";
import { TransactionIdUndefinedError } from "../../errors/bridge-erros";

export class SATPBridgeManager implements BridgeManager {
  public static readonly CLASS_NAME = "SATPBridgeManager";

  private _log: Logger;

  public get log(): Logger {
    return this._log;
  }

  constructor(private config: SATPBridgeConfig) {
    const label = SATPBridgeManager.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level: config.logLevel, label });
  }

  public async wrapAsset(asset: Asset): Promise<string> {
    const fnTag = `${this.className}#wrap()`;

    const response = await this.config.network.wrapAsset(asset);

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = "";
    //  this.config.network.getReceipt(
    //   asset.tokenId,
    //   response.transactionId,
    // );

    this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

    return receipt;
  }
  public async unwrapAsset(assetId: string): Promise<string> {
    const fnTag = `${this.className}#unwrap()`;

    const response = await this.config.network.unwrapAsset(assetId);

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = this.config.network.getReceipt(
      assetId,
      response.transactionId,
    );

    this.log.info(`${fnTag}, proof of the asset unwrapping: ${receipt}`);

    return receipt;
  }

  public get className(): string {
    return SATPBridgeManager.CLASS_NAME;
  }

  public async lockAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#lockAsset()`;

    const response = await this.config.network.lockAsset(assetId, amount);

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = "";
    //  this.config.network.getReceipt(
    //   asset.tokenId,
    //   response.transactionId,
    // );

    this.log.info(`${fnTag}, proof of the asset lock: ${receipt}`);

    return receipt;
  }

  public async unlockAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#unlockAsset()`;

    const response = await this.config.network.unlockAsset(assetId, amount);

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      assetId,
      response.transactionId,
    );

    this.log.info(`${fnTag}, proof of the asset unlock: ${receipt}`);

    return receipt;
  }

  public async mintAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#mintAsset()`;

    const transaction = await this.config.network.mintAsset(assetId, amount);

    if (transaction.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = "";
    //  this.config.network.getReceipt(
    //   asset.tokenId,
    //   response.transactionId,
    // );

    this.log.info(`${fnTag}, proof of the asset creation: ${receipt}`);

    return receipt;
  }

  public async burnAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#burnAsset()`;

    const transaction = await this.config.network.burnAsset(assetId, amount);

    if (transaction.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = "";
    //  this.config.network.getReceipt(
    //   asset.tokenId,
    //   response.transactionId,
    // );

    this.log.info(`${fnTag}, proof of the asset deletion: ${receipt}`);

    return receipt;
  }

  public async assignAsset(
    assetId: string,
    recipient: string,
    amount: number,
  ): Promise<string> {
    const fnTag = `${this.className}#assignAsset()`;

    const response = await this.config.network.assignAsset(
      assetId,
      recipient,
      amount,
    );

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = "";
    //  this.config.network.getReceipt(
    //   asset.tokenId,
    //   response.transactionId,
    // );

    this.log.info(`${fnTag}, proof of the asset assignment: ${receipt}`);

    return receipt;
  }
  public async verifyAssetExistence(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    //todo: implement this
    const assetExists = await this.config.network.runTransaction(
      "AssetExists",
      [assetId],
      invocationType,
    );

    if (assetExists == undefined) {
      return false;
    }

    return true;
  }
  public async verifyLockAsset(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    //todo: implement this
    const lockAsset = await this.config.network.runTransaction(
      "LockAsset",
      [assetId],
      invocationType,
    );

    if (lockAsset.output == undefined) {
      return false;
    }

    return true;
  }
}
