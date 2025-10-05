/**
 * @fileoverview
 * SATP Bridge Execution Layer implementation for cross-chain asset operations.
 *
 * @description
 * This module provides the concrete implementation of the SATP Bridge Execution Layer,
 * which serves as the primary interface for executing cross-chain asset operations
 * within the SATP Hermes framework. The execution layer orchestrates asset management
 * operations across different blockchain networks while maintaining SATP protocol
 * compliance and atomic transaction semantics.
 *
 * **Core Execution Layer Responsibilities:**
 * - Asset wrapping and unwrapping operations across chains
 * - Asset locking and unlocking for cross-chain transfers
 * - Asset minting and burning for bridge representations
 * - Asset assignment and ownership transfer operations
 * - Transaction receipt generation and proof management
 * - Gateway session data integration and processing
 * - Smart contract output processing and validation
 *
 * **SATP Protocol Integration:**
 * The execution layer implements IETF SATP Core v2 specification requirements for
 * cross-chain asset operations, including atomic transfers, cryptographic proof
 * generation, rollback mechanisms, and distributed transaction coordination.
 *
 * **Bridge Architecture Integration:**
 * - Gateway session data injection for transaction parameters
 * - Bridge leaf orchestration for blockchain-specific operations
 * - Claim format management for cross-chain proofs
 * - Monitoring and observability integration
 * - Error handling and transaction rollback support
 *
 * @example
 * Basic execution layer setup:
 * ```typescript
 * const executionLayer = new SATPBridgeExecutionLayerImpl({
 *   leafBridge: ethereumLeaf,
 *   claimType: ClaimFormat.BUNGEE,
 *   logLevel: 'debug',
 *   monitorService: monitoringService
 * });
 *
 * // Wrap asset for cross-chain transfer
 * const asset: FungibleAsset = {
 *   id: 'usdc-token-123',
 *   referenceId: 'original-usdc-456',
 *   type: TokenType.ERC20,
 *   owner: '0x123...',
 *   contractName: 'USDC',
 *   network: { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },
 *   amount: '1000.0'
 * };
 *
 * const wrapReceipt = await executionLayer.wrapAsset(asset);
 * console.log('Asset wrapped:', wrapReceipt.transactionId);
 * console.log('Proof generated:', wrapReceipt.proof);
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPBridgeExecutionLayer} for execution layer interface
 * @see {@link BridgeLeaf} for bridge leaf implementations
 * @see {@link Asset} for asset data structures
 * @see {@link TransactionReceipt} for transaction receipt format
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

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
 * Configuration options for the SATP Bridge Execution Layer implementation.
 *
 * @description
 * Defines the configuration parameters required to initialize the SATP Bridge
 * Execution Layer implementation. These options control the bridge behavior,
 * logging, claim format handling, and monitoring integration.
 *
 * **Configuration Components:**
 * - Bridge leaf instance for blockchain-specific operations
 * - Claim format specification for cross-chain proofs
 * - Logging configuration for debugging and monitoring
 * - Monitoring service integration for observability
 *
 * @example
 * Basic configuration:
 * ```typescript
 * const options: ISATPBridgeExecutionLayerImplOptions = {
 *   leafBridge: ethereumLeaf,
 *   claimType: ClaimFormat.BUNGEE,
 *   logLevel: 'info',
 *   monitorService: monitoringService
 * };
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link BridgeLeaf} for bridge leaf implementations
 * @see {@link ClaimFormat} for supported claim formats
 * @see {@link MonitorService} for monitoring integration
 */
export interface ISATPBridgeExecutionLayerImplOptions {
  /** Bridge leaf instance providing blockchain-specific asset operations */
  leafBridge: BridgeLeaf;
  /** Claim format type for cross-chain proof generation (default: DEFAULT) */
  claimType?: ClaimFormat;
  /** Log level for debugging and monitoring (default: INFO) */
  logLevel?: LogLevelDesc;
  /** Monitoring service for observability and metrics collection */
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
 * Concrete implementation of the SATP Bridge Execution Layer interface.
 *
 * @description
 * Provides the complete implementation of cross-chain asset operations within
 * the SATP bridge architecture. This class orchestrates asset management
 * operations across different blockchain networks, ensuring SATP protocol
 * compliance, atomic transaction execution, and proper error handling.
 *
 * **Core Execution Capabilities:**
 * - Asset wrapping and unwrapping with proof generation
 * - Asset locking and unlocking for cross-chain transfers
 * - Asset minting and burning for bridge representations
 * - Asset assignment and ownership transfers
 * - Transaction receipt processing and validation
 * - Cross-chain proof generation and verification
 * - Bridge leaf orchestration and coordination
 *
 * **SATP Protocol Compliance:**
 * - Implements IETF SATP Core v2 specification requirements
 * - Maintains atomic transaction semantics across chains
 * - Provides cryptographic proof generation for operations
 * - Supports rollback mechanisms for failed transfers
 * - Ensures consistent state across distributed operations
 *
 * **Integration Features:**
 * - Bridge leaf abstraction for blockchain compatibility
 * - Claim format management for different proof types
 * - Monitoring and observability integration
 * - Comprehensive error handling and logging
 * - Transaction receipt standardization
 *
 * @example
 * Complete asset transfer workflow:
 * ```typescript
 * const executionLayer = new SATPBridgeExecutionLayerImpl({
 *   leafBridge: ethereumLeaf,
 *   claimType: ClaimFormat.BUNGEE,
 *   logLevel: 'debug',
 *   monitorService: monitoringService
 * });
 *
 * // Source chain: Lock asset
 * const lockReceipt = await executionLayer.lockAsset(sourceAsset, 1000);
 * console.log('Asset locked:', lockReceipt.transactionId);
 *
 * // Destination chain: Mint equivalent asset
 * const mintReceipt = await executionLayer.mintAsset(targetAsset, 1000);
 * console.log('Asset minted:', mintReceipt.transactionId);
 *
 * // Verify both operations with proofs
 * console.log('Lock proof:', lockReceipt.proof);
 * console.log('Mint proof:', mintReceipt.proof);
 * ```
 *
 * @implements {SATPBridgeExecutionLayer}
 * @since 0.0.3-beta
 * @see {@link SATPBridgeExecutionLayer} for interface definition
 * @see {@link BridgeLeaf} for bridge leaf implementations
 * @see {@link TransactionReceipt} for receipt format
 */
export class SATPBridgeExecutionLayerImpl implements SATPBridgeExecutionLayer {
  public static readonly CLASS_NAME = "SATPBridgeExecutionLayerImpl";

  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly bridgeEndPoint: BridgeLeaf;
  private readonly claimType: ClaimFormat;
  private readonly monitorService: MonitorService;

  /**
   * Creates a new SATP Bridge Execution Layer implementation instance.
   *
   * @description
   * Initializes the execution layer with the specified configuration options,
   * including bridge leaf integration, claim format validation, logging setup,
   * and monitoring service registration. The constructor validates that the
   * specified claim format is supported by the provided bridge leaf.
   *
   * **Initialization Process:**
   * - Validates claim format compatibility with bridge leaf
   * - Sets up logging configuration with specified level
   * - Initializes monitoring service integration
   * - Configures bridge endpoint for asset operations
   * - Prepares execution context for cross-chain operations
   *
   * @param options - Configuration options for the execution layer
   * @throws {ClaimFormatError} When claim format is not supported by bridge leaf
   *
   * @example
   * Creating execution layer with Ethereum bridge:
   * ```typescript
   * const executionLayer = new SATPBridgeExecutionLayerImpl({
   *   leafBridge: ethereumLeaf,
   *   claimType: ClaimFormat.BUNGEE,
   *   logLevel: 'debug',
   *   monitorService: monitoringService
   * });
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link ISATPBridgeExecutionLayerImplOptions} for configuration options
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
  /**\n   * Wraps a fungible asset into the bridge wrapper contract for cross-chain operations.\n   *\n   * @description\n   * Encapsulates a fungible asset within the bridge wrapper contract, enabling it to\n   * participate in cross-chain transfer operations. This operation transfers custody\n   * of the original asset to the bridge while creating a bridge-managed representation\n   * that can be transferred across blockchain networks.\n   *\n   * **Asset Wrapping Process:**\n   * - Validates asset is fungible and has required properties\n   * - Transfers asset custody to bridge wrapper contract\n   * - Creates bridge-managed asset representation\n   * - Generates transaction receipt with proof for cross-chain verification\n   * - Records wrapping metadata for asset tracking\n   *\n   * **Cross-Chain Integration:**\n   * The wrapped asset becomes eligible for cross-chain transfers, with the wrapping\n   * proof serving as verification for the asset's existence and custody on the\n   * source blockchain network.\n   *\n   * @param asset - Fungible asset to be wrapped with amount and ownership details\n   * @returns Promise resolving to transaction receipt with wrapping proof\n   *\n   * @throws {TransactionIdUndefinedError} When transaction ID is missing from response\n   * @throws {Error} When asset is non-fungible (not supported for wrapping)\n   * @throws {WrapperContractError} When bridge wrapper contract interaction fails\n   *\n   * @example\n   * Wrapping ERC-20 token for cross-chain transfer:\n   * ```typescript\n   * const usdcAsset: FungibleAsset = {\n   *   id: 'usdc-bridge-123',\n   *   referenceId: 'usdc-ethereum-456',\n   *   type: TokenType.ERC20,\n   *   owner: '0x123...',\n   *   contractName: 'USDC',\n   *   network: { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },\n   *   amount: '1500.0'\n   * };\n   *\n   * const wrapReceipt = await executionLayer.wrapAsset(usdcAsset);\n   * console.log('Wrapped transaction:', wrapReceipt.transactionId);\n   * console.log('Cross-chain proof:', wrapReceipt.proof);\n   * \n   * // Asset is now ready for cross-chain transfer\n   * ```\n   *\n   * @since 2.0.0\n   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1\n   * @see {@link FungibleAsset} for asset data structure\n   * @see {@link TransactionReceipt} for receipt format\n   * @see {@link unwrapAsset} for asset unwrapping operations\n   */
  /**\n   * Wraps a fungible asset into the bridge wrapper contract for cross-chain operations.\n   *\n   * @description\n   * Encapsulates a fungible asset within the bridge wrapper contract, enabling it to\n   * participate in cross-chain transfer operations. This operation transfers custody\n   * of the original asset to the bridge while creating a bridge-managed representation\n   * that can be transferred across blockchain networks.\n   *\n   * **Asset Wrapping Process:**\n   * - Validates asset is fungible and has required properties\n   * - Transfers asset custody to bridge wrapper contract\n   * - Creates bridge-managed asset representation\n   * - Generates transaction receipt with proof for cross-chain verification\n   * - Records wrapping metadata for asset tracking\n   *\n   * **Cross-Chain Integration:**\n   * The wrapped asset becomes eligible for cross-chain transfers, with the wrapping\n   * proof serving as verification for the asset's existence and custody on the\n   * source blockchain network.\n   *\n   * @param asset - Fungible asset to be wrapped with amount and ownership details\n   * @returns Promise resolving to transaction receipt with wrapping proof\n   *\n   * @throws {TransactionIdUndefinedError} When transaction ID is missing from response\n   * @throws {Error} When asset is non-fungible (not supported for wrapping)\n   * @throws {WrapperContractError} When bridge wrapper contract interaction fails\n   *\n   * @example\n   * Wrapping ERC-20 token for cross-chain transfer:\n   * ```typescript\n   * const usdcAsset: FungibleAsset = {\n   *   id: 'usdc-bridge-123',\n   *   referenceId: 'usdc-ethereum-456',\n   *   type: TokenType.ERC20,\n   *   owner: '0x123...',\n   *   contractName: 'USDC',\n   *   network: { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },\n   *   amount: '1500.0'\n   * };\n   *\n   * const wrapReceipt = await executionLayer.wrapAsset(usdcAsset);\n   * console.log('Wrapped transaction:', wrapReceipt.transactionId);\n   * console.log('Cross-chain proof:', wrapReceipt.proof);\n   * \n   * // Asset is now ready for cross-chain transfer\n   * ```\n   *\n   * @since 0.0.3-beta\n   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1\n   * @see {@link FungibleAsset} for asset data structure\n   * @see {@link TransactionReceipt} for receipt format\n   * @see {@link unwrapAsset} for asset unwrapping operations\n   */
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
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    const fnTag = `${SATPBridgeExecutionLayerImpl.CLASS_NAME}#verifyAssetExistence()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag}, Verifying asset existence for assetId: ${assetId}`,
        );
        this.log.debug(
          `${fnTag}, invocationType: ${JSON.stringify(invocationType)}`,
        );
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
