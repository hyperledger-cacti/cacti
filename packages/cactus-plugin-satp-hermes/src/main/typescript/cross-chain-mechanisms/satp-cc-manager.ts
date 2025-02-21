import {
  type LogLevelDesc,
  type Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { BesuBridge } from "./satp-bridge/besu-bridge";
import { FabricBridge } from "./satp-bridge/fabric-bridge";
import type { NetworkBridge } from "./satp-bridge/network-bridge";
import { SATPBridgeManager } from "./satp-bridge/satp-bridge-manager";
import type { SATPBridgeConfig } from "./satp-bridge/types/interact";
import type {
  FabricConfig,
  BesuConfig,
  NetworkConfig,
  EthereumConfig,
} from "../types/blockchain-interaction";
import type { ValidatorOptions } from "class-validator";
import { EthereumBridge } from "./satp-bridge/ethereum-bridge";
import type { NetworkId } from "../network-identification/chainid-list";
import { LedgerType } from "@hyperledger/cactus-core-api";

export const DEFAULT_SUPPORTED_LEDGERS: LedgerType[] = [
  //add supported ledgers as new bridges are implemented
  LedgerType.Ethereum,
  LedgerType.Fabric2,
  LedgerType.Besu2X,
  LedgerType.Besu1X,
];
export interface ISATPBridgesOptions {
  logLevel?: LogLevelDesc;
  networks: NetworkConfig[];
  validationOptions?: ValidatorOptions;
  connectedDLTs: NetworkId[];
  supportedDLTs?: LedgerType[];
}

// TODO extend to accomodate oracle
// does specific on-chain operations by calling bridge manager or oracle manager 
export class SATPCrossChainManager {
  static CLASS_NAME = "SATPCrossChainManager";
  private supportedDLTs: LedgerType[];
  bridges: Map<string, SATPBridgeManager> = new Map<
    string,
    SATPBridgeManager
  >();

  log: Logger;

  level: LogLevelDesc | undefined;

  constructor(private config: ISATPBridgesOptions) {
    this.log = LoggerProvider.getOrCreate({
      level: config.logLevel,
      label: SATPCrossChainManager.CLASS_NAME,
    });

    this.level = this.config.logLevel;
    if (this.config.supportedDLTs) {
      this.supportedDLTs = this.config.supportedDLTs;
    } else {
      this.supportedDLTs = DEFAULT_SUPPORTED_LEDGERS;
    }
    this.log.debug(`Creating ${SATPCrossChainManager.CLASS_NAME}...`);
    config.networks.map((bridgeConfig) => {
      this.addBridgeFromConfig(bridgeConfig);
    });
  }

  public getBridge(network: string): SATPBridgeManager {
    if (!this.bridges.has(network)) {
      throw new Error(`Bridge for network ${network} not found`);
    }
    return this.bridges.get(network) as SATPBridgeManager;
  }

  public getSupportedDLTs(): LedgerType[] {
    return this.supportedDLTs;
  }

  public getBridgesList(): string[] {
    return Array.from(this.bridges.keys());
  }

  public addBridgeFromConfig(networkConfig: NetworkConfig) {
    let bridge: NetworkBridge;
    switch (networkConfig.network.ledgerType) {
      case LedgerType.Fabric2:
        bridge = new FabricBridge(networkConfig as FabricConfig, this.level);
        break;
      case LedgerType.Besu2X:
        bridge = new BesuBridge(networkConfig as BesuConfig, this.level);
        break;
      case LedgerType.Besu1X:
        bridge = new BesuBridge(networkConfig as BesuConfig, this.level);
        break;
      case LedgerType.Ethereum:
        bridge = new EthereumBridge(networkConfig as EthereumConfig);
        break;
      default:
        throw new Error(
          `Unsupported network technology: ${networkConfig.network.ledgerType}`,
        );
    }
    const config: SATPBridgeConfig = {
      network: bridge,
      logLevel: this.level,
    };
    const satp = new SATPBridgeManager(config);
    this.bridges.set(networkConfig.network.id, satp);
  }

  public addBridge(network: string, bridge: SATPBridgeManager): void {
    this.bridges.set(network, bridge);
  }
}
