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
  transaction_hash: string | null;
  token_address: string | null;
  created_at: string | null;
  sender: string | null;
  recipient: string | null;
}

export interface TokenHistoryItem721 extends TokenHistoryItem {
  token_id: number | null;
}

export interface TokenHistoryItem20 extends TokenHistoryItem {
  value: number | null;
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

export interface balanceDate {
  created_at: string;
  balance: number;
}
