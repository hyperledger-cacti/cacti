import { Gauge } from "prom-client";

export const K_CACTUS_CONSORTIUM_STATIC_TOTAL_NODE_COUNT =
  "cactus_consortium_manual_total_node_count";

/**
 * @deprecated Use K_CACTUS_CONSORTIUM_STATIC_TOTAL_NODE_COUNT instead.
 */
export const K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT =
  K_CACTUS_CONSORTIUM_STATIC_TOTAL_NODE_COUNT;

export const totalTxCount = new Gauge({
  registers: [],
  name: K_CACTUS_CONSORTIUM_STATIC_TOTAL_NODE_COUNT,
  help: "Total cactus node count",
  labelNames: ["type"],
});
