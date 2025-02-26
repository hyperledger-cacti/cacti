// TODO: define alias types for SATPLedgerConnector, which encapsulates IPluginLedgerConnector

import {
  FabricSigningCredential,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import {
  IPluginLedgerConnectorEthereumOptions,
  Web3SigningCredential as Web3SigningCredentialEth,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { EvmAsset } from "../cross-chain-mechanisms/satp-bridge/types/evm-asset";
import { FabricAsset } from "../cross-chain-mechanisms/satp-bridge/types/fabric-asset";
import { ClaimFormat } from "../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkId } from "../services/network-identification/chainid-list";

// inject gateway, get connectors
export type SATPLedgerConnector = string;

// TODO Define lock interfaces and strategy pattern for locking (as function of locking blockchain) (see what smart contract implementations return)

export interface NetworkConfig {
  network: NetworkId;
  claimFormat: ClaimFormat;
}
export interface FabricConfig extends NetworkConfig {
  signingCredential: FabricSigningCredential;
  channelName: string;
  contractName: string;
  options: IPluginLedgerConnectorFabricOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
  fabricAssets?: FabricAsset[];
}
export interface BesuConfig extends NetworkConfig {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: IPluginLedgerConnectorBesuOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
  besuAssets?: EvmAsset[];
}

export interface EthereumConfig extends NetworkConfig {
  keychainId: string;
  signingCredential: Web3SigningCredentialEth;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: IPluginLedgerConnectorEthereumOptions;
  bungeeOptions: IPluginBungeeHermesOptions;
  ethereumAssets?: EvmAsset[];
}

export interface TransactionResponse {
  transactionId?: string;
  transactionReceipt?: string;
  output?: unknown;
}
