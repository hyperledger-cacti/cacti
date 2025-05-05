import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { BridgeLeaf } from "./bridge-leaf";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BesuLeaf, IBesuLeafNeworkOptions } from "./leafs/besu-leaf";
import {
  DeployLeafError,
  LeafError,
  UnsupportedNetworkError,
  WrapperContractAlreadyCreatedError,
} from "./bridge-errors";
import {
  EthereumLeaf,
  IEthereumLeafNeworkOptions,
} from "./leafs/ethereum-leaf";
import { FabricLeaf, IFabricLeafNeworkOptions } from "./leafs/fabric-leaf";
import { BridgeManagerAdminInterface } from "./interfaces/bridge-manager-admin-interface";
import { BridgeManagerClientInterface } from "./interfaces/bridge-manager-client-interface";
import {
  ClaimFormat,
  TokenType,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { SATPBridgeExecutionLayer } from "./satp-bridge-execution-layer";
import { SATPBridgeExecutionLayerImpl } from "./satp-bridge-execution-layer-implementation";
import { INetworkOptions } from "./bridge-types";
import {
  IOntologyManagerOptions,
  OntologyManager,
} from "./ontology/ontology-manager";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { NetworkId } from "../../public-api";

/**
 * Options for configuring the BridgeManager.
 *
 * @property {LogLevelDesc} [logLevel] - The log level for the BridgeManager.
 * @property {IOntologyManagerOptions} [ontologyOptions] - The ontology manager options.
 */
interface IBridgeManagerOptions {
  ontologyOptions?: IOntologyManagerOptions;
  logLevel?: LogLevelDesc;
}

/**
 * The BridgeManager class is responsible for managing the deployment and retrieval of bridge leaf nodes for different blockchain networks.
 *
 * @class BridgeManager
 */
export class BridgeManager
  implements BridgeManagerAdminInterface, BridgeManagerClientInterface
{
  public static readonly CLASS_NAME = "BridgeManager";
  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly ontologyManager: OntologyManager;

  // Group leaf by the network, a network can have various leafs (bridges)
  private readonly leafs: Map<string, Map<string, BridgeLeaf>> = new Map();

  /**
   * Creates an instance of BridgeManager.
   *
   * @param options - The configuration options for the BridgeManager.
   */
  constructor(public readonly options: IBridgeManagerOptions) {
    const label = BridgeManager.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level: this.logLevel });
    this.ontologyManager = new OntologyManager({
      ...options.ontologyOptions,
      logLevel: options.logLevel,
    });
  }

  /**
   * Deploys a new leaf (bridge endpoint) based on the provided options.
   *
   * @param leafNetworkOptions - The configuration options for the leaf to be deployed.
   * @throws {DeployLeafError} If the leaf is already deployed or if there is an error during deployment.
   * @throws {UnsupportedNetworkError} If the network type specified in the options is not supported.
   * @throws {WrapperContractAlreadyCreatedError} If the contracts are already deployed.
   * @returns {Promise<void>} A promise that resolves when the leaf is successfully deployed.
   */
  public async deployLeaf(leafNetworkOptions: INetworkOptions): Promise<void> {
    const fnTag = `${BridgeManager.CLASS_NAME}#deployLeaf()`;
    this.log.debug(`${fnTag}, Deploying Leaf...`);
    this.log.debug(
      `${fnTag}, Leaf Network Options: ${JSON.stringify(leafNetworkOptions)}`,
    );

    if (
      this.leafs.has(
        safeStableStringify(leafNetworkOptions.networkIdentification),
      )
    ) {
      throw new DeployLeafError(
        `${fnTag}, Leaf already deployed: ${safeStableStringify(leafNetworkOptions.networkIdentification)}`,
      );
    }

    try {
      let leaf: BridgeLeaf;
      switch (leafNetworkOptions.networkIdentification.ledgerType) {
        case LedgerType.Besu1X:
        case LedgerType.Besu2X:
          this.log.debug(`${fnTag}, Deploying Besu Leaf...`);
          this.log.debug(
            `${fnTag}, Besu Leaf Network Options: ${JSON.stringify(
              leafNetworkOptions,
            )}`,
          );
          const besuNetworkOptions =
            leafNetworkOptions as unknown as IBesuLeafNeworkOptions;
          leaf = new BesuLeaf({
            ...besuNetworkOptions,
            connectorOptions: {
              ...besuNetworkOptions.connectorOptions,
              instanceId: uuidv4(),
              pluginRegistry: new PluginRegistry({
                plugins: [],
              }),
              logLevel: this.logLevel,
            },
            ontologyManager: this.ontologyManager,
            logLevel: this.logLevel,
          });
          break;
        case LedgerType.Ethereum:
          this.log.debug(`${fnTag}, Deploying Ethereum Leaf...`);
          this.log.debug(
            `${fnTag}, Ethereum Leaf Network Options: ${JSON.stringify(
              leafNetworkOptions,
            )}`,
          );
          const ethereumNetworkOptions =
            leafNetworkOptions as unknown as IEthereumLeafNeworkOptions;
          leaf = new EthereumLeaf({
            ...ethereumNetworkOptions,
            connectorOptions: {
              ...ethereumNetworkOptions.connectorOptions,
              instanceId: uuidv4(),
              pluginRegistry: new PluginRegistry({
                plugins: [],
              }),
              logLevel: this.logLevel,
            },
            ontologyManager: this.ontologyManager,
            logLevel: this.logLevel,
          });
          break;
        case LedgerType.Fabric2:
          this.log.debug(`${fnTag}, Deploying Fabric Leaf...`);
          this.log.debug(
            `${fnTag}, Fabric Leaf Network Options: ${JSON.stringify(
              leafNetworkOptions,
            )}`,
          );
          if (
            !(leafNetworkOptions as Partial<IFabricLeafNeworkOptions>)
              .userIdentity
          ) {
            throw new DeployLeafError(
              `${fnTag}, User Identity is required for Fabric network`,
            );
          }
          const keychainEntryKeyBridge = "bridgeKey";
          const fabricKeychain = new PluginKeychainMemory({
            instanceId: uuidv4(),
            keychainId: uuidv4(),
            logLevel: this.logLevel,
            backend: new Map([
              [
                keychainEntryKeyBridge,
                JSON.stringify(
                  (leafNetworkOptions as Partial<IFabricLeafNeworkOptions>)
                    .userIdentity,
                ),
              ],
            ]),
          });
          const fabricNetworkOptions = {
            ...leafNetworkOptions,
            connectorOptions: {
              ...(leafNetworkOptions as Partial<IFabricLeafNeworkOptions>)
                .connectorOptions,
              instanceId: uuidv4(),
              pluginRegistry: new PluginRegistry({
                plugins: [fabricKeychain],
              }),
              logLevel: this.logLevel,
            },
            signingCredential: {
              keychainId: fabricKeychain.getKeychainId(),
              keychainRef: keychainEntryKeyBridge,
            },
          } as unknown as IFabricLeafNeworkOptions;
          leaf = new FabricLeaf({
            ...fabricNetworkOptions,
            ontologyManager: this.ontologyManager,
            logLevel: this.logLevel,
          });
          break;
        default:
          throw new UnsupportedNetworkError(
            `${fnTag}, ${leafNetworkOptions.networkIdentification.ledgerType} is not supported`,
          );
      }
      try {
        await leaf.deployContracts();
      } catch (error) {
        this.log.error(`${fnTag}, Error deploying leaf: ${error}`);
        if (error instanceof WrapperContractAlreadyCreatedError) {
          this.log.debug("Contracts already deployed");
        } else {
          throw error;
        }
      }
      const networkKey = safeStableStringify(
        leafNetworkOptions.networkIdentification,
      );
      if (!this.leafs.has(networkKey)) {
        this.leafs.set(networkKey, new Map());
      }
      this.leafs.get(networkKey)?.set(leaf.getId(), leaf);
    } catch (error) {
      this.log.error(`${fnTag}, Error deploying leaf: ${error}`);
      throw new DeployLeafError(error);
    }
  }

  /**
   * Retrieves the bridge endpoint (leaf) for the specified network ID.
   *
   * @param id - The network ID for which to retrieve the bridge endpoint.
   * @throws {LeafError} If the bridge endpoint is not available for the specified network ID.
   * @returns {BridgeLeaf} The bridge endpoint associated with the specified network ID.
   */
  public getBridgeEndPoint(
    id: NetworkId,
    claimFormat: ClaimFormat = ClaimFormat.DEFAULT,
  ): BridgeLeaf {
    const fnTag = `${BridgeManager.CLASS_NAME}#deployLeaf()`;
    this.log.debug(`${fnTag}, Getting Leaf...`);
    this.log.debug(
      `${fnTag}, Getting Leaf for Network ID: ${safeStableStringify(id)}`,
    );

    const leafs = this.leafs.get(safeStableStringify(id));

    if (!leafs) {
      throw new LeafError(
        `${fnTag}, Bridge endpoint not available for network: ${safeStableStringify(id)}`,
      );
    }

    for (const leaf of leafs.values()) {
      if (leaf.getSupportedClaimFormats().includes(claimFormat)) {
        return leaf;
      }
    }

    throw new LeafError(
      `${fnTag}, Bridge endpoint not available: ${id}, with Claim Format: ${claimFormat}`,
    );
  }

  /**
   * Retrieves the list of available network IDs for which bridge endpoints are deployed.
   *
   * @returns {NetworkId[]} An array of network IDs for which bridge endpoints are available.
   */
  public getAvailableEndPoints(): NetworkId[] {
    const fnTag = `${BridgeManager.CLASS_NAME}#getAvailableEndPoints()`;
    this.log.debug(`${fnTag}, Getting Leafs...`);
    const networkIds: NetworkId[] = [];
    for (const key of this.leafs.keys()) {
      networkIds.push(JSON.parse(key) as NetworkId);
    }
    return networkIds;
  }

  /**
   * Retrieves the SATP (Secure Asset Transfer Protocol) Execution Layer for a given network ID and claim type.
   *
   * @param id - The network ID for which the SATP Execution Layer is to be retrieved.
   * @param claimType - The format of the claim. Defaults to `ClaimFormat.DEFAULT` if not provided.
   * @returns An instance of `SATPBridgeExecutionLayer` configured with the specified network ID and claim type.
   */
  public getSATPExecutionLayer(
    id: NetworkId,
    claimType: ClaimFormat = ClaimFormat.DEFAULT,
  ): SATPBridgeExecutionLayer {
    const fnTag = `${BridgeManager.CLASS_NAME}#getSATPExecutionLayer()`;
    this.log.debug(`${fnTag}, Getting SATP Execution Layer...`);

    return new SATPBridgeExecutionLayerImpl({
      leafBridge: this.getBridgeEndPoint(id, claimType),
      claimType,
      logLevel: this.logLevel,
    });
  }

  /**
   * Retrieves the approval address for a specific asset type on a given network.
   *
   * This method is abstract and must be implemented by subclasses.
   * It should return a string representing the address where approval is required.
   *
   * @param {NetworkId} networkIdentification - The identification details of the network.
   * @param {string} assetType - The type of the asset for which the approval address is needed.
   * @returns {string} The approval address for the specified asset type and network.
   */
  public getApproveAddress(
    networkIdentification: NetworkId,
    assetType: TokenType,
  ): string {
    const fnTag = `${BridgeManager.CLASS_NAME}#getApproveAddress()`;
    this.log.debug(`${fnTag}, Getting Approve Address...`);

    return this.getBridgeEndPoint(networkIdentification).getApproveAddress(
      assetType,
    );
  }
}
