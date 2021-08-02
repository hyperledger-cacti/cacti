import { Transactions } from "./response.type";

import { totalCcTxCount, K_CACTUS_CC_TX_VIZ_TOTAL_TX_COUNT } from "./metrics";

export async function collectMetrics(nodeCount: Transactions): Promise<void> {
  totalCcTxCount
    .labels(K_CACTUS_CC_TX_VIZ_TOTAL_TX_COUNT)
    .set(nodeCount.counter);
}
