/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from "./BusinessLogicPlugin";

// Singleton of BLPs
const _blpMapping = new Map<string, BusinessLogicPlugin>();

export function getTargetBLPInstance(
  businessLogicID: string,
): BusinessLogicPlugin | null {
  return _blpMapping.get(businessLogicID) ?? null;
}

export function setTargetBLPInstance(
  businessLogicID: string,
  blp: BusinessLogicPlugin,
) {
  _blpMapping.set(businessLogicID, blp);
}

export function deleteTargetBLPInstance(businessLogicID: string) {
  return _blpMapping.delete(businessLogicID);
}
