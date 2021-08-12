import { Gauge } from "prom-client";

export const K_CACTUS_BESU_TOTAL_TX_COUNT = "cactus_besu_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: "cactus_besu_total_tx_count",
  help: "Total transactions executed",
  labelNames: ["type"],
});
