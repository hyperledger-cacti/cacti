import { Gauge } from "prom-client";

export const K_CACTUS_QUORUM_TOTAL_TX_COUNT = "cactus_quorum_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: K_CACTUS_QUORUM_TOTAL_TX_COUNT,
  help: "Total transactions executed",
  labelNames: ["type"],
});
