import { LedgerType } from "@hyperledger/cactus-core-api";
import { FabricSigningCredential } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

export interface TransactionReceipt {
  caseID: string;
  blockchainID: LedgerType;
  invocationType: string;
  methodName: string;
  parameters: string[];
  timestamp: Date;
}

export interface FabricV2TxReceipt extends TransactionReceipt {
  channelName: string;
  transactionID: string;
  contractName: string;
  signingCredentials: FabricSigningCredential;
  cost?: number;
}

export interface BesuV2TxReceipt extends TransactionReceipt {
  transactionID: string;
  gasUsed: number;
  from: string;
  gasPrice?: number;
}

export interface EthereumTxReceipt extends TransactionReceipt {
  transactionID: string;
  gasUsed: number | string;
  from: string;
  effectiveGasPrice?: string;
}
