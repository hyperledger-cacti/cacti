import { Gauge } from "prom-client";

export const K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT =
  "cactus_keychain_memory_total_key_count";

export const totalKeyCount = new Gauge({
  registers: [],
  name: K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT,
  help: "Total keys present in memory",
  labelNames: ["type"],
});
