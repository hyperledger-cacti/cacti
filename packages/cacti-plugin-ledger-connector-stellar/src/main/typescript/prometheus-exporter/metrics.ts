import { Gauge } from "prom-client";

export const K_CACTUS_STELLAR_TOTAL_TX_COUNT = "cacti_stellar_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: "cacti_stellar_total_tx_count",
  help: "Total transactions executed",
  labelNames: ["type"],
});
