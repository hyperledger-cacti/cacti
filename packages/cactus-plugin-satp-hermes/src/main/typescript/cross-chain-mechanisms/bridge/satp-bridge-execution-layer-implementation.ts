// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import {
  Amount,
  UniqueTokenID,
  Asset,
  FungibleAsset,
  NonFungibleAsset,
  instanceOfFungibleAsset,
  instanceOfNonFungibleAsset,
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
import { BridgeLeafNonFungible } from "./bridge-leaf-non-fungible";
import { BridgeLeaf } from "./bridge-leaf";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { TransactionResponse } from "./bridge-types";

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
  monitorService: MonitorService;
}

enum SATPStageOperations {
  WRAP = "wrapAsset",
  UNWRAP = "unwrapAsset",
  LOCK = "lockAsset",
  UNLOCK = "unlockAsset",
  MINT = "mintAsset",
  BURN = "burnAsset",
  ASSIGN = "assignAsset",
}

export interface IdentifiedTransactionResponse {
  transactionReceipt: TransactionReceipt;
  transactionId: string;
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
  private readonly monitorService: MonitorService;

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
    this.monitorService = this.options.monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );

    this.claimType = options.claimType || ClaimFormat.DEFAULT;

    if (!(this.claimType in options.leafBridge.getSupportedClaimFormats())) {
      throw new ClaimFormatError("Claim not supported by the bridge");
    }
    this.bridgeEndPoint = options.leafBridge;
  }

  private async requestOperationAndProof(
    fnTag: string,
    op: SATPStageOperations,
    asset: Asset,
  ): Promise<IdentifiedTransactionResponse> {
    let bridgeEndPoint: BridgeLeafFungible | BridgeLeafNonFungible;
    if (instanceOfFungibleAsset(asset)) {
      bridgeEndPoint = this.bridgeEndPoint as unknown as BridgeLeafFungible;
    } else if (instanceOfNonFungibleAsset(asset)) {
      bridgeEndPoint = this.bridgeEndPoint as unknown as BridgeLeafNonFungible;
    } else {
      throw new Error(`Operation ${op} not implemented for current asset type`);
    }

    let response: TransactionResponse;

    switch (op) {
      case SATPStageOperations.WRAP:
        response = await bridgeEndPoint.wrapAsset(asset);
        break;
      case SATPStageOperations.UNWRAP:
        response = await bridgeEndPoint.unwrapAsset(asset.id);
        break;
      case SATPStageOperations.LOCK:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).lockAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );
        } else if (instanceOfNonFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafNonFungible).lockAsset(
            asset.id,
            Number(
              (asset as NonFungibleAsset).uniqueDescriptor,
            ) as UniqueTokenID,
          );
        }
        break;
      case SATPStageOperations.UNLOCK:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).unlockAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );
        } else if (instanceOfNonFungibleAsset(asset)) {
          response = await (
            bridgeEndPoint as BridgeLeafNonFungible
          ).unlockAsset(
            asset.id,
            Number(
              (asset as NonFungibleAsset).uniqueDescriptor,
            ) as UniqueTokenID,
          );
        }
        break;
      case SATPStageOperations.MINT:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).mintAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );
        } else if (instanceOfNonFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafNonFungible).mintAsset(
            asset.id,
            (asset as NonFungibleAsset).uniqueDescriptor as UniqueTokenID,
          );
        }
        break;
      case SATPStageOperations.BURN:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).burnAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );
        } else if (instanceOfNonFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafNonFungible).burnAsset(
            asset.id,
            (asset as NonFungibleAsset).uniqueDescriptor as UniqueTokenID,
          );
        }
        break;
      case SATPStageOperations.ASSIGN:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).assignAsset(
            asset.id,
            asset.owner,
            Number((asset as FungibleAsset).amount) as Amount,
          );
        } else if (instanceOfNonFungibleAsset(asset)) {
          response = await (
            bridgeEndPoint as BridgeLeafNonFungible
          ).assignAsset(
            asset.id,
            asset.owner,
            (asset as NonFungibleAsset).uniqueDescriptor as UniqueTokenID,
          );
        }
        break;
      default:
        throw new Error(`Operation ${op} not implemented`);
    }

    if (response!.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await bridgeEndPoint.getReceipt(response!.transactionId!);

    this.log.info(`${fnTag}, proof of ${op}: ${receipt}`);

    const proof = await this.bridgeEndPoint.getProof(asset, this.claimType);

    return {
      transactionReceipt: {
        receipt: receipt,
        proof: proof,
      },
      transactionId: response!.transactionId,
    };
  }

  /**
   * Wraps a fungible or non fungible asset.
   *
   * @param asset - The asset to be wrapped.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset wrapping.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async wrapAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#wrapAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.WRAP,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "wrapAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(error),
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Unwraps a fungible or non fungible asset.
   *
   * @param asset - The asset to be unwrapped.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset unwrapping.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async unwrapAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#unwrapAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.UNWRAP,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "unwrapAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(error),
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Locks a fungible or non fungible asset.
   *
   * @param asset - The asset to be locked.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset locking.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async lockAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#lockAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.LOCK,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "lockAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Unlocks a fungible or non fungible asset.
   *
   * @param asset - The asset to be unlocked.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset unlocking.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async unlockAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#unlockAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.UNLOCK,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "unlockAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Mints a fungible or non fungible asset.
   *
   * @param asset - The asset to be minted.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset minting.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async mintAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#mintAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.MINT,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "mintAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Burns a fungible or non fungible asset.
   * @param asset - The asset to be burned.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset burning.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async burnAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#burnAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.BURN,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "burnAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Assigns a fungible or non fungible asset to a recipient.
   *
   * @param asset - The asset to be assigned.
   * @param recipient - The recipient of the asset.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset assignment.
   * @throws {TransactionIdUndefinedError} If the transaction ID is undefined.
   * @throws {Error} If the asset is non-fungible.
   */
  public async assignAsset(asset: Asset): Promise<TransactionReceipt> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#assignAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      const attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        const transactionArtifacts = await this.requestOperationAndProof(
          fnTag,
          SATPStageOperations.ASSIGN,
          asset,
        );

        const parsedReceipt = JSON.parse(
          transactionArtifacts.transactionReceipt.receipt,
        );

        attributes.senderAddress = parsedReceipt.from;
        attributes.receiverAddress = parsedReceipt.to;
        attributes.internalNetworkTransactionId =
          transactionArtifacts.transactionId;
        attributes.assetId = asset.id;
        attributes.operation = "assignAsset";

        this.monitorService.updateCounter(
          "operation_gas_used",
          parsedReceipt.gas,
          attributes,
        );

        return {
          receipt: transactionArtifacts.transactionReceipt.receipt,
          proof: transactionArtifacts.transactionReceipt.proof,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
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
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#verifyAssetExistence()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        //todo: implement this
        throw new Error("Not implemented");
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
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
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#verifyLockAsset()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        //todo: implement this
        throw new Error("Not implemented");
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
