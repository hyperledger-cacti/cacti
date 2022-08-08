import { Calls } from "./response.type";

import { totalTxCount, K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS } from "./metrics";

export async function collectMetrics(calls: Calls): Promise<void> {
  totalTxCount.labels(K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS).set(calls.counter);
}
