import { NetworkId } from "../../public-api";

export interface TransactionResponse {
  transactionId?: string;
  transactionReceipt?: string;
  output?: unknown;
}

export interface INetworkOptions {
  networkIdentification: NetworkId;
}
