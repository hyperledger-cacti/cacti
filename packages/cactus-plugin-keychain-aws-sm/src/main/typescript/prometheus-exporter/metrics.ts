import { Gauge } from "prom-client";

export const K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT =
  "cactus_keychain_awssm_managed_key_count";

export const totalKeyCount = new Gauge({
  registers: [],
  name: K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT,
  help: "The number of keys that were set in the backing Aws Secret Manager deployment via this specific keychain plugin instance",
  labelNames: ["type"],
});
