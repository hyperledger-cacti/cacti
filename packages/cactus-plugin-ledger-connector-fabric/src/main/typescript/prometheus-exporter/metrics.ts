import { Gauge } from "prom-client";

export const totalTxCount = new Gauge({
  name: "cactus_fabric_total_tx_count",
  help: "Total transactions executed",
  labelNames: ["type"],
});
