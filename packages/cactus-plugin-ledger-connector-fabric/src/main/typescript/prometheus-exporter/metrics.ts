import { Gauge } from "prom-client";

export const K_CACTUS_FABRIC_TOTAL_TX_COUNT = "cactus_fabric_total_tx_count";

export const totalTxCount = new Gauge({
  name: K_CACTUS_FABRIC_TOTAL_TX_COUNT,
  help: "Total transactions executed",
  labelNames: ["type"],
});
