import { type LogLevelDesc } from "@hyperledger/cactus-common";
import type { SATPLogger as Logger } from "../core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import { BridgeManager } from "./bridge/bridge-manager";
import { BridgeManagerClientInterface } from "./bridge/interfaces/bridge-manager-client-interface";
import { IOntologyManagerOptions } from "./bridge/ontology/ontology-manager";
import { INetworkOptions } from "./bridge/bridge-types";
import { GatewayOrchestrator } from "../services/gateway/gateway-orchestrator";
import { OracleManager } from "./oracle/oracle-manager";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
export interface ISATPCrossChainManagerOptions {
  orquestrator: GatewayOrchestrator;
  logLevel?: LogLevelDesc;
  ontologyOptions?: IOntologyManagerOptions;
  monitorService: MonitorService;
}

export interface ICrossChainMechanismsOptions {
  bridgeConfig?: INetworkOptions[];
  oracleConfig?: INetworkOptions[];
}

// TODO extend to accommodate oracle
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
  private bridgeManager?: BridgeManager;

  /**
   * Instance of the GatewayOrchestrator to handle gateway-related operations.
   */
  private gatewayOrchestrator?: GatewayOrchestrator;

  /**
   * Instance of the OracleManager to handle oracle-related operations.
   */
  private oracleManager?: OracleManager;

  /**
   * Instance of the GatewayOrchestrator to handle gateway-related operations.
   */
  private readonly monitorService: MonitorService;

  /**
   * Constructs an instance of `ISATPCCManager`.
   *
   * @param options - The options for configuring the `ISATPCCManager`.
   */
  constructor(private options: ISATPCrossChainManagerOptions) {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#constructor()`;
    const label = SATPCrossChainManager.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.monitorService = this.options.monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );

    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    context.with(ctx, () => {
      try {
        this.bridgeManager = new BridgeManager({
          ontologyOptions: options.ontologyOptions,
          logLevel: this.logLevel,
          monitorService: this.monitorService,
        });

        this.gatewayOrchestrator = options.orquestrator;

        this.oracleManager = new OracleManager({
          logLevel: this.logLevel,
          bungee: undefined,
          initialTasks: [],
          monitorService: this.monitorService,
        });
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
   * Deploys cross-chain mechanisms based on the provided bridge configurations.
   *
   * @param bridgesConfig - An array of bridge configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployCCMechanisms(
    config: ICrossChainMechanismsOptions,
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployCCMechanisms()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
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

        span.setStatus({ code: SpanStatusCode.OK });
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
   * Deploys bridges based on the provided configuration.
   *
   * @param bridgesConfig - An array of bridge configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployBridgeFromConfig(
    bridgesNetworkConfig: INetworkOptions[],
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployBridgeFromConfig()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Bridge...`);

        this.log.debug(
          `${fnTag}, Deploying Bridges with the following configuration: ${JSON.stringify(bridgesNetworkConfig)}`,
        );
        //const deploymentPromises = [];
        for (const config of bridgesNetworkConfig) {
          //deploymentPromises.push(this.bridgeManager.deployLeaf(config));
          await this.bridgeManager?.deployLeaf(config);
        }
        //await Promise.all(deploymentPromises);

        const networkIds = [];
        for (const config of bridgesNetworkConfig) {
          networkIds.push({ ...config.networkIdentification });
        }
        this.gatewayOrchestrator?.addGatewayOwnChannels(networkIds);
        span.setStatus({ code: SpanStatusCode.OK });
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
   * Deploys oracles based on the provided configuration.
   *
   * @param oraclesConfig - An array of oracle configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployOracleFromConfig(
    oraclesConfig: INetworkOptions[],
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployOracleFromConfig()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Oracles...`);

        for (const config of oraclesConfig) {
          await this.oracleManager?.deployOracle(config);
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
    if (!this.bridgeManager) {
      throw new Error("Bridge Manager is not initialized");
    }
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
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#getOracleManager()`;
    this.log.debug(`${fnTag}, Getting Oracle Manager...`);
    if (!this.oracleManager) {
      throw new Error("Oracle Manager is not initialized");
    }
    return this.oracleManager;
  }
}
