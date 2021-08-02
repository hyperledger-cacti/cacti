import { Gauge } from "prom-client";

export const K_CACTUS_CC_TX_VIZ_TOTAL_TX_COUNT =
  "cactus_cc_tx_viz_total_tx_count";

export const totalCcTxCount = new Gauge({
  name: K_CACTUS_CC_TX_VIZ_TOTAL_TX_COUNT,
  help: "Total cactus node count",
  labelNames: ["type"],
});
