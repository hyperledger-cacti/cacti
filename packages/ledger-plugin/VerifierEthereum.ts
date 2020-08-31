/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierEthereum.ts
 */

import { ApiInfo } from './LedgerPlugin'
import { makeApiInfoList } from './DriverCommon'
import { VerifierBase } from './VerifierBase';

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'VerifierEthereum';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Definition of ApiInfo
const apiInfoListForEthereum: {} = [
    {
        apiType: "getNumericBalance",
        requestedData: [
            {
                dataName: "referedAddress",
                dataType: "string",
            },
        ],
    },
    {
        apiType: "transferNumericAsset",
        requestedData: [
            {
                dataName: "fromAddress",
                dataType: "string",
            },
            {
                dataName: "toAddress",
                dataType: "string",
            },
            {
                dataName: "amount",
                dataType: "number",
            },
        ],
    },
    {
        apiType: "sendRawTransaction",
        requestedData: [
            {
                dataName: "serializedTx",
                dataType: "string",
            },
        ],
    },
];

export class VerifierEthereum extends VerifierBase {

    constructor(ledgerInfo: string) {
        super(ledgerInfo);
    }

    getApiList(): ApiInfo[] {
        logger.debug('call : getApiList');
        // NOTE: Return API information that can be used with Ethereum version of requestLedgerOperation.
        //       Ethereum version returns 3 kinds of API information.
        //          - getNumericBalance
        //          - transferNumericAsset
        //          - sendRawTransaction
        return makeApiInfoList(apiInfoListForEthereum);
    }
}
