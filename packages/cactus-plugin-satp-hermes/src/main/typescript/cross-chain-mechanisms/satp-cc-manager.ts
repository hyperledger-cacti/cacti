import {
  LoggerProvider,
  type LogLevelDesc,
  type Logger,
} from "@hyperledger/cactus-common";
import { BridgeManager } from "./bridge/bridge-manager";
import { BridgeManagerClientInterface } from "./bridge/interfaces/bridge-manager-client-interface";
import { IOntologyManagerOptions } from "./bridge/ontology/ontology-manager";
import { INetworkOptions } from "./bridge/bridge-types";
import { GatewayOrchestrator } from "../services/gateway/gateway-orchestrator";
import { OracleManager } from "./oracle/oracle-manager";
export interface ISATPCrossChainManagerOptions {
  orquestrator: GatewayOrchestrator;
  logLevel?: LogLevelDesc;
  ontologyOptions?: IOntologyManagerOptions;
}

export interface ICrossChainMechanismsOptions {
  bridgeConfig?: INetworkOptions[];
  oracleConfig?: INetworkOptions[];
}

// TODO extend to accomodate oracle
// does specific on-chain operations by calling bridge manager or oracle manager

/**
 * The `ISATPCCManager` class is responsible for managing cross-chain mechanisms
 * within the SATP (Secure Asset Transfer Protocol) framework. It provides methods
 * to deploy cross-chain mechanisms and bridges based on the provided configuration.
 */
export class SATPCrossChainManager {
  /**
   * The class name for logging purposes.
   */
  public static readonly CLASS_NAME = "SATPCrossChainManager";

  /**
   * Logger instance for logging messages.
   */
  private readonly log: Logger;

  /**
   * Log level for the logger.
   */
  private readonly logLevel: LogLevelDesc;

  /**
   * Instance of the BridgeManager to handle bridge-related operations.
   */
  private readonly bridgeManager: BridgeManager;

  /**
   * Instance of the GatewayOrchestrator to handle gateway-related operations.
   */
  private readonly gatewayOrchestrator: GatewayOrchestrator;

  /**
   * Instance of the OracleManager to handle oracle-related operations.
   */
  private readonly oracleManager: OracleManager;

  /**
   * Constructs an instance of `ISATPCCManager`.
   *
   * @param options - The options for configuring the `ISATPCCManager`.
   */
  constructor(private options: ISATPCrossChainManagerOptions) {
    const label = SATPCrossChainManager.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level: this.logLevel });

    this.bridgeManager = new BridgeManager({
      ontologyOptions: options.ontologyOptions,
      logLevel: this.logLevel,
    });

    this.gatewayOrchestrator = options.orquestrator;

    this.oracleManager = new OracleManager({
      logLevel: this.logLevel,
      bungee: undefined,
      initialTasks: [],
    });
  }

  /**
   * Deploys cross-chain mechanisms based on the provided bridge configurations.
   *
   * @param bridgesConfig - An array of bridge configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployCCMechanisms(
    config: ICrossChainMechanismsOptions,
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployCCMechanisms()`;
    this.log.debug(`${fnTag}, Deploying Cross Chain Mechanisms...`);

    if (!config.bridgeConfig && !config.oracleConfig) {
      throw new Error(
        `${fnTag}, Missing bridge or oracle configuration. Cannot deploy cross-chain mechanism.`,
      );
    }

    if (config.bridgeConfig) {
      await this.deployBridgeFromConfig(config.bridgeConfig);
    }

    if (config.oracleConfig) {
      await this.deployOracleFromConfig(config.oracleConfig);
    }
  }

  /**
   * Deploys bridges based on the provided configuration.
   *
   * @param bridgesConfig - An array of bridge configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployBridgeFromConfig(bridgesNetworkConfig: INetworkOptions[]) {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployBridgeFromConfig()`;
    this.log.debug(`${fnTag}, Deploying Bridge...`);

    //const deploymentPromises = [];
    for (const config of bridgesNetworkConfig) {
      //deploymentPromises.push(this.bridgeManager.deployLeaf(config));
      await this.bridgeManager.deployLeaf(config);
    }
    //await Promise.all(deploymentPromises);

    const networkIds = [];
    for (const config of bridgesNetworkConfig) {
      networkIds.push({ ...config.networkIdentification });
    }
    this.gatewayOrchestrator.addGatewayOwnChannels(networkIds);
  }

  /**
   * Deploys bridges based on the provided configuration.
   *
   * @param bridgesConfig - An array of bridge configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployOracleFromConfig(bridgesNetworkConfig: INetworkOptions[]) {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployOracleFromConfig()`;
    this.log.debug(`${fnTag}, Deploying Oracles...`);

    for (const config of bridgesNetworkConfig) {
      await this.oracleManager.deployOracle(config);
    }
  }

  /**
   * Retrieves the Bridge Manager Client Interface.
   *
   * @returns {BridgeManagerClientInterface} The interface for the bridge manager client.
   *
   * @remarks
   * This method logs the action of getting the Bridge Manager Interface and then returns the
   * `bridgeManager` instance.
   *
   * @example
   * ```typescript
   * const bridgeManagerClient = satpCrossChainManager.getClientBridgeManagerInterface();
   * ```
   */
  public getClientBridgeManagerInterface(): BridgeManagerClientInterface {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#getClientBridgeManagerInterface()`;
    this.log.debug(`${fnTag}, Getting Bridge Manager Interface...`);
    return this.bridgeManager;
  }

  /**
   * Retrieves the Oracle Manager.
   *
   * @returns {OracleManager} The instance of the Oracle Manager.
   *
   * @remarks
   * This method logs the action of getting the Oracle Manager and then returns the
   * `oracleManager` instance.
   *
   * @example
   * ```typescript
   * const oracleManager = satpCrossChainManager.getOracleManager();
   * ```
   */
  public getOracleManager(): OracleManager {
    return this.oracleManager;
  }
}
