/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * DBAccess.ts
 */

const config = require('config');

export class DBAccess {
    ledgerPluginInfo: [];

    constructor() {
        // TODO: DB Access Initialization
    }

    getLedgerPluginInfo(): [] {
        // TODO: Future access to DB for connection information

        this.ledgerPluginInfo = config.ledgerPluginInfo;
        return this.ledgerPluginInfo;
    }
}