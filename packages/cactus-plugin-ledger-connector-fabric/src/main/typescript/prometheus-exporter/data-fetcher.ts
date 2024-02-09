import { Transactions } from "./response.type.js";

import { totalTxCount, K_CACTUS_FABRIC_TOTAL_TX_COUNT } from "./metrics.js";

export async function collectMetrics(
  transactions: Transactions,
): Promise<void> {
  totalTxCount.labels(K_CACTUS_FABRIC_TOTAL_TX_COUNT).set(transactions.counter);
}
