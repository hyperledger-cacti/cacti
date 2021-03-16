import { Transactions } from "./response.type";

import { totalTxCount, K_CACTUS_FABRIC_TOTAL_TX_COUNT } from "./metrics";

export async function collectMetrics(transactions: Transactions) {
  totalTxCount.labels(K_CACTUS_FABRIC_TOTAL_TX_COUNT).set(transactions.counter);
}
