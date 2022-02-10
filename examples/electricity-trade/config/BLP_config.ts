/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from "../../../packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BusinessLogicPlugin";
import { BusinessLogicElectricityTrade } from "../BusinessLogicElectricityTrade";

export function getTargetBLPInstance(
  businessLogicID: string
): BusinessLogicPlugin | null {
  switch (businessLogicID) {
    case "h40Q9eMD":
      return new BusinessLogicElectricityTrade(businessLogicID);
    // case "xxxxxxxx":
    //    return new BusinessLogicXxxxTrace();
    default:
      return null;
  }
}
