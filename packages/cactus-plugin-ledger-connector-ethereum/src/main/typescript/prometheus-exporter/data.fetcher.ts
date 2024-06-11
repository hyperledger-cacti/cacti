import { Transactions } from "./response.type";

import { totalTxCount, K_CACTI_ETHEREUM_TOTAL_TX_COUNT } from "./metrics";

export async function collectMetrics(
  transactions: Transactions,
): Promise<void> {
  transactions.counter++;
  totalTxCount
    .labels(K_CACTI_ETHEREUM_TOTAL_TX_COUNT)
    .set(transactions.counter);
}
