/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierFabric.ts
 */

import { ApiInfo } from './LedgerPlugin'
import { makeApiInfoList } from './DriverCommon'
import { VerifierBase } from './VerifierBase';

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'VerifierFabric';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Definition of ApiInfo
const apiInfoListForFabric: {} = [
    {
        apiType: "changeCarOwner",
        requestedData: [
            {
                dataName: "carId",
                dataType: "string",
            },
            {
                dataName: "newOwner",
                dataType: "string",
            },
        ],
    },
    {
        apiType: "sendSignedProposal",
        requestedData: [
            {
                dataName: "signedCommitProposal",
                dataType: "string",
            },
            {
                dataName: "commitReq",
                dataType: "string",
            },
        ],
    },
];

export class VerifierFabric extends VerifierBase {

    constructor(ledgerInfo: string) {
        super(ledgerInfo);
    }

    getApiList(): ApiInfo[] {
        logger.debug('call : getApiList');
        // TODO:
        // NOTE: Return API information that can be used with Fabric version of requestLedgerOperation.
        //       Fabric version returns 2 kinds of API information.
        //          - changeCarOwner
        //          - sendSignedProposal
        return makeApiInfoList(apiInfoListForFabric);
    }
}
