import { LedgerType } from "@hyperledger/cactus-core-api";
import { Web3SigningCredential } from "@hyperledger/cactus-plugin-ledger-connector-besu/src/main/typescript/public-api";
import {
  FabricSigningCredential,
  GatewayOptions,
  TransactReceiptBlockMetaData,
  TransactReceiptTransactionCreator,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric/src/main/typescript/generated/openapi/typescript-axios/api";

export interface TransactionReceipt {
  caseID: string;
  blockchainID: LedgerType;
  invocationType: string;
  methodName: string;
  parameters: string[];
  timestamp: Date;
}

export interface IsVisualizable {
  // list of transaction receipts, that will be sent to cc-tx-viz
  collectTransactionReceipts: boolean;
}

// TODO define Tx Receipt for Fabric
export interface FabricV2TxReceipt extends TransactionReceipt {
  channelName: string;
  transactionID: string | undefined;
  contractName: string;
  endorsingPeers?: string[];
  endorsingParties?: string[];
  transientData?: any | null;
  gatewayOptions?: GatewayOptions;
  signingCredentials: FabricSigningCredential;
  blockNumber?: string;
  transactionCreator?: TransactReceiptTransactionCreator;
  blockMetaData?: TransactReceiptBlockMetaData;
  chainCodeName?: string;
  chainCodeVersion?: string;
  responseStatus?: string;
}
export interface BesuV2TxReceipt extends TransactionReceipt {
  status: boolean;
  transactionHash: string;
  transactionIndex: number;
  blockNumber: number;
  blockHash: string;
  contractName: string;
  contractAddress?: string;
  contractAbi?: string[];
  value?: number | string;
  gas?: number | string;
  gasPrice?: number | string;
  gasUsed?: number | string;
  cumulativeGasUsed?: number | string;
  from: string;
  to: string;
  signingCredentials?: Web3SigningCredential;
  keychainID?: string;
  privateTransactionConfig?: string[];
  timeoutMs?: number | string;
}

export function toSeconds(date: number): number {
  return Math.floor(date / 1000);
}
export function millisecondsLatency(date: Date): number {
  return new Date().getTime() - date.getTime();
}
