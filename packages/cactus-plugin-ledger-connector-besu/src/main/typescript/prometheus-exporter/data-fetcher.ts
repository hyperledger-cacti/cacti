import { Transactions } from "./response.type.js";

import { totalTxCount, K_CACTUS_BESU_TOTAL_TX_COUNT } from "./metrics.js";

export async function collectMetrics(
  transactions: Transactions,
): Promise<void> {
  transactions.counter++;
  totalTxCount.labels(K_CACTUS_BESU_TOTAL_TX_COUNT).set(transactions.counter);
}
