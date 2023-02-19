import { WalletBalance, RpcResponse } from "./moreModel";

/*
export interface LoginResponse extends RpcResponse {
  backup_info?: BackupInfo;
  backup_path?: string;
}
*/

// Looks like a bug in Chia RPC server where it doesn't provide the standard response with success flag
export interface PublicKeysResponse {
  public_key_fingerprints: string[];
}

export interface PrivateKeyResponse extends RpcResponse {
  private_key: string[];
}

export interface GenerateMnemonicResponse extends RpcResponse {
  mnemonic: string[];
}

export interface AddKeyResponse extends RpcResponse {
  word?: string;
}

export interface SyncStatusResponse extends RpcResponse {
  syncing: boolean;
  synced: boolean;
  genesis_initialized: boolean;
}

export interface HeightResponse extends RpcResponse {
  height: number;
}

export interface WalletsResponse extends RpcResponse {
  wallets: WalletInfo[];
}

export interface WalletBalanceResponse extends RpcResponse {
  wallet_balance: WalletBalance;
}

/*
export interface TransactionResponse extends RpcResponse {
  transaction: Transaction;
  transaction_id: string;
}

export interface TransactionsResponse extends RpcResponse {
  transactions: Transaction[];
  wallet_id: number;
}
*/

export interface NextAddressResponse extends RpcResponse {
  wallet_id: number;
  address: string;
}

export interface FarmedAmountResponse extends RpcResponse {
  farmed_amount: number;
  pool_reward_amount: number;
  farmer_reward_amount: number;
  fee_amount: number;
  last_height_farmed: number;
}

export interface TransactionCountResponse extends RpcResponse {
  wallet_id: number;
  count: number;
}

export interface CreateNewCCWalletResponse extends RpcResponse {
  colour: string;
  type: number;
  wallet_id: number;
}

export interface CreateExistingCCWalletResponse extends RpcResponse {
  type: number;
}

export interface CreateNewAdminRlWalletResponse extends RpcResponse {
  success: boolean;
  id: number;
  type: number;
  origin: any;
  pubkey: string;
}

export interface CreateNewUserRlWalletResponse extends RpcResponse {
  id: number;
  type: number;
  pubkey: string;
}
/*
export interface CreateSignedTransactionResponse extends RpcResponse {
  signed_tx: Object;
}
*/
export interface CCGetNameResponse extends RpcResponse {
  wallet_id: number;
  name: string;
}

export interface CCSpendResponse extends RpcResponse {
  transaction: string;
  transaction_id: string;
}

export interface CCGetColourResponse extends RpcResponse {
  wallet_id: number;
  colour: string;
}

/*
export interface CCDiscrepancyResponse extends RpcResponse {
  discrepancies: Object;
}
*/
