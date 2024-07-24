import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
// import { BesuBridge } from "../core/stage-services/satp-bridge/besu-bridge";
// import { FabricBridge } from "../core/stage-services/satp-bridge/fabric-bridge";
// import { NetworkBridge } from "../core/stage-services/satp-bridge/network-bridge-interface";
// import { SATPBridge } from "../core/stage-services/satp-bridge/satp-bridge";
import { SupportedChain } from "../core/types";
// import {
//   FabricConfig,
//   BesuConfig,
//   BridgeConfig,
// } from "../types/blockchain-interaction";
import { ValidatorOptions } from "class-validator";

export interface ISATPBridgesOptions {
  logLevel?: LogLevelDesc;
  //networks: BridgeConfig[];
  validationOptions?: ValidatorOptions;
  supportedDLTs: SupportedChain[];
}

export class SATPBridgesManager {
  static CLASS_NAME: string = "SATPBridgesManager";

  // bridges: Map<string, SATPBridge> = new Map<string, SATPBridge>();
  log: Logger;

  constructor(private config: ISATPBridgesOptions) {
    this.log = LoggerProvider.getOrCreate({
      level: config.logLevel,
      label: SATPBridgesManager.CLASS_NAME,
    });

    // config.networks.map((bridgeConfig) => {
    //   let bridge: NetworkBridge;
    //   switch (bridgeConfig.network) {
    //     case SupportedChain.FABRIC:
    //       bridge = new FabricBridge(bridgeConfig as FabricConfig);
    //       break;
    //     case SupportedChain.BESU:
    //       bridge = new BesuBridge(bridgeConfig as BesuConfig);
    //       break;
    //     default:
    //       throw new Error(`Unsupported network: ${bridgeConfig.network}`);
    //   }
    //   const config: SATPBridgeConfig = {
    //     network: bridge,
    //     logLevel: bridgeConfig.logLevel,
    //   };
    //   const satp = new SATPBridge(config);
    //   this.bridges.set(bridgeConfig.network, satp);
    // });
  }

  // public getBridge(network: string): SATPBridge {
  //   if (!this.bridges.has(network)) {
  //     throw new Error(`Bridge for network ${network} not found`);
  //   }
  //   return this.bridges.get(network) as SATPBridge;
  // }

  // public getBridgesList(): string[] {
  //   return Array.from(this.bridges.keys());
  // }

  // public addBridgeFromConfig(bridgeConfig: BridgeConfig) {
  //   let bridge: NetworkBridge;
  //   switch (bridgeConfig.network) {
  //     case SupportedChain.FABRIC:
  //       bridge = new FabricBridge(bridgeConfig as FabricConfig);
  //       break;
  //     case SupportedChain.BESU:
  //       bridge = new BesuBridge(bridgeConfig as BesuConfig);
  //       break;
  //     default:
  //       throw new Error(`Unsupported network: ${bridgeConfig.network}`);
  //   }
  //   const config: SATPBridgeConfig = {
  //     network: bridge,
  //     logLevel: bridgeConfig.logLevel,
  //   };
  //   const satp = new SATPBridge(config);
  //   this.bridges.set(bridgeConfig.network, satp);
  // }

  // public addBridge(network: string, bridge: SATPBridge): void {
  //   this.bridges.set(network, bridge);
  // }
}
