/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicPlugin.ts
 */

// import { TransactionInfoManagement } from './TransactionInfoManagement';
import { RequestInfo } from '../routing-interface/RequestInfo';

export interface BusinessLogicPlugin {
    startTransaction(requestInfo: RequestInfo): void;
}
