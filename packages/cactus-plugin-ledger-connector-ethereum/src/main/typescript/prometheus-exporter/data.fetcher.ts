import { Transactions } from "./response.type.js";

import { totalTxCount, K_CACTI_ETHEREUM_TOTAL_TX_COUNT } from "./metrics.js";

export async function collectMetrics(
  transactions: Transactions,
): Promise<void> {
  transactions.counter++;
  totalTxCount
    .labels(K_CACTI_ETHEREUM_TOTAL_TX_COUNT)
    .set(transactions.counter);
}
