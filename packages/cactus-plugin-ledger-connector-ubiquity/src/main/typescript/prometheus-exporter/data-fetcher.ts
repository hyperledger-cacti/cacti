import { Calls } from "./response.type.js";

import {
  totalTxCount,
  K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS,
} from "./metrics.js";

export async function collectMetrics(calls: Calls): Promise<void> {
  totalTxCount.labels(K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS).set(calls.counter);
}
