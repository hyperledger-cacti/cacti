import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { BesuBridge } from "../core/stage-services/satp-bridge/besu-bridge";
import { FabricBridge } from "../core/stage-services/satp-bridge/fabric-bridge";
import { NetworkBridge } from "../core/stage-services/satp-bridge/network-bridge";
import { SATPBridgeManager } from "../core/stage-services/satp-bridge/satp-bridge-manager";
import { SATPBridgeConfig, SupportedChain } from "../core/types";
import {
  FabricConfig,
  BesuConfig,
  NetworkConfig,
} from "../types/blockchain-interaction";
import { ValidatorOptions } from "class-validator";

export interface ISATPBridgesOptions {
  logLevel?: LogLevelDesc;
  networks: NetworkConfig[];
  validationOptions?: ValidatorOptions;
  supportedDLTs: SupportedChain[];
}

export class SATPBridgesManager {
  static CLASS_NAME: string = "SATPBridgesManager";

  bridges: Map<string, SATPBridgeManager> = new Map<
    string,
    SATPBridgeManager
  >();

  log: Logger;

  level: LogLevelDesc | undefined;

  constructor(private config: ISATPBridgesOptions) {
    this.log = LoggerProvider.getOrCreate({
      level: config.logLevel,
      label: SATPBridgesManager.CLASS_NAME,
    });

    this.level = this.config.logLevel;

    this.log.debug(`Creating ${SATPBridgesManager.CLASS_NAME}...`);

    config.networks.map((bridgeConfig) => {
      let bridge: NetworkBridge;
      switch (bridgeConfig.network) {
        case SupportedChain.FABRIC:
          bridge = new FabricBridge(bridgeConfig as FabricConfig, this.level);
          break;
        case SupportedChain.BESU:
          bridge = new BesuBridge(bridgeConfig as BesuConfig);
          break;
        default:
          throw new Error(`Unsupported network: ${bridgeConfig.network}`);
      }

      const config: SATPBridgeConfig = {
        network: bridge,
        logLevel: this.level,
      };
      const satp = new SATPBridgeManager(config);
      this.bridges.set(bridgeConfig.network, satp);
    });
  }

  public getBridge(network: string): SATPBridgeManager {
    if (!this.bridges.has(network)) {
      throw new Error(`Bridge for network ${network} not found`);
    }
    return this.bridges.get(network) as SATPBridgeManager;
  }

  public getBridgesList(): string[] {
    return Array.from(this.bridges.keys());
  }

  public addBridgeFromConfig(networkConfig: NetworkConfig) {
    let bridge: NetworkBridge;
    switch (networkConfig.network) {
      case SupportedChain.FABRIC:
        bridge = new FabricBridge(networkConfig as FabricConfig, this.level);
        break;
      case SupportedChain.BESU:
        bridge = new BesuBridge(networkConfig as BesuConfig, this.level);
        break;
      default:
        throw new Error(`Unsupported network: ${networkConfig.network}`);
    }
    const config: SATPBridgeConfig = {
      network: bridge,
      logLevel: this.level,
    };
    const satp = new SATPBridgeManager(config);
    this.bridges.set(networkConfig.network, satp);
  }

  public addBridge(network: string, bridge: SATPBridgeManager): void {
    this.bridges.set(network, bridge);
  }
}
