import { Gauge } from "prom-client";

export const K_CACTI_ETHEREUM_TOTAL_TX_COUNT = "cactus_eth_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: K_CACTI_ETHEREUM_TOTAL_TX_COUNT,
  help: "Total transactions executed",
  labelNames: ["type"],
});
