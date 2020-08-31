/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * DBAccess.ts
 */

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../config/default.json"), 'utf8'));

export class DBAccess {
    ledgerPluginInfo: [];
    blpRegistryInfo: [];

    constructor() {
        // TODO: DB Access Initialization
    }

    getLedgerPluginInfo(): [] {
        // TODO: Future access to DB for connection information

        this.ledgerPluginInfo = config.ledgerPluginInfo;
        return this.ledgerPluginInfo;
    }

    getBLPRegistryInfo(): [] {
        // TODO: Future access to DB for business logic plugin information

        this.blpRegistryInfo = config.blpRegistry;
        return this.blpRegistryInfo;
    }
}