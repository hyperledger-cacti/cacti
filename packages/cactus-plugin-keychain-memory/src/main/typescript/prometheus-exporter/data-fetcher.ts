import { KeyCount } from "./response.type";

import {
  totalKeyCount,
  K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT,
} from "./metrics";

export async function collectMetrics(keyCount: KeyCount) {
  totalKeyCount
    .labels(`${K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT}`)
    .set(keyCount.counter);
}
