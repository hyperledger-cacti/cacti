export interface Transaction {
  index: number;
  hash: string;
  block_number: number;
  from: string;
  to: string;
  eth_value: number;
  method_signature: string;
  method_name: string;
  id: string;
}

export interface Block {
  number: number;
  created_at: string;
  hash: string;
  number_of_tx: number;
  sync_at: string;
}

export interface TokenHistoryItem20 {
  transaction_hash: string;
  token_address: string;
  created_at: string;
  sender: string;
  recipient: string;
  value: number;
}

export interface TokenMetadata721 {
  address: string;
  name: string;
  symbol: string;
  created_at: string;
}

// Materialized View
export interface TokenERC20 {
  account_address: string;
  balance: number;
  name: string;
  symbol: string;
  total_supply: number;
  token_address: string;
}
