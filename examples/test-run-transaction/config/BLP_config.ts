/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLP_config.ts
 */

import { BusinessLogicPlugin } from '../../../packages/business-logic-plugin/BusinessLogicPlugin';
import { BusinessLogicRunTransaction } from '../BusinessLogicRunTransaction';
// import { BusinessLogicCartrade } from '../examples/cartrade/BusinessLogicXxxxTrade';

export function getTargetBLPInstance(businessLogicID: string): BusinessLogicPlugin | null {
    switch (businessLogicID) {
        case "j71S9gLN":
            return new BusinessLogicRunTransaction(businessLogicID);
        // case "xxxxxxxx":
        //    return new BusinessLogicXxxxTrade();
        default:
            return null;
    }
}
