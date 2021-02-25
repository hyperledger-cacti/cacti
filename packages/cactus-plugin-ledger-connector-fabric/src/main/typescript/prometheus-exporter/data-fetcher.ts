import { Transactions } from "./response.type";

import { totalTxCount } from "./metrics";

export async function collectMetrics(transactions: Transactions) {
  totalTxCount.labels("cactus_fabric_total_tx_count").set(transactions.counter);
}
