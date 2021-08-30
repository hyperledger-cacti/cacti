import { Gauge } from "prom-client";

export const K_CACTUS_IROHA_TOTAL_TX_COUNT = "cactus_iroha_total_tx_count";

export const totalTxCount = new Gauge({
  registers: [],
  name: "cactus_iroha_total_tx_count",
  help: "Total transactions executed",
  labelNames: ["type"],
});
