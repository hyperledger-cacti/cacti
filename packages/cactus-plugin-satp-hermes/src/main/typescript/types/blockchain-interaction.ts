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

// inject gateway, get connectors
export type SATPLedgerConnector = string;

// TODO Define lock interfaces and strategy pattern for locking (as function of locking blockchain) (see what smart contract implementations return)

export interface NetworkConfig {
  network: string;
}
export interface FabricConfig extends NetworkConfig {
  signingCredential: FabricSigningCredential;
  channelName: string;
  contractName: string;
  options: IPluginLedgerConnectorFabricOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
}
export interface BesuConfig extends NetworkConfig {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: IPluginLedgerConnectorBesuOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
}

export interface TransactionResponse {
  transactionId?: string;
  transactionReceipt?: string;
  output?: unknown;
}
