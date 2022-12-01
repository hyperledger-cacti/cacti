import { Gauge } from "prom-client";

export const K_CACTUS_CHIA_TOTAL_TX_COUNT = "cactus_chia_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: "cactus_chia_total_tx_count",
  help: "Total transactions executed",
  labelNames: ["type"],
});
