/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionManagement.ts
 */

import { Request } from 'express';
// import { BusinessLogicCartrade } from '../examples/cartrade/BusinessLogicCartrade';
import { BusinessLogicPlugin } from '../business-logic-plugin/BusinessLogicPlugin';
import { BusinessLogicInquireCartradeStatus } from '../../examples/cartrade/BusinessLogicInquireCartradeStatus';
import { BLPRegistry } from './util/BLPRegistry';
import { LPInfoHolder } from './util/LPInfoHolder';
import { VerifierBase } from '../ledger-plugin/VerifierBase';
import { VerifierFabric } from '../ledger-plugin/VerifierFabric';
import { VerifierEthereum } from '../ledger-plugin/VerifierEthereum';

import { getTargetBLPInstance } from '../../examples/cartrade/BLP_config';

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'TransactionManagement';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// TODO: for debug
// Create a function that performs code evaluation using Function
// function getClass(classname){return Function('return (' + classname + ')')();}

// function getTargetBLPClass() {
//    return BusinessLogicCartrade;
// }

export class TransactionManagement {
    blpRegistry: BLPRegistry = null;                    // Verifier information used in business logic
    connectInfo: LPInfoHolder = null;                   // connection information
    verifierFabric: VerifierFabric = null;              // Verifier for fabric
    verifierEthereum: VerifierEthereum = null;          // Verifier for ethereum
    // businessLogicCartrade: BusinessLogicCartrade = null // BusinessLogic for cartrade
    businessLogicPlugin: BusinessLogicPlugin = null // BusinessLogic for cartrade
    // blpMap : Map<string, object>;

    constructor() {
        this.blpRegistry = new BLPRegistry();
        this.connectInfo = new LPInfoHolder();
        // this.blpMap = new Map();
    }


    // Start business logic
    startBusinessLogic(req: Request): string {

        // businessLogicID
        const businessLogicID = req.body.businessLogicID;
        logger.info(`businessLogicID: ${businessLogicID}`);
        // tradeID Numbering/Setup
        const tradeID = this.createTradeID();
        logger.info(`tradeID: ${tradeID}`);

        // object judgment
        if (businessLogicID === "guks32pf") {
            if (this.businessLogicPlugin == null) {
                // Create an instance of BusinessLogicCartrade
                // this.businessLogicPlugin = new BusinessLogicCartrade();

                try {
                    const blp = getTargetBLPInstance(businessLogicID);
                    if (blp === null) {
                        logger.warn(`##WARN: not found BusinessLogicPlugin. businessLogicID: ${businessLogicID}`);
                        return;
                    }
                    this.businessLogicPlugin = blp;

                    // TODO: for debug
                    // Save Instance
                    // logger.debug(`##(F)businessLogicID: ${businessLogicID}`);
                    // this.blpMap.set(businessLogicID, this.businessLogicPlugin);
                }
                catch (err) {
                    logger.error(`##ERR in startBusinessLogic, err: ${err}`);
                }

                logger.debug("created instance");
            }

            // Start BusinessLogicCartrade
            this.businessLogicPlugin.startTransaction(req, businessLogicID, tradeID);
            logger.debug("start cartrade");
        }

        return tradeID;
    }

    static getClass(classname) {
        logger.debug(`##in getClass`);
        return Function('return (' + classname + ')')();
    }


    createTradeID(): string {
        // NOTE: tradeID is "(GMT date when the API was accepted) - (serial number)"

        // TODO: Trailing number-generating part not implemented
        //  NOTE: The last serial number is fixed "001" for 2020/9 months.
        const currentTime: Date = new Date();
        const tradeID: string = currentTime.getFullYear()
            + ('0' + (currentTime.getMonth() + 1)).slice(-2)
            + ('0' + currentTime.getDate()).slice(-2)
            + ('0' + currentTime.getHours()).slice(-2)
            + ('0' + currentTime.getMinutes()).slice(-2)
            + ('0' + currentTime.getSeconds()).slice(-2)
            + "-001";
        return tradeID;
    }



    // Get state of cartrade
    getCartradeOperationStatus(tradeID: string): string {

        const businessLogicInquireCartradeStatus: BusinessLogicInquireCartradeStatus = new BusinessLogicInquireCartradeStatus();
        const transactionStatusData: string = businessLogicInquireCartradeStatus.getCartradeOperationStatus(tradeID);

        return transactionStatusData;

    }



    // Get Verifier
    getVerifier(validatorId: string): VerifierBase {

        // Determine Verifier Type
        if (validatorId === "84jUisrs") {
            // for ethereum
            // Return Verifier for ethereum
            // If you have already made it, please reply. If you haven't made it yet, make it and reply.
            if (this.verifierEthereum == null) {
                const ledgerPluginInfoEthereum: string = this.connectInfo.getLegerPluginInfo(validatorId);
                this.verifierEthereum = new VerifierEthereum(ledgerPluginInfoEthereum);
                return this.verifierEthereum;
            }
            else {
                return this.verifierEthereum;
            }
        }
        else {
            // For fabric
            // Return Verifier for fabric
            // If you have already made it, please reply. If you haven't made it yet, make it and reply.
            if (this.verifierFabric == null) {
                const ledgerPluginInfoFabric: string = this.connectInfo.getLegerPluginInfo(validatorId);
                this.verifierFabric = new VerifierFabric(ledgerPluginInfoFabric);
                return this.verifierFabric;
            }
            else {
                return this.verifierFabric;
            }
        }
    }

    // Get validator to use
    getValidatorToUse(businessLogicId: string): string {
        return this.blpRegistry.getBLPRegistryInfo(businessLogicId);
    }

}
