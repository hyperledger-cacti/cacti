/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from "./BusinessLogicPlugin";

let _blp: BusinessLogicPlugin | null = null;

export function getTargetBLPInstance(
  businessLogicID: string,
): BusinessLogicPlugin | null {
  return _blp;
}

export function setTargetBLPInstance(
  businessLogicID: string,
  blp: BusinessLogicPlugin,
) {
  _blp = blp;
}