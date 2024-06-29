// TODO: define alias types for SATPLedgerConnector, which encapsulates IPluginLedgerConnector

import {
  FabricSigningCredential,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SupportedChain } from "../core/types";

// inject gateway, get connectors
export type SATPLedgerConnector = string;

// TODO Define lock interfaces and strategy pattern for locking (as function of locking blockchain) (see what smart contract implementations return)

export interface FabricConfig extends BridgeConfig {
  signingCredential: FabricSigningCredential;
  channelName: string;
  options: IPluginLedgerConnectorFabricOptions;
}
export interface BesuConfig extends BridgeConfig {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractAddress: string;
  gas: number;
  options: IPluginLedgerConnectorBesuOptions;
}

export interface BridgeConfig {
  network: SupportedChain;
  logLevel?: LogLevelDesc;
  contractName: string;
  bungeeOptions: IPluginBungeeHermesOptions;
}

export interface TransactionResponse {
  transactionId?: string;
  transactionReceipt?: string;
  output?: unknown;
}
