import { Gauge } from "prom-client";

export const K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT =
  "cactus_keychain_vault_managed_key_count";

export const totalKeyCount = new Gauge({
  registers: [],
  name: K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT,
  help:
    "The number of keys that were set in the backing Vault deployment via this specific keychain plugin instance",
  labelNames: ["type"],
});
