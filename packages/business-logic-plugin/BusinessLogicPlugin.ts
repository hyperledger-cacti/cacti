/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicPlugin.ts
 */

import { Request } from 'express';

export interface BusinessLogicPlugin {
    startTransaction(req: Request, businessLogicID: string, tradeID: string): void;
}
