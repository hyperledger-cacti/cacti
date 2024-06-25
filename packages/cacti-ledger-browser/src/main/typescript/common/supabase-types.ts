export interface ERC20Txn {
  account_address: string;
  token_address: string;
  uri: string;
  token_id: number;
  id: string;
  balance: number;
  last_owner_change: string;
}

export interface ERC721Txn {
  account_address: string;
  token_address: string;
  uri: string;
  token_id: number;
  id: string;
  last_owner_change: string;
}

export interface TokenMetadata20 {
  address: string;
  name: string;
  symbol: string;
  total_supply: number;
  created_at: string;
}

export interface TokenMetadata721 {
  address: string;
  name: string;
  symbol: string;
  created_at: string;
}

export interface Block {
  number: number;
  created_at: string;
  hash: string;
  number_of_tx: number;
  sync_at: string;
}

export interface TokenTransfer {
  transaction_id: string;
  sender: string;
  recipient: string;
  value: number;
  id: string;
}

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

export interface TokenHistoryItem {
  transaction_hash: string;
  token_address: string;
  created_at: string;
  sender: string;
  recipient: string;
}

export interface TokenHistoryItem721 extends TokenHistoryItem {
  token_id: number;
}

export interface TokenHistoryItem20 extends TokenHistoryItem {
  value: number;
}

export interface TokenTransactionMetadata721 {
  account_address: string;
  token_address: string;
  uri: string;
  symbol: string;
}

export interface TableProperty {
  display: string;
  objProp: string[];
}

export interface TableRowClick {
  action: (param: string) => void;
  prop: string;
}
export interface TableProps {
  onClick: TableRowClick;
  schema: TableProperty[];
}

/// MANUAL EDITS

// Materialized View
export interface TokenERC20 {
  account_address: string;
  balance: number;
  name: string;
  symbol: string;
  total_supply: number;
  token_address: string;
}
