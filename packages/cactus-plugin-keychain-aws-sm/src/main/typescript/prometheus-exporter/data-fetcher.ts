import { AwsSmKeys } from "./response.type";

import {
  totalKeyCount,
  K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT,
} from "./metrics";

export async function collectMetrics(awsSmKeys: AwsSmKeys): Promise<void> {
  totalKeyCount
    .labels(K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT)
    .set(awsSmKeys.size);
}
