/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from '../business-logic-plugin/BusinessLogicPlugin';
import { BusinessLogicCartrade } from '../examples/cartrade/BusinessLogicCartrade';
// import { BusinessLogicCartrade } from '../examples/cartrade/BusinessLogicXxxxTrade';

export function getTargetBLPInstance(businessLogicID: string): BusinessLogicPlugin | null {
    switch (businessLogicID) {
        case "guks32pf":
            return new BusinessLogicCartrade();
        // case "***":
        //    return new BusinessLogic***Trace();
        default:
            return null;
    }
}
