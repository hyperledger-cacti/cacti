import { Gauge } from "prom-client";

export const K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS =
  "ubiquity_total_method_calls";

export const totalTxCount = new Gauge({
  name: K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS,
  help: "Total method calls",
  labelNames: ["type"],
});
