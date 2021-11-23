import { Gauge } from "prom-client";

export const K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS =
  "cactus_api_server_total_plugin_imports";

export const totalTxCount = new Gauge({
  registers: [],
  name: K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS,
  help: "Total number of plugins imported",
  labelNames: ["type"],
});
