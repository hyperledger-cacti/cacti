/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from "../business-logic-plugin/BusinessLogicPlugin";

export type GetTargetBLPInstanceFactory = (
  businessLogicID: string,
) => BusinessLogicPlugin | null;

export function getTargetBLPInstance(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  businessLogicID: string,
): BusinessLogicPlugin | null {
  return null;
}
