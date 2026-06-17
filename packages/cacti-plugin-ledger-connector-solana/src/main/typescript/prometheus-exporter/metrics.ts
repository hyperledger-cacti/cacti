import { Gauge } from "prom-client";

export const K_CACTI_SOLANA_TOTAL_TX_COUNT = "cacti_solana_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: K_CACTI_SOLANA_TOTAL_TX_COUNT,
  help: "Total number of transactions sent through this connector instance",
  labelNames: ["type"],
});
