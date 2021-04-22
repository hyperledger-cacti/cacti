import { Gauge } from "prom-client";

export const K_CACTUS_POLKADOT_TOTAL_TX_COUNT =
  "cactus_polkadot_total_tx_count";

export const totalTxCount = new Gauge({
  name: "cactus_polkadot_total_tx_count",
  help: "Total transactions executed",
  labelNames: ["type"],
});
