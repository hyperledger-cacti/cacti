/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from "../../../packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BusinessLogicPlugin";
import { BusinessLogicCartrade } from "../BusinessLogicCartrade";
// import { BusinessLogicCartrade } from '../examples/discounted-cartrade/BusinessLogicXxxxTrade';

export function getTargetBLPInstance(
  businessLogicID: string
): BusinessLogicPlugin | null {
  switch (businessLogicID) {
    case "guks32pf":
      return new BusinessLogicCartrade();
    // case "xxxxxxxx":
    //    return new BusinessLogicXxxxTrace();
    default:
      return null;
  }
}
