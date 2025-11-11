/**
 * @fileoverview
 * Ethereum-specific bridge leaf implementation for SATP Hermes cross-chain operations.
 *
 * @description
 * This module provides a complete Ethereum blockchain integration for the SATP bridge
 * architecture, implementing both fungible and non-fungible asset operations. The
 * EthereumLeaf class serves as a concrete implementation of bridge leaf interfaces,
 * providing Ethereum-specific logic for asset management, smart contract interactions,
 * and cross-chain transfer operations.
 *
 * **Core Ethereum Integration Features:**
 * - Ethereum ledger connector integration with Web3 support
 * - ERC-20 and ERC-721 asset wrapper contract deployment
 * - Gas optimization and transaction configuration management
 * - Ethereum-specific signing credential handling
 * - Smart contract interaction with SATP wrapper contracts
 * - Cross-chain proof generation using Bungee Hermes plugin
 * - OpenTelemetry monitoring and distributed tracing
 * - Comprehensive error handling and transaction validation
 *
 * **SATP Protocol Compliance:**
 * The implementation follows IETF SATP Core v2 specification requirements for
 * Ethereum-based cross-chain asset transfers, including atomic operations,
 * cryptographic proof generation, and secure asset custody management.
 *
 * **Asset Management Operations:**
 * - Asset wrapping and unwrapping with metadata preservation
 * - Asset locking and unlocking for cross-chain transfers
 * - Asset minting and burning for bridge representations
 * - Asset assignment and ownership transfer operations
 * - Batch asset operations and transaction optimization
 *
 * @example
 * Basic Ethereum leaf configuration:
 * ```typescript
 * const ethereumOptions: IEthereumLeafOptions = {
 *   networkIdentification: {
 *     id: 'ethereum-mainnet',
 *     ledgerType: LedgerType.Ethereum
 *   },
 *   signingCredential: {
 *     ethAccount: '0x123...',
 *     secret: 'private-key-hex',
 *     type: Web3SigningCredentialType.PrivateKeyHex
 *   },
 *   connectorOptions: {
 *     rpcApiHttpHost: 'https://mainnet.infura.io/v3/...',
 *     rpcApiWsHost: 'wss://mainnet.infura.io/ws/v3/...',
 *     pluginRegistry: registry
 *   },
 *   gasConfig: {
 *     gasPrice: '20000000000', // 20 gwei
 *     gasLimit: 6000000
 *   }
 * };
 *
 * const ethereumLeaf = new EthereumLeaf(
 *   ethereumOptions,
 *   ontologyManager,
 *   monitorService
 * );
 *
 * // Deploy wrapper contracts
 * await ethereumLeaf.deployContracts();
 *
 * // Wrap ERC-20 asset for cross-chain transfer
 * const asset: EvmAsset = {
 *   id: 'usdc-token-123',
 *   contractAddress: '0xA0b86a33E...',
 *   amount: '1000.0',
 *   owner: '0x789abc...',
 *   type: TokenType.ERC20
 * };
 *
 * const wrapResult = await ethereumLeaf.wrapAsset(asset);
 * console.log(`Asset wrapped: ${wrapResult.transactionId}`);
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link https://ethereum.org/en/developers/docs/} Ethereum Development Documentation
 * @see {@link BridgeLeafFungible} for fungible asset interface
 * @see {@link BridgeLeafNonFungible} for non-fungible asset interface
 * @see {@link PluginLedgerConnectorEthereum} for Ethereum connector
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { IEthereumLeafOptions, TransactionResponse } from "../bridge-types";
import {
  EthContractInvocationType,
  GasTransactionConfig,
  InvokeRawWeb3EthMethodV1Request,
  IPluginLedgerConnectorEthereumOptions,
  isWeb3SigningCredentialNone,
  PluginLedgerConnectorEthereum,
  RunTransactionResponse,
  Web3SigningCredentialCactiKeychainRef,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialPrivateKeyHex,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyEthereum } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-ethereum";
import {
  EvmAsset,
  EvmFungibleAsset,
  EvmNonFungibleAsset,
} from "../ontology/assets/evm-asset";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../../core/satp-logger";
import { v4 as uuidv4 } from "uuid";
import {
  ClaimFormat,
  TokenType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { OntologyManager } from "../ontology/ontology-manager";
import { Web3TransactionReceipt } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { BridgeLeafFungible } from "../bridge-leaf-fungible";
import { BridgeLeafNonFungible } from "../bridge-leaf-non-fungible";
import { BridgeLeaf } from "../bridge-leaf";
import {
  ApproveAddressError,
  BungeeError,
  ClaimFormatError,
  ConnectorOptionsError,
  ContractAddressError,
  InvalidWrapperContract,
  NoSigningCredentialError,
  ProofError,
  ReceiptError,
  TransactionError,
  TransactionReceiptError,
  UnsupportedNetworkError,
  WrapperContractAlreadyCreatedError,
  WrapperContractError,
} from "../../common/errors";
import { ISignerKeyPair } from "@hyperledger/cactus-common";
import SATPWrapperContract from "../../../../solidity/generated/SATPWrapperContract.sol/SATPWrapperContract.json";
import { Asset, UniqueTokenID, Amount } from "../ontology/assets/asset";
import { TokenResponse } from "../../../generated/SATPWrapperContract";
import { NetworkId } from "../../../public-api";
import { getEnumKeyByValue } from "../../../services/utils";
import { getUint8Key } from "./leafs-utils";
import { MonitorService } from "../../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

/**
 * Represents the response from an Ethereum transaction.
 *
 * @interface EthereumResponse
 *
 * @property {boolean} success - Indicates whether the transaction was successful.
 * @property {RunTransactionResponse} out - The detailed response of the executed transaction.
 * @property {unknown} callOutput - The output of the call, which can be of any type.
 */
interface EthereumResponse {
  success: boolean;
  out: RunTransactionResponse;
  callOutput: unknown;
}

/**
 * Represents an Ethereum leaf in a cross-chain bridge mechanism.
 *
 * This class extends the `BridgeLeaf` class and implements the `BridgeLeafFungible` and `BridgeLeafNonFungible` interfaces.
 * It provides methods for deploying wrapper contracts, wrapping and unwrapping assets, locking and unlocking assets,
 * minting and burning assets, assigning assets, and retrieving asset information.
 *
 * @class EthereumLeaf
 * @extends BridgeLeaf
 * @implements BridgeLeafFungible
 * @implements BridgeLeafNonFungible
 *
 * @property {Logger} log - The logger instance for logging messages.
 * @property {LogLevelDesc} logLevel - The log level for the logger.
 * @property {string} id - The unique identifier for the Ethereum leaf.
 * @property {NetworkId} networkIdentification - The network identification details.
 * @property {ISignerKeyPairs} keyPair - The key pair used for signing transactions.
 * @property {PluginLedgerConnectorEthereum} connector - The Ethereum ledger connector plugin instance.
 * @property {PluginBungeeHermes} [bungee] - The Bungee Hermes plugin instance for Bungee claim format.
 * @property {ClaimFormat} claimFormat - The claim format used for the Ethereum leaf.
 * @property {OntologyManager} ontologyManager - The ontology manager instance.
 * @property {Web3SigningCredentialPrivateKeyHex | Web3SigningCredentialGethKeychainPassword | Web3SigningCredentialCactiKeychainRef} signingCredential - The credential used for signing transactions.
 * @property {number} gas - The gas limit for transactions.
 * @property {Web3TransactionReceipt} [wrapperFungibleDeployReceipt] - The receipt of the deployed fungible wrapper contract.
 * @property {string} [wrapperContractAddress] - The address of the wrapper contract.
 * @property {string} [wrapperContractName] - The name of the wrapper contract.
 */
export class EthereumLeaf
  extends BridgeLeaf
  implements BridgeLeafFungible, BridgeLeafNonFungible
{
  /**
   * Static class identifier used for logging, error reporting, and debugging.
   *
   * @static
   * @readonly
   * @type {string}
   */
  public static readonly CLASS_NAME = "EthereumLeaf";

  /**
   * Logger instance for capturing debug, info, warn, and error messages throughout
   * the Ethereum leaf lifecycle.
   *
   * @description
   * Configured with class-specific labeling and log level from options.
   * Integrates with OpenTelemetry monitoring for distributed tracing support.
   *
   * @protected
   * @readonly
   * @type {Logger}
   */
  protected readonly log: Logger;

  /**
   * Logging verbosity level controlling which messages are captured and output.
   *
   * @description
   * Determines the minimum severity level for log messages. Supports standard
   * log levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL. Defaults to 'INFO'
   * if not specified in constructor options.
   *
   * @protected
   * @readonly
   * @type {LogLevelDesc}
   */
  protected readonly logLevel: LogLevelDesc;

  /**
   * Unique identifier for this Ethereum bridge leaf instance.
   *
   * @description
   * Used for instance identification in multi-leaf deployments, monitoring,
   * and logging contexts. Generated automatically from CLASS_NAME if not
   * provided in options, or uses custom leafId from configuration.
   *
   * @protected
   * @readonly
   * @type {string}
   */
  protected readonly id: string;

  /**
   * Network identification information including network ID and ledger type.
   *
   * @description
   * Specifies the target Ethereum network (mainnet, testnet, private) and
   * confirms the ledger type is Ethereum. Used for network-specific operations
   * and cross-chain protocol routing.
   *
   * @protected
   * @readonly
   * @type {NetworkId}
   */
  protected readonly networkIdentification: NetworkId;

  /**
   * Cryptographic key pair used for signing operations and identity verification.
   *
   * @description
   * Secp256k1 key pair used for cryptographic proof generation, identity
   * verification, and secure communication. Generated automatically if not
   * provided in constructor options.
   *
   * @protected
   * @readonly
   * @type {ISignerKeyPair}
   */
  protected readonly keyPair: ISignerKeyPair;

  /**
   * Ethereum ledger connector plugin instance for blockchain interactions.
   *
   * @description
   * Primary interface for executing transactions, deploying contracts, and
   * querying blockchain state on Ethereum networks. Configured with RPC
   * endpoints and authentication credentials during initialization.
   *
   * @protected
   * @readonly
   * @type {PluginLedgerConnectorEthereum}
   */
  protected readonly connector: PluginLedgerConnectorEthereum;

  /**
   * Optional Bungee Hermes plugin for advanced cryptographic proof generation.
   *
   * @description
   * Initialized only when BUNGEE claim format is specified in configuration.
   * Provides enhanced proof generation capabilities for cross-chain asset
   * verification and state consistency validation.
   *
   * @protected
   * @type {PluginBungeeHermes | undefined}
   */
  protected bungee?: PluginBungeeHermes;

  /**
   * Array of supported claim formats for cross-chain proof generation.
   *
   * @description
   * Specifies which proof generation mechanisms this leaf supports.
   * Always includes DEFAULT format, with optional BUNGEE format for
   * enhanced cryptographic proofs. Used to determine available proof types
   * for cross-chain operations.
   *
   * @protected
   * @readonly
   * @type {ClaimFormat[]}
   */
  protected readonly claimFormats: ClaimFormat[];

  /**
   * Ontology manager instance for asset metadata and interaction management.
   *
   * @description
   * Manages asset definitions, metadata schemas, and interaction patterns
   * for cross-chain operations. Provides standardized asset representation
   * and validation across different blockchain networks.
   *
   * @protected
   * @readonly
   * @type {OntologyManager}
   */
  protected readonly ontologyManager: OntologyManager;

  /**
   * Web3 signing credential for transaction authorization and smart contract interactions.
   *
   * @description
   * Cryptographic credential used to sign Ethereum transactions. Supports multiple
   * credential types including private keys, keychain references, and Geth keychain
   * passwords. Must not be Web3SigningCredentialNone type.
   *
   * @private
   * @readonly
   * @type {Web3SigningCredentialPrivateKeyHex | Web3SigningCredentialGethKeychainPassword | Web3SigningCredentialCactiKeychainRef}
   */
  private readonly signingCredential:
    | Web3SigningCredentialPrivateKeyHex
    | Web3SigningCredentialGethKeychainPassword
    | Web3SigningCredentialCactiKeychainRef;

  /**
   * Optional gas configuration for transaction cost optimization.
   *
   * @description
   * Specifies gas price and gas limit parameters for Ethereum transactions.
   * If undefined, the connector will use network defaults or dynamic estimation.
   * Critical for cost control in production deployments.
   *
   * @private
   * @readonly
   * @type {GasTransactionConfig | undefined}
   */
  private readonly gasConfig: GasTransactionConfig | undefined;

  private wrapperDeployReceipt: Web3TransactionReceipt | undefined;
  /**
   * Transaction receipt from fungible wrapper contract deployment.
   *
   * @description
   * Contains deployment transaction details including contract address,
   * gas used, and transaction hash. Set during deployFungibleWrapperContract()
   * execution and used for contract verification and debugging.
   *
   * @private
   * @type {Web3TransactionReceipt | undefined}
   */
  private wrapperFungibleDeployReceipt: Web3TransactionReceipt | undefined;

  /**
   * Ethereum address of the deployed or referenced SATP wrapper contract.
   *
   * @description
   * Contract address used for all asset wrapping, locking, minting, and burning
   * operations. Set during contract deployment or provided in constructor options.
   * Required for all smart contract interactions.
   *
   * @private
   * @type {string | undefined}
   */
  private wrapperContractAddress: string | undefined;

  /**
   * Human-readable name of the SATP wrapper contract.
   *
   * @description
   * Contract identifier used for logging, debugging, and contract management.
   * Set during contract deployment or provided in constructor options.
   * Used in conjunction with wrapperContractAddress for contract operations.
   *
   * @private
   * @type {string | undefined}
   */
  private wrapperContractName: string | undefined;

  /**
   * Monitoring service instance for OpenTelemetry tracing and metrics collection.
   *
   * @description
   * Provides distributed tracing capabilities for monitoring cross-chain operations,
   * performance metrics, and error tracking. Integrates with OpenTelemetry ecosystem
   * for comprehensive observability.
   *
   * @private
   * @readonly
   * @type {MonitorService}
   */
  private readonly monitorService: MonitorService;

  /**
   * Constructs a new instance of the EthereumLeaf class for SATP cross-chain operations.
   *
   * @description
   * Initializes an Ethereum-specific bridge leaf with comprehensive configuration validation,
   * connector setup, and optional Bungee Hermes integration for advanced proof generation.
   * The constructor performs extensive validation to ensure all required components are
   * properly configured for secure cross-chain asset operations.
   *
   * **Initialization Process:**
   * 1. **Network Validation**: Ensures network type is Ethereum
   * 2. **Credential Validation**: Verifies signing credentials are provided
   * 3. **Connector Setup**: Initializes Ethereum ledger connector
   * 4. **Contract Configuration**: Validates wrapper contract parameters
   * 5. **Claim Format Setup**: Configures proof generation mechanisms
   * 6. **Monitoring Integration**: Establishes OpenTelemetry tracing
   *
   * **Security Considerations:**
   * - Validates signing credentials are not of type Web3SigningCredentialNone
   * - Ensures connector options include required pluginRegistry
   * - Performs wrapper contract configuration consistency checks
   * - Initializes Bungee Hermes with proper key pair encoding
   *
   * @constructor
   * @param {IEthereumLeafOptions} options - Complete configuration options for the Ethereum leaf
   * @param {OntologyManager} ontologyManager - Asset ontology and metadata management service
   * @param {MonitorService} monitorService - OpenTelemetry monitoring and tracing service
   *
   * @throws {UnsupportedNetworkError} When network type is not LedgerType.Ethereum
   * @throws {NoSigningCredentialError} When signing credential is Web3SigningCredentialNone or missing
   * @throws {ConnectorOptionsError} When connector options are incomplete or invalid
   * @throws {InvalidWrapperContract} When wrapper contract configuration is inconsistent
   * @throws {ClaimFormatError} When an unsupported claim format is specified
   *
   * @example
   * Basic Ethereum leaf initialization:
   * ```typescript
   * const ethereumOptions: IEthereumLeafOptions = {
   *   networkIdentification: {
   *     id: 'ethereum-mainnet',
   *     ledgerType: LedgerType.Ethereum
   *   },
   *   signingCredential: {
   *     ethAccount: '0x1234567890123456789012345678901234567890',
   *     secret: '0xabcdef...',
   *     type: Web3SigningCredentialType.PrivateKeyHex
   *   },
   *   connectorOptions: {
   *     rpcApiHttpHost: 'https://mainnet.infura.io/v3/PROJECT_ID',
   *     pluginRegistry: registry
   *   },
   *   gasConfig: {
   *     gasPrice: '20000000000',
   *     gasLimit: 6000000
   *   },
   *   claimFormats: [ClaimFormat.BUNGEE, ClaimFormat.DEFAULT]
   * };
   *
   * const ethereumLeaf = new EthereumLeaf(
   *   ethereumOptions,
   *   ontologyManager,
   *   monitorService
   * );
   * ```
   *
   * @example
   * Pre-deployed wrapper contract initialization:
   * ```typescript
   * const ethereumOptions: IEthereumLeafOptions = {
   *   // ... network and credential configuration
   *   wrapperContractName: 'MainnetSATPWrapper',
   *   wrapperContractAddress: '0x742d35Cc6634C0532925a3b8D4C2d4a8b1b8B1b8',
   *   // ... other options
   * };
   *
   * const ethereumLeaf = new EthereumLeaf(
   *   ethereumOptions,
   *   ontologyManager,
   *   monitorService
   * );
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link IEthereumLeafOptions} for complete configuration options
   * @see {@link OntologyManager} for asset ontology management
   * @see {@link MonitorService} for monitoring and tracing
   */
  constructor(
    public readonly options: IEthereumLeafOptions,
    ontologyManager: OntologyManager,
    monitorService: MonitorService,
  ) {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#constructor()`;
    super();
    const label = EthereumLeaf.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.monitorService = monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );
    this.log.debug(
      `${EthereumLeaf.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (options.networkIdentification.ledgerType !== LedgerType.Ethereum) {
      throw new UnsupportedNetworkError(
        `${EthereumLeaf.CLASS_NAME}#constructor, supports only Ethereum networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(EthereumLeaf.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    if (!this.isFullPluginOptions(options.connectorOptions)) {
      throw new ConnectorOptionsError(
        "Invalid options provided to the FabricLeaf constructor. Please provide a valid IPluginLedgerConnectorEthereumOptions object.",
      );
    }

    this.connector = new PluginLedgerConnectorEthereum(
      options.connectorOptions as IPluginLedgerConnectorEthereumOptions,
    );

    this.ontologyManager = ontologyManager;

    if (isWeb3SigningCredentialNone(options.signingCredential)) {
      throw new NoSigningCredentialError(
        `${EthereumLeaf.CLASS_NAME}#constructor, options.signingCredential`,
      );
    }
    this.signingCredential = options.signingCredential;

    this.gasConfig = options.gasConfig;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    context.with(ctx, () => {
      try {
        for (const claim of this.claimFormats) {
          switch (claim) {
            case ClaimFormat.BUNGEE:
              {
                this.bungee = new PluginBungeeHermes({
                  instanceId: uuidv4(),
                  pluginRegistry: (
                    options.connectorOptions as IPluginLedgerConnectorEthereumOptions
                  ).pluginRegistry,
                  keyPair: getUint8Key(this.keyPair),
                  logLevel: this.logLevel,
                });
                this.bungee.addStrategy(
                  this.options.networkIdentification.id,
                  new StrategyEthereum(this.logLevel),
                );
              }
              break;
            case ClaimFormat.DEFAULT:
              break;
            default:
              throw new ClaimFormatError(
                `Claim format not supported: ${claim}`,
              );
          }
        }

        if (options.wrapperContractAddress && options.wrapperContractName) {
          this.wrapperContractAddress = options.wrapperContractAddress;
          this.wrapperContractName = options.wrapperContractName;
        } else if (
          !options.wrapperContractAddress &&
          !options.wrapperContractName
        ) {
          this.log.debug(
            `${EthereumLeaf.CLASS_NAME}#constructor, No wrapper contract provided, creation required`,
          );
        } else {
          throw new InvalidWrapperContract(
            `${EthereumLeaf.CLASS_NAME}#constructor, Contract Name or Contract Address missing`,
          );
        }
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
   * Retrieves the approve address for a specified asset type.
   *
   * @param assetType - The type of the asset for which the approve address is to be retrieved.
   *                     It can be either "Fungible" or "NonFungible".
   * @returns {string} The approve address for the specified asset type.
   * @throws {ApproveAddressError} If the bridge ID is not available for "Fungible" assets,
   *                               or if the asset type is invalid or not implemented.
   *
   * @example
   * ```typescript
   * const approveAddress = fabricLeaf.getApproveAddress("Fungible");
   * console.log(approveAddress); // Output: Bridge ID for fungible assets
   * ```
   */
  public getApproveAddress(assetType: TokenType): string {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#getApproveAddress`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Approve Address for asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
        );
        switch (assetType) {
          case TokenType.NONSTANDARD_FUNGIBLE:
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            if (!this.wrapperContractAddress) {
              throw new ApproveAddressError(
                `${fnTag}, Wrapper Contract Address not available for approving address`,
              );
            }
            return this.wrapperContractAddress;
          default:
            throw new ApproveAddressError(
              `${fnTag}, Invalid asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
            );
        }
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
   * Deploys the necessary contracts for the Ethereum leaf.
   *
   * This method deploys the wrapper contract and may deploy other needed contracts. The deployments are
   * executed in parallel using `Promise.all`.
   *
   * @returns {Promise<void>} A promise that resolves when all contracts are deployed.
   */
  public async deployContracts(): Promise<void> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#deployContracts`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        await Promise.all([this.deployWrapperContract()]);
      } catch (err) {
        if (err instanceof WrapperContractAlreadyCreatedError) {
          this.log.debug(
            `${fnTag}, Wrapper contracts already exist, skipping deployment`,
          );
          span.setStatus({ code: SpanStatusCode.OK });
        } else {
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
          span.recordException(err);
        }
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Retrieves the deployment receipt of the wrapper contract.
   *
   * @returns {Web3TransactionReceipt} The transaction receipt of the deployed wrapper contract.
   * @throws {ReceiptError} If the wrapper contract has not been deployed.
   */
  public getDeployWrapperContractReceipt(): Web3TransactionReceipt {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#getDeployFungibleWrapperContractReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        if (!this.wrapperDeployReceipt) {
          throw new ReceiptError(
            `${EthereumLeaf.CLASS_NAME}#getDeployWrapperContractReceipt() Wrapper Contract Not deployed`,
          );
        }
        return this.wrapperDeployReceipt;
      } catch (err) {
        if (err instanceof WrapperContractAlreadyCreatedError) {
          this.log.debug(
            `${fnTag}, Wrapper contracts already exist, skipping deployment`,
          );
          span.setStatus({ code: SpanStatusCode.OK });
        } else {
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
          span.recordException(err);
        }
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Deploys a wrapper contract.
   *
   * @param {string} [contractName] - The name of the contract to be deployed.
   * @returns {Promise<void>} A promise that resolves when the contract is deployed.
   * @throws {WrapperContractError} If the wrapper contract is already created.
   * @throws {TransactionReceiptError} If the deployment transaction receipt is not found.
   * @throws {ContractAddressError} If the contract address is not found in the deployment receipt.
   */
  public async deployWrapperContract(contractName?: string): Promise<void> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#deployWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Wrapper Contract`);

        if (this.wrapperContractAddress && this.wrapperContractName) {
          throw new WrapperContractAlreadyCreatedError(fnTag);
        }

        this.wrapperContractName =
          contractName || `${this.id}-wrapper-contract`;

        const deployOutWrapperContract = await this.connector.deployContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
          },
          constructorArgs: [this.signingCredential.ethAccount],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        });

        if (!deployOutWrapperContract.transactionReceipt) {
          throw new TransactionReceiptError(
            `${fnTag}, Wrapper Contract deployment failed: ${safeStableStringify(deployOutWrapperContract)}`,
          );
        }

        if (!deployOutWrapperContract.transactionReceipt.contractAddress) {
          throw new ContractAddressError(
            `${fnTag}, Wrapper Contract address not found in deploy receipt: ${safeStableStringify(deployOutWrapperContract.transactionReceipt)}`,
          );
        }

        this.wrapperDeployReceipt = deployOutWrapperContract.transactionReceipt;

        this.wrapperContractAddress =
          deployOutWrapperContract.transactionReceipt.contractAddress;

        this.log.debug(
          `${fnTag}, Wrapper Contract deployed receipt: ${safeStableStringify(deployOutWrapperContract.transactionReceipt)}`,
        );
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
   * Retrieves the contract address of the wrapper contract.
   *
   * @param {string} type - The type of the wrapper contract.
   * @returns {unknown} The contract address of the wrapper contract.
   * @throws {InvalidWrapperContract} If the wrapper contract type is invalid.
   */
  public getWrapperContract(type: TokenType): string {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(`${fnTag}, Getting Wrapper Contract Address`);
        switch (type) {
          case TokenType.NONSTANDARD_FUNGIBLE:
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            if (!this.wrapperContractAddress) {
              throw new WrapperContractError(
                `${fnTag}, Wrapper Contract not deployed`,
              );
            }
            return this.wrapperContractAddress;
          default:
            throw new Error("Invalid type");
        }
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
   * Wraps an asset.
   *
   * @param {EvmAsset} asset - The asset to be wrapped.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async wrapAsset(asset: Asset): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#wrapAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const evmAsset = asset as EvmAsset;
        this.log.debug(
          `${fnTag}, Wrapping Asset: {${evmAsset.id}, ${evmAsset.owner}, ${evmAsset.contractAddress}, ${evmAsset.type}}`,
        );

        const interactions = this.ontologyManager.getOntologyInteractions(
          LedgerType.Ethereum,
          evmAsset.referenceId,
        );

        switch (asset.type) {
          case TokenType.NONSTANDARD_FUNGIBLE:
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            if (!this.wrapperContractName || !this.wrapperContractAddress) {
              throw new WrapperContractError(
                `${fnTag}, Wrapper Contract not deployed`,
              );
            }
            break;
          default:
            throw new Error("Type not supported");
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "wrap",
          params: [
            evmAsset.contractName,
            evmAsset.contractAddress,
            evmAsset.type,
            evmAsset.id,
            evmAsset.referenceId,
            evmAsset.owner,
            interactions,
            asset.ercTokenStandard,
          ],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Unwraps an asset.
   *
   * @param {string} assetId - The ID of the asset to be unwrapped.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#unwrapAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "unwrap",
          params: [assetId],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Locks an asset.
   *
   * @param {string} assetId - The ID of the asset to be locked.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be locked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async lockAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#lockAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Locking Asset: ${assetId} with attribute ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "lock",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Unlocks an asset.
   *
   * @param {string} assetId - The ID of the asset to be unlocked.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be unlocked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unlockAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#unlockAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Unlocking Asset: ${assetId} with attribute: ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "unlock",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Mints an asset.
   *
   * @param {string} assetId - The ID of the asset to be minted.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be minted.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async mintAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#mintAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Minting Asset: ${assetId} with attribute: ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "mint",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Burns an asset.
   *
   * @param {string} assetId - The ID of the asset to be burned.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be burned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async burnAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#burnAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Burning Asset: ${assetId} with attribute: ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "burn",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Assigns an asset to a new owner.
   *
   * @param {string} assetId - The ID of the asset to be assigned.
   * @param {string} to - The new owner of the asset.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be assigned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async assignAsset(
    assetId: string,
    to: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#assignAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Assigning Asset: ${assetId} with attribute: ${assetAttribute} to: ${to}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "assign",
          params: [assetId, to, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Retrieves all asset IDs.
   *
   * @returns {Promise<string[]>} A promise that resolves to an array of asset IDs.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAssets(): Promise<string[]> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getAssets`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Assets`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Call,
          methodName: "getAllAssetsIDs",
          params: [],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        return response.callOutput as string[];
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
   * Retrieves an asset by its ID.
   *
   * @param {string} assetId - The ID of the asset to be retrieved.
   * @returns {Promise<EvmAsset>} A promise that resolves to the asset.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAsset(
    assetId: string,
    uniqueDescriptor?: UniqueTokenID,
  ): Promise<EvmAsset> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Asset`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Call,
          methodName: "getToken",
          params: [
            assetId,
            ...(uniqueDescriptor !== undefined ? [uniqueDescriptor] : []),
          ],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        const token = response.callOutput as TokenResponse;

        switch (Number(token.tokenType)) {
          case TokenType.NONSTANDARD_FUNGIBLE:
            this.log.debug("Returning Fungible Asset");
            return {
              contractName: token.contractName,
              id: token.tokenId,
              referenceId: token.referenceId,
              contractAddress: token.contractAddress,
              type: Number(token.tokenType),
              owner: token.owner,
              amount: Number(token.amount) as Amount,
              network: this.networkIdentification,
              ercTokenStandard: Number(token.ercTokenStandard),
            } as EvmFungibleAsset;
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            this.log.debug("Returning Non Fungible Asset");
            return {
              contractName: token.contractName,
              id: token.tokenId,
              referenceId: token.referenceId,
              contractAddress: token.contractAddress,
              type: Number(token.tokenType),
              owner: token.owner,
              uniqueDescriptor: Number(token.amount) as UniqueTokenID,
              network: this.networkIdentification,
              ercTokenStandard: Number(token.ercTokenStandard),
            } as EvmNonFungibleAsset;
          default:
            throw new Error("Unexpected Token Type");
        }
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
   * Runs a costum transaction on the wrapper contract.
   *
   * @param {string} methodName - The name of the method to be invoked.
   * @param {string[]} params - The parameters for the method invocation.
   * @param {EthContractInvocationType} invocationType - The type of invocation (Send or Call).
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async runTransaction(
    methodName: string,
    params: string[],
    invocationType: EthContractInvocationType,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#runTransaction`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: invocationType,
          methodName: methodName,
          params: params,
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
          output: response.callOutput ?? undefined,
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
   * Retrieves the view for a specific asset using BUNGEE.
   *
   * @param {string} assetId - The ID of the asset to get the view for.
   * @returns {Promise<string>} A promise that resolves to the view of the asset.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {BungeeError} If Bungee is not initialized.
   * @throws {ViewError} If the view is undefined.
   */
  public async getView(assetId: string): Promise<string> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getView`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting View for asset: ${assetId}`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const networkDetails = {
          connector: this.connector,
          signingCredential: this.signingCredential,
          contractName: this.wrapperContractName,
          contractAddress: this.wrapperContractAddress,
          participant: this.id,
        };

        if (this.bungee == undefined) {
          throw new BungeeError(`${fnTag}, Bungee not initialized`);
        }

        const snapshot = await this.bungee.generateSnapshot(
          [assetId],
          this.networkIdentification.id,
          networkDetails,
        );

        const generated = this.bungee.generateView(
          snapshot,
          "0",
          Number.MAX_SAFE_INTEGER.toString(),
          undefined,
        );

        if (generated.view == undefined) {
          throw new Error("View is undefined");
        }

        return safeStableStringify(generated);
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
   * Retrieves the receipt of a transaction by its ID.
   *
   * @param {string} transactionId - The ID of the transaction to get the receipt for.
   * @returns {Promise<string>} A promise that resolves to the transaction receipt.
   */
  public async getReceipt(transactionId: string): Promise<string> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Receipt: transactionId: ${transactionId}`,
        );
        //TODO: implement getReceipt instead of transaction
        const getTransactionReq: InvokeRawWeb3EthMethodV1Request = {
          methodName: "getTransaction",
          params: [transactionId],
        };
        const receipt =
          await this.connector.invokeRawWeb3EthMethod(getTransactionReq);

        return safeStableStringify(receipt) ?? "";
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
   * Retrieves the proof for a given asset ID.
   *
   * @param assetId - The ID of the asset for which the proof is to be retrieved.
   * @param claimFormat - The claim format wanted.
   * @returns A promise that resolves to a string containing the proof.
   * @throws {ProofError} If the claim format is not supported.
   */
  public async getProof(
    asset: Asset,
    claimFormat: ClaimFormat,
  ): Promise<string> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#runTransaction`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Proof of asset: ${asset.id} with a format of: ${claimFormat}`,
        );
        switch (claimFormat) {
          case ClaimFormat.BUNGEE:
            if (claimFormat in this.claimFormats)
              return await this.getView(asset.id);
            else
              throw new ProofError(
                `Claim format not supported: ${claimFormat}`,
              );
          case ClaimFormat.DEFAULT:
            return "";
          default:
            throw new ProofError(`Claim format not supported: ${claimFormat}`);
        }
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
   * Gracefully shuts down the Ethereum connector and releases associated resources.
   *
   * @description
   * Performs a clean shutdown of the Ethereum ledger connector, closing active connections,
   * stopping background processes, and releasing network resources. This method should be
   * called when the bridge leaf is no longer needed to prevent resource leaks and ensure
   * proper cleanup of the Ethereum network connection.
   *
   * **Shutdown Process:**
   * 1. **Connection Termination**: Closes active RPC connections (HTTP/WebSocket)
   * 2. **Resource Cleanup**: Releases connector-associated resources
   * 3. **Background Process Termination**: Stops any ongoing background operations
   * 4. **Error Handling**: Properly handles and logs shutdown errors
   * 5. **Observability**: Records shutdown metrics and traces
   *
   * **Best Practices:**
   * - Call this method during application shutdown or leaf decommissioning
   * - Ensure all pending transactions are completed before shutdown
   * - Handle potential shutdown errors appropriately in calling code
   * - Use in conjunction with proper application lifecycle management
   *
   * @public
   * @async
   * @method shutdownConnection
   * @returns {Promise<void>} Promise that resolves when shutdown is complete
   *
   * @throws {Error} When connector shutdown fails due to network or resource issues
   *
   * @example
   * Graceful application shutdown:
   * ```typescript
   * // During application shutdown
   * try {
   *   await ethereumLeaf.shutdownConnection();
   *   console.log('Ethereum leaf connection closed successfully');
   * } catch (error) {
   *   console.error('Error during shutdown:', error);
   *   // Handle shutdown error appropriately
   * }
   * ```
   *
   * @example
   * Multiple leaf shutdown with error handling:
   * ```typescript
   * const shutdownPromises = [
   *   ethereumLeaf.shutdownConnection(),
   *   fabricLeaf.shutdownConnection(),
   *   besuLeaf.shutdownConnection()
   * ];
   *
   * try {
   *   await Promise.allSettled(shutdownPromises);
   *   console.log('All bridge leafs shutdown initiated');
   * } catch (error) {
   *   console.error('Critical shutdown error:', error);
   * }
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link PluginLedgerConnectorEthereum.shutdown} for connector shutdown details
   */
  public async shutdownConnection(): Promise<void> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#shutdownConnection`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, async () => {
      try {
        try {
          await this.connector.shutdown();
          this.log.debug(
            `${EthereumLeaf.CLASS_NAME}#shutdownConnection, Connector shutdown successfully`,
          );
        } catch (error) {
          this.log.error(
            `${EthereumLeaf.CLASS_NAME}#shutdownConnection, Error shutting down connector: ${error}`,
          );
          throw error;
        }
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
   * Type guard function to validate that connector options contain all required properties.
   *
   * @description
   * Performs runtime validation to ensure that partial connector options contain
   * the essential pluginRegistry property required for proper Ethereum connector
   * initialization. This type guard helps prevent runtime errors during connector
   * instantiation by validating configuration completeness.
   *
   * **Validation Logic:**
   * - Checks for presence of pluginRegistry property
   * - Serves as TypeScript type narrowing guard
   * - Prevents incomplete configuration from reaching connector constructor
   *
   * **Usage Context:**
   * Called during constructor initialization to validate connector options
   * before creating the PluginLedgerConnectorEthereum instance. Essential
   * for ensuring proper plugin ecosystem integration.
   *
   * @private
   * @method isFullPluginOptions
   * @param {Partial<IPluginLedgerConnectorEthereumOptions>} obj - Partial connector configuration to validate
   * @returns {boolean} True if obj contains all required properties for connector initialization
   *
   * @example
   * Type guard usage in constructor:
   * ```typescript
   * if (!this.isFullPluginOptions(options.connectorOptions)) {
   *   throw new ConnectorOptionsError(
   *     "Invalid options provided. Please provide a valid IPluginLedgerConnectorEthereumOptions object."
   *   );
   * }
   *
   * // TypeScript now knows connectorOptions is complete
   * this.connector = new PluginLedgerConnectorEthereum(
   *   options.connectorOptions as IPluginLedgerConnectorEthereumOptions
   * );
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link IPluginLedgerConnectorEthereumOptions} for complete connector configuration
   * @see {@link PluginLedgerConnectorEthereum} for the connector implementation
   */
  private isFullPluginOptions = (
    obj: Partial<IPluginLedgerConnectorEthereumOptions>,
  ): obj is IPluginLedgerConnectorEthereumOptions => {
    return obj.pluginRegistry !== undefined;
  };

  public async getContractBytecode(contractAddress: string): Promise<any> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getContractBytecode`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, fetching bytecode for contract on address ${contractAddress}`,
        );

        const response = (await this.connector.invokeRawWeb3EthMethod({
          methodName: "getCode",
          params: [contractAddress, "latest"],
        })) as EthereumResponse;

        if (!response) {
          throw new Error(
            `Failed to fetch bytecode for contract on address ${contractAddress}`,
          );
        }

        return {
          response,
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
}
