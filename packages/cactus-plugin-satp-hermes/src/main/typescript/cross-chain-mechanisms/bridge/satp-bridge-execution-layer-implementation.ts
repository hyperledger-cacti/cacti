// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  Asset,
  FungibleAsset,
  instanceOfFungibleAsset,
} from "./ontology/assets/asset";
import {
  ClaimFormatError,
  TransactionIdUndefinedError,
} from "../common/errors";
import { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  SATPBridgeExecutionLayer,
  TransactionReceipt,
} from "./satp-bridge-execution-layer";
import { BridgeLeafFungible } from "./bridge-leaf-fungible";
import { BridgeLeaf } from "./bridge-leaf";

/**
 * Options for configuring the ISATPBridgeExecutionLayerImpl.
 *
 * @property {BridgeLeaf} leafBridge - The bridge leaf instance used for the execution layer.
 * @property {ClaimFormat} [claimType] - Optional claim format type.
 * @property {LogLevelDesc} [logLevel] - Optional log level description for logging purposes.
 */
export interface ISATPBridgeExecutionLayerImplOptions {
  leafBridge: BridgeLeaf;
  claimType?: ClaimFormat;
  logLevel?: LogLevelDesc;
}

/**
 * @class SATPBridgeExecutionLayerImpl
 * @implements SATPBridgeExecutionLayer
 * @description Provides methods to wrap, unwrap, lock, unlock, mint, burn, and assign assets across different blockchain networks.
 */

export class SATPBridgeExecutionLayerImpl implements SATPBridgeExecutionLayer {
  public static readonly CLASS_NAME = "SATPBridgeExecutionLayerImpl";

  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly bridgeEndPoint: BridgeLeaf;
  private readonly claimType: ClaimFormat;

  /**
   * Constructs an instance of SATPBridgeExecutionLayerImpl.
   *
   * @param options - The options for configuring the SATPBridgeExecutionLayerImpl instance.
   *
   * @throws {ClaimFormatError} If the provided claim type is not supported by the bridge.
   */
  constructor(public readonly options: ISATPBridgeExecutionLayerImplOptions) {
    const label = SATPBridgeExecutionLayerImpl.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level: this.logLevel });

    this.claimType = options.claimType || ClaimFormat.DEFAULT;

    if (!(this.claimType in options.leafBridge.getSupportedClaimFormats())) {
      throw new ClaimFormatError("Claim not supported by the bridge");
    }
    this.bridgeEndPoint = options.leafBridge;
  }

  /**
   * Wraps a fungible asset.
   *
   * @param asset - The asset to be wrapped.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset wrapping.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async wrapAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#wrapAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.wrapAsset(asset);

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible wrapAsset not implemented");
    }
  }

  /**
   * Unwraps a fungible asset.
   *
   * @param asset - The asset to be unwrapped.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset unwrapping.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async unwrapAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#unwrapAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.unwrapAsset(asset.id);

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible unWrapAsset not implemented");
    }
  }

  /**
   * Locks a fungible asset.
   *
   * @param asset - The asset to be locked.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset locking.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async lockAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#lockAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.lockAsset(
        asset.id,
        Number((asset as FungibleAsset).amount),
      );

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible lockAsset not implemented");
    }
  }

  /**
   * Unlocks a fungible asset.
   *
   * @param asset - The asset to be unlocked.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset unlocking.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async unlockAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#unlockAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.unlockAsset(
        asset.id,
        Number((asset as FungibleAsset).amount),
      );

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible unlockAsset not implemented");
    }
  }

  /**
   * Mints a fungible asset.
   *
   * @param asset - The asset to be minted.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset minting.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async mintAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#mintAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.mintAsset(
        asset.id,
        Number((asset as FungibleAsset).amount),
      );

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible mintAsset not implemented");
    }
  }

  /**
   * Burns a fungible asset.
   *
   * @param asset - The asset to be burned.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset burning.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async burnAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#burnAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.burnAsset(
        asset.id,
        Number((asset as FungibleAsset).amount),
      );

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible burnAsset not implemented");
    }
  }

  /**
   * Assigns a fungible asset to a recipient.
   *
   * @param asset - The asset to be assigned.
   * @param recipient - The recipient of the asset.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset assignment.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async assignAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#assignAsset()`;

    if (instanceOfFungibleAsset(asset)) {
      const fungibleBridgeEndPoint = this
        .bridgeEndPoint as unknown as BridgeLeafFungible;
      const response = await fungibleBridgeEndPoint.assignAsset(
        asset.id,
        asset.owner,
        Number((asset as FungibleAsset).amount),
      );

      if (response.transactionId == undefined) {
        throw new TransactionIdUndefinedError(fnTag);
      }

      const receipt = await fungibleBridgeEndPoint.getReceipt(
        response.transactionId,
      );

      this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

      const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

      return {
        receipt,
        proof,
      };
    } else {
      throw new Error("Non-fungible assignAsset not implemented");
    }
  }

  /**
   * Verifies the existence of an asset.
   *
   * @param assetId - The ID of the asset to verify.
   * @param invocationType - The type of invocation.
   * @returns A promise that resolves to a boolean indicating whether the asset exists, or undefined if not implemented.
   * @throws {Error} If the method is not implemented.
   */
  public async verifyAssetExistence(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    assetId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    //todo: implement this
    throw new Error("Not implemented");
  }

  /**
   * Verifies the lock status of an asset.
   *
   * @param assetId - The ID of the asset to verify.
   * @param invocationType - The type of invocation.
   * @returns A promise that resolves to a boolean indicating whether the asset is locked, or undefined if not implemented.
   * @throws {Error} If the method is not implemented.
   */
  public async verifyLockAsset(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    assetId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    //todo: implement this
    throw new Error("Not implemented");
  }
}
