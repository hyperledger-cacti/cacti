/**
 * @fileoverview
 * SATP Bridge Manager Admin Interface for privileged gateway operations.
 *
 * Provides administrative capabilities for SATP gateway management including bridge leaf
 * deployment, network configuration, and gateway lifecycle operations. This interface
 * defines the administrative contract for managing bridge infrastructure components
 * that facilitate secure cross-chain asset transfers.
 *
 * **SATP Protocol Context:**
 * - Gateway Administration: Privileged operations for gateway configuration
 * - Bridge Infrastructure: Management of bridge leaf components across networks
 * - Network Deployment: Automated deployment of bridge components to target networks
 * - Gateway Lifecycle: Administrative control over gateway operational status
 *
 * **Administrative Operations:**
 * - Bridge leaf deployment and configuration
 * - Network-specific bridge component setup
 * - Gateway security and access control management
 * - Cross-chain connection establishment
 *
 * @module BridgeManagerAdminInterface
 *
 * @example
 * Administrative gateway setup:
 * ```typescript
 * class SatpAdminManager extends BridgeManagerAdminInterface {
 *   async deployLeaf(options: IBridgeLeafOptions): Promise<void> {
 *     // Deploy bridge leaf to target network
 *     await this.validateNetworkConnectivity(options.networkId);
 *     await this.deployBridgeComponents(options);
 *     await this.configureGatewayEndpoints(options);
 *   }
 * }
 * ```
 *
 * @example
 * Multi-network bridge deployment:
 * ```typescript
 * const adminManager = new SatpAdminManager();
 *
 * // Deploy bridge leaves to multiple networks
 * await Promise.all([
 *   adminManager.deployLeaf(fabricNetworkOptions),
 *   adminManager.deployLeaf(ethereumNetworkOptions),
 *   adminManager.deployLeaf(besuNetworkOptions)
 * ]);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link IBridgeLeafOptions} for bridge leaf deployment configuration
 * @see {@link BridgeManagerClientInterface} for client-side bridge operations
 * @see {@link SATPBridgeExecutionLayer} for asset transfer execution layer
 */

import { IBridgeLeafOptions } from "../bridge-leaf";

/**
 * Administrative interface for SATP bridge manager operations.
 *
 * @description
 * Defines the administrative contract for managing SATP bridge infrastructure
 * including bridge leaf deployment, network configuration, and gateway lifecycle
 * operations. This interface provides privileged access to gateway management
 * functions required for establishing and maintaining cross-chain bridge connections.
 *
 * **Administrative Capabilities:**
 * - Bridge leaf deployment to target blockchain networks
 * - Network-specific bridge component configuration
 * - Gateway endpoint setup and connectivity management
 * - Administrative access control and security enforcement
 * - Cross-chain bridge infrastructure lifecycle management
 *
 * @abstract
 * @class BridgeManagerAdminInterface
 *
 * @example
 * Implementing administrative bridge management:
 * ```typescript
 * class SatpBridgeAdmin extends BridgeManagerAdminInterface {
 *   async deployLeaf(leafOptions: IBridgeLeafOptions): Promise<void> {
 *     // Validate administrative privileges
 *     await this.validateAdminAccess();
 *
 *     // Deploy bridge components
 *     const bridgeLeaf = await this.createBridgeLeaf(leafOptions);
 *     await bridgeLeaf.deployContracts();
 *
 *     // Register with gateway registry
 *     await this.registerBridgeLeaf(bridgeLeaf);
 *
 *     this.log.info(`Bridge leaf deployed to ${leafOptions.networkId}`);
 *   }
 * }
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 3.1
 * @see {@link IBridgeLeafOptions} for deployment configuration options
 * @see {@link BridgeLeaf} for bridge leaf implementation details
 * @see {@link SATPGateway} for gateway architecture integration
 */
export abstract class BridgeManagerAdminInterface {
  /**
   * Deploys a bridge leaf component to the specified blockchain network.
   *
   * @description
   * Executes the deployment of a bridge leaf component to enable cross-chain asset
   * transfer operations on the target blockchain network. This operation includes
   * contract deployment, network configuration, and gateway registration processes
   * required to establish a functional bridge endpoint.
   *
   * **Deployment Process:**
   * - Validates network connectivity and administrative access
   * - Deploys bridge contracts (wrapper contracts, execution layers)
   * - Configures network-specific parameters and security settings
   * - Registers bridge leaf with the gateway management system
   * - Establishes communication channels with counterparty gateways
   *
   * @param leafOptions - Configuration options for bridge leaf deployment
   * @returns Promise resolving when deployment completes successfully
   *
   * @throws {NetworkConnectivityError} When target network is unreachable
   * @throws {InsufficientPrivilegesError} When administrative access is denied
   * @throws {ContractDeploymentError} When bridge contract deployment fails
   * @throws {GatewayRegistrationError} When gateway registration fails
   *
   * @example
   * Deploying bridge leaf to Ethereum network:
   * ```typescript
   * const leafOptions: IBridgeLeafOptions = {
   *   networkIdentification: {
   *     id: 'ethereum-mainnet',
   *     ledgerType: LedgerType.Ethereum
   *   },
   *   signingCredential: ethereumCredentials,
   *   connectorOptions: ethereumConnectorConfig,
   *   ontologyManager: assetOntologyManager
   * };
   *
   * await adminManager.deployLeaf(leafOptions);
   * ```
   *
   * @example
   * Deploying with custom configuration:
   * ```typescript
   * const fabricLeafOptions: IBridgeLeafOptions = {
   *   networkIdentification: {
   *     id: 'fabric-channel-1',
   *     ledgerType: LedgerType.Fabric2
   *   },
   *   signingCredential: fabricCredentials,
   *   channelName: 'mychannel',
   *   targetOrganizations: [org1, org2],
   *   ontologyManager: fabricOntologyManager
   * };
   *
   * await adminManager.deployLeaf(fabricLeafOptions);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   * @see {@link IBridgeLeafOptions} for comprehensive configuration options
   * @see {@link BridgeLeaf.deployContracts} for contract deployment details
   * @see {@link SATPGatewayRegistry} for gateway registration process
   * @see {@link NetworkConnectivityValidator} for network validation procedures
   */
  public abstract deployLeaf(leafOptions: IBridgeLeafOptions): Promise<void>;
}
