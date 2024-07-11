import { TokenHistoryItem20 } from "../../supabase-types";

export type BalanceHistoryListData = {
  created_at: string;
  balance: number;
};

/**
 * Create list of total token balance history after any operation (send / receive).
 * Can be used to graph balance history.
 */
export function createBalanceHistoryList(
  txHistory: TokenHistoryItem20[],
  ownerAddress: string,
) {
  if (!txHistory) {
    return [];
  }

  let balance = 0;
  const balances = txHistory.map((txn) => {
    let txn_value = txn.value || 0;
    if (txn.recipient !== ownerAddress) {
      txn_value *= -1;
    }
    balance += txn_value;
    return {
      created_at: txn.created_at + "Z",
      balance: balance,
    };
  });

  return balances as BalanceHistoryListData[];
}
