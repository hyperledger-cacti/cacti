/**
 * @fileoverview SATP Bridge Type Definitions
 *
 * This module provides core type definitions and interfaces for SATP bridge
 * operations. Defines common data structures used across bridge implementations
 * for transaction handling, network configuration, and cross-chain coordination.
 *
 * The type definitions include:
 * - Transaction response structures
 * - Network configuration options
 * - Bridge operation parameters
 * - Cross-chain interaction types
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import {
  GasTransactionConfig,
  Web3SigningCredential as EthereumWeb3SigningCredential,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/";
import { Web3SigningCredential as BesuWeb3SigningCredential } from "@hyperledger-cacti/cactus-plugin-ledger-connector-besu/";
import { ClaimFormat, NetworkId } from "../../public-api";
import { IBridgeLeafOptions } from "./bridge-leaf";
import { IPluginLedgerConnectorEthereumOptions } from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum/";
import { IPluginLedgerConnectorBesuOptions } from "@hyperledger-cacti/cactus-plugin-ledger-connector-besu/";
import { BesuGasConfig } from "../../services/validation/config-validating-functions/bridges-config-validating-functions/validate-besu-config";
import { ISignerKeyPair } from "@hyperledger-cacti/cactus-common/";

/**
 * Response structure for bridge transaction operations.
 *
 * Provides standardized response format for cross-chain transaction
 * execution including transaction identifiers, receipts, and operation
 * outputs across different blockchain networks.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const response: TransactionResponse = {
 *   transactionId: '0x1234...',
 *   transactionReceipt: '{"status": "success"}',
 *   output: { assetId: 'asset-123', amount: '1000' }
 * };
 * ```
 */
export interface TransactionResponse {
  /** Unique identifier for the transaction */
  transactionId?: string;
  /** Transaction receipt from the blockchain */
  transactionReceipt?: string;
  /** Operation-specific output data */
  output?: unknown;
}

/**
 * Network configuration options for bridge operations.
 *
 * Defines the network identification and configuration parameters
 * required for establishing bridge connections to specific blockchain
 * networks within the SATP ecosystem.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const networkOptions: INetworkOptions = {
 *   networkIdentification: {
 *     id: 'ethereum-mainnet',
 *     ledgerType: LedgerType.Ethereum
 *   }
 * };
 * ```
 */
export interface INetworkOptions {
  /** Network identification parameters */
  networkIdentification: NetworkId;
}

/**
 * Configuration options specific to Ethereum network integration for SATP bridge leaf operations.
 *
 * @description
 * This interface extends the base INetworkOptions to provide Ethereum-specific configuration
 * parameters required for establishing a connection to Ethereum networks and managing
 * cross-chain asset operations through the SATP protocol.
 *
 * **Key Configuration Areas:**
 * - **Authentication**: Web3 signing credentials for transaction authorization
 * - **Network Connection**: Ethereum ledger connector configuration options
 * - **Smart Contracts**: Optional wrapper contract deployment parameters
 * - **Transaction Management**: Gas configuration and optimization settings
 * - **Identity Management**: Cryptographic key pairs and leaf identification
 * - **Proof Generation**: Supported claim formats for cross-chain proofs
 *
 * @interface IEthereumLeafNeworkOptions
 * @extends INetworkOptions
 *
 * @example
 * Basic Ethereum mainnet configuration:
 * ```typescript
 * const ethereumOptions: IEthereumLeafNeworkOptions = {
 *   networkIdentification: {
 *     id: 'ethereum-mainnet',
 *     ledgerType: LedgerType.Ethereum
 *   },
 *   signingCredential: {
 *     transactionSignerEthAccount: '0x123...',
 *     secret: 'private-key-hex',
 *     type: Web3SigningCredentialType.PrivateKeyHex
 *   },
 *   connectorOptions: {
 *     rpcApiHttpHost: 'https://mainnet.infura.io/v3/PROJECT_ID',
 *     rpcApiWsHost: 'wss://mainnet.infura.io/ws/v3/PROJECT_ID',
 *     pluginRegistry: registry
 *   },
 *   gasConfig: {
 *     gasPrice: '20000000000', // 20 gwei
 *     gasLimit: 6000000
 *   },
 *   claimFormats: [ClaimFormat.BUNGEE, ClaimFormat.DEFAULT]
 * };
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link INetworkOptions} for base network configuration
 * @see {@link Web3SigningCredential} for signing credential types
 * @see {@link IPluginLedgerConnectorEthereumOptions} for connector configuration
 */
export interface IEthereumNetworkConfig extends INetworkOptions {
  /**
   * Web3 signing credential used for transaction authorization and smart contract interactions.
   *
   * @description
   * Specifies the cryptographic credentials required for signing Ethereum transactions.
   * Supports multiple credential types including private keys, keychain references,
   * and Geth keychain passwords for flexible deployment scenarios.
   *
   * @type {Web3SigningCredential}
   *
   * @example
   * Private key credential:
   * ```typescript
   * signingCredential: {
   *   transactionSignerEthAccount: '0x1234567890123456789012345678901234567890',
   *   secret: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
   *   type: Web3SigningCredentialType.PrivateKeyHex
   * }
   * ```
   */
  signingCredential: EthereumWeb3SigningCredential;

  /**
   * Configuration options for the Ethereum ledger connector plugin.
   *
   * @description
   * Partial configuration object for establishing connection to Ethereum networks.
   * Must include essential properties like pluginRegistry for proper plugin initialization.
   * Supports both HTTP and WebSocket RPC endpoints for optimal network connectivity.
   *
   * @type {Partial<IPluginLedgerConnectorEthereumOptions>}
   *
   * @example
   * Infura connector configuration:
   * ```typescript
   * connectorOptions: {
   *   rpcApiHttpHost: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
   *   rpcApiWsHost: 'wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID',
   *   pluginRegistry: pluginRegistry,
   *   prometheusExporter: prometheusExporter
   * }
   * ```
   */
  connectorOptions: Partial<IPluginLedgerConnectorEthereumOptions>;

  /**
   * Optional name for the SATP wrapper contract to be deployed or referenced.
   *
   * @description
   * Human-readable identifier for the wrapper contract used in cross-chain operations.
   * If provided along with wrapperContractAddress, references an existing contract.
   * If omitted, a new contract will be deployed with an auto-generated name.
   *
   * @type {string}
   * @optional
   *
   * @example
   * ```typescript
   * wrapperContractName: 'MainnetSATPWrapper'
   * ```
   */
  wrapperContractName?: string;

  /**
   * Optional Ethereum address of an existing SATP wrapper contract.
   *
   * @description
   * If provided along with wrapperContractName, references a pre-deployed wrapper contract.
   * Must be a valid Ethereum address format. If omitted, a new contract will be deployed
   * during leaf initialization.
   *
   * @type {string}
   * @optional
   *
   * @example
   * ```typescript
   * wrapperContractAddress: '0x1234567890123456789012345678901234567890'
   * ```
   */
  wrapperContractAddress?: string;

  /**
   * Optional gas configuration for Ethereum transaction optimization.
   *
   * @description
   * Specifies gas price and gas limit parameters for efficient transaction execution.
   * If omitted, the connector will use network defaults or dynamic gas estimation.
   * Critical for cost optimization in high-traffic scenarios.
   *
   * @type {GasTransactionConfig}
   * @optional
   *
   * @example
   * ```typescript
   * gasConfig: {
   *   gasPrice: '20000000000', // 20 gwei
   *   gasLimit: 6000000        // 6M gas units
   * }
   * ```
   */
  gasConfig?: GasTransactionConfig;

  /**
   * Optional unique identifier for this bridge leaf instance.
   *
   * @description
   * Custom identifier for the bridge leaf, useful for multi-leaf deployments
   * and monitoring. If omitted, an auto-generated UUID will be assigned.
   *
   * @type {string}
   * @optional
   *
   * @example
   * ```typescript
   * leafId: 'ethereum-mainnet-leaf-01'
   * ```
   */
  leafId?: string;

  /**
   * Optional cryptographic key pair for signing and identity operations.
   *
   * @description
   * Secp256k1 key pair used for cryptographic operations including proof generation
   * and identity verification. If omitted, a new key pair will be generated automatically.
   *
   * @type {ISignerKeyPair}
   * @optional
   *
   * @example
   * ```typescript
   * keyPair: {
   *   privateKey: Buffer.from('...'),
   *   publicKey: Buffer.from('...')
   * }
   * ```
   */
  keyPair?: ISignerKeyPair;

  /**
   * Optional array of supported claim formats for cross-chain proof generation.
   *
   * @description
   * Specifies which proof generation mechanisms are supported by this leaf.
   * Includes DEFAULT format (basic proofs) and BUNGEE format (advanced cryptographic proofs).
   * If omitted, defaults to [ClaimFormat.DEFAULT].
   *
   * @type {ClaimFormat[]}
   * @optional
   *
   * @example
   * ```typescript
   * claimFormats: [ClaimFormat.BUNGEE, ClaimFormat.DEFAULT]
   * ```
   */
  claimFormats?: ClaimFormat[];
}

/**
 * Complete configuration options for creating an Ethereum bridge leaf instance.
 *
 * @description
 * This interface combines both base bridge leaf options and Ethereum-specific network
 * configuration to provide a comprehensive configuration contract for EthereumLeaf
 * instantiation. It serves as the primary configuration interface for establishing
 * Ethereum-based cross-chain bridge operations within the SATP protocol framework.
 *
 * **Configuration Inheritance:**
 * - **IBridgeLeafOptions**: Base bridge leaf configuration (monitoring, logging)
 * - **IEthereumLeafNeworkOptions**: Ethereum-specific network and connector settings
 *
 * **Usage Context:**
 * This interface is used exclusively for EthereumLeaf constructor initialization,
 * ensuring all required configuration parameters are provided for successful
 * Ethereum blockchain integration and SATP protocol compliance.
 *
 * @interface IEthereumLeafOptions
 * @extends IBridgeLeafOptions
 * @extends IEthereumLeafNeworkOptions
 *
 * @example
 * Complete Ethereum leaf configuration:
 * ```typescript
 * const ethereumLeafOptions: IEthereumLeafOptions = {
 *   // Base bridge leaf options
 *   logLevel: 'INFO',
 *
 *   // Ethereum network configuration
 *   networkIdentification: {
 *     id: 'ethereum-goerli',
 *     ledgerType: LedgerType.Ethereum
 *   },
 *   signingCredential: {
 *     transactionSignerEthAccount: '0x742d35Cc6634C0532925a3b8D4C2d4a8b1b8B1b8',
 *     secret: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 *     type: Web3SigningCredentialType.PrivateKeyHex
 *   },
 *   connectorOptions: {
 *     rpcApiHttpHost: 'https://goerli.infura.io/v3/PROJECT_ID',
 *     pluginRegistry: registry
 *   },
 *   gasConfig: {
 *     gasPrice: '2000000000', // 2 gwei for testnet
 *     gasLimit: 3000000
 *   },
 *   claimFormats: [ClaimFormat.BUNGEE]
 * };
 *
 * const ethereumLeaf = new EthereumLeaf(
 *   ethereumLeafOptions,
 *   ontologyManager,
 *   monitorService
 * );
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link IBridgeLeafOptions} for base configuration options
 * @see {@link IEthereumLeafNeworkOptions} for Ethereum-specific options
 * @see {@link EthereumLeaf} for the implementation class
 */
export interface IEthereumLeafOptions
  extends IBridgeLeafOptions,
    IEthereumNetworkConfig {}

export interface IBesuNetworkConfig extends INetworkOptions {
  signingCredential: BesuWeb3SigningCredential;
  connectorOptions: Partial<IPluginLedgerConnectorBesuOptions>;
  leafId?: string;
  keyPair?: ISignerKeyPair;
  claimFormats?: ClaimFormat[];
  wrapperContractName?: string;
  wrapperContractAddress?: string;
  gasConfig?: BesuGasConfig;
}

export interface IBesuLeafOptions
  extends IBridgeLeafOptions,
    IBesuNetworkConfig {}
