import { NodeCount } from "./response.type.js";

import {
  totalTxCount,
  K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT,
} from "./metrics.js";

export async function collectMetrics(nodeCount: NodeCount): Promise<void> {
  totalTxCount
    .labels(K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT)
    .set(nodeCount.counter);
}
