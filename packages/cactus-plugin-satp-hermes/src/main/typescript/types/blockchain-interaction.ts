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

// inject gateway, get connectors
export type SATPLedgerConnector = string;

// TODO Define lock interfaces and strategy pattern for locking (as function of locking blockchain) (see what smart contract implementations return)

export interface FabricConfig {
  signingCredential: FabricSigningCredential;
  channelName: string;
  contractName: string;
  options: IPluginLedgerConnectorFabricOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
  logLevel?: LogLevelDesc;
}
export interface BesuConfig {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: IPluginLedgerConnectorBesuOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
  logLevel?: LogLevelDesc;
}

export interface TransactionResponse {
  transactionId?: string;
  transactionReceipt?: string;
  output?: unknown;
}
