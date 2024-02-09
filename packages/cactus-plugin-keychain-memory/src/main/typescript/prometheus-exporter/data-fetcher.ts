import { KeyCount } from "./response.type.js";

import {
  totalKeyCount,
  K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT,
} from "./metrics.js";

export async function collectMetrics(keyCount: KeyCount): Promise<void> {
  totalKeyCount
    .labels(`${K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT}`)
    .set(keyCount.counter);
}
