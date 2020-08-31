/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicCartrade.ts
 */

import { Request } from 'express';
import { RequestInfo } from '../../packages/routing-interface/RequestInfo';
import { TradeInfo } from '../../packages/routing-interface/TradeInfo';
import { TransactionInfoManagement } from './TransactionInfoManagement';
import { TransactionInfo } from './TransactionInfo';
import { TransactionData } from './TransactionData';
import { TxInfoData } from './TxInfoData';
import { transactionManagement } from '../../packages/routing-interface/routes/index';
import { LedgerOperation } from '../../packages/business-logic-plugin/LedgerOperation';
import { BusinessLogicBase } from '../../packages/business-logic-plugin/BusinessLogicBase';
import { makeRawTransaction } from './TransactionEthereum'
import { makeSignedProposal } from './TransactionFabric';
import { LedgerEvent } from '../../packages/ledger-plugin/LedgerPlugin';
import { json2str } from '../../packages/ledger-plugin/DriverCommon'

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'BusinessLogicCartrade';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BusinessLogicCartrade extends BusinessLogicBase {
    transactionInfoManagement: TransactionInfoManagement;
    useValidator: {};

    constructor() {
        super();
        this.transactionInfoManagement = new TransactionInfoManagement();
    }

    startTransaction(req: Request, businessLogicID: string, tradeID: string) {

        logger.debug("called startTransaction");

        // set RequestInfo
        const requestInfo: RequestInfo = new RequestInfo();
        requestInfo.businessLogicID = businessLogicID;
        requestInfo.tradeInfo.ethereumAccountFrom = req.body.tradeParams[0];
        requestInfo.tradeInfo.ethereumAccountTo = req.body.tradeParams[1];
        requestInfo.tradeInfo.fabricAccountFrom = req.body.tradeParams[2];
        requestInfo.tradeInfo.fabricAccountTo = req.body.tradeParams[3];
        requestInfo.tradeInfo.tradingValue = req.body.tradeParams[4];
        requestInfo.tradeInfo.carID = req.body.tradeParams[5];
        // requestInfo.authInfo.company = req.body.authParams[0];

        // set TradeID
        requestInfo.setTradeID(tradeID);

        // Register transaction information in transaction information management
        const transactionInfo: TransactionInfo = new TransactionInfo();
        transactionInfo.setRequestInfo(0, requestInfo);
        this.transactionInfoManagement.addTransactionInfo(transactionInfo);

        // Create trade information
        const tradeInfo: TradeInfo = new TradeInfo(requestInfo.businessLogicID, requestInfo.tradeID);

        // trade status update
        this.transactionInfoManagement.setStatus(tradeInfo, "underEscrow");

        // Get varidator information
        this.useValidator = JSON.parse(transactionManagement.getValidatorToUse(requestInfo.businessLogicID));

        // this.dummyTransaction(requestInfo, tradeInfo);
        this.firstTransaction(requestInfo, tradeInfo);
    }

    dummyTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo) {

        logger.debug("called dummyTransaction");

        let transactionData: TransactionData = new TransactionData("escrow", "ledger001", "tid001");
        this.transactionInfoManagement.setTransactionData(tradeInfo, transactionData);

        this.transactionInfoManagement.setStatus(tradeInfo, "underTransfer");

        transactionData = new TransactionData("transfer", "ledger002", "tid002");
        this.transactionInfoManagement.setTransactionData(tradeInfo, transactionData);

        this.transactionInfoManagement.setStatus(tradeInfo, "underSettlement");

        transactionData = new TransactionData("settlement", "ledger003", "tid003");
        this.transactionInfoManagement.setTransactionData(tradeInfo, transactionData);

        this.transactionInfoManagement.setStatus(tradeInfo, "completed");

    }

    firstTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo) {

        logger.debug("called firstTransaction");

        ///// Eth Escrow

        // Get Verifier Instance
        const verifierEthereum = transactionManagement.getVerifier(this.useValidator['validatorID'][0]);
        logger.debug("getVerifierEthereum");
        verifierEthereum.setEventListener(this);
        logger.debug("setEventListener");
        verifierEthereum.startMonitor();
        logger.debug("##startMonitor(ethereum)");

        // TODO: get private key from
        const fromAddressPkey = config.cartradeInfo.ethereum.fromAddressPkey;
        // TODO: Get address of escrow and set parameter
        const escrowAddress = config.cartradeInfo.ethereum.escrowAddress;

        // Generate parameters for// sendRawTransaction
        const txParam: { fromAddress: string, fromAddressPkey: string, toAddress: string, amount: number, gas: number } = {
            fromAddress: requestInfo.tradeInfo.ethereumAccountFrom,
            fromAddressPkey: fromAddressPkey,
            toAddress: escrowAddress,
            amount: Number(requestInfo.tradeInfo.tradingValue),
            gas: config.cartradeInfo.ethereum.gas
        }
        logger.debug(`####exec makeRawTransaction!!`);
        makeRawTransaction(txParam)
            .then(result => {
                logger.info('firstTransaction txId : ' + result.txId);

                // Register transaction data in DB
                const transactionData: TransactionData = new TransactionData("escrow", "ledger001", result.txId);
                this.transactionInfoManagement.setTransactionData(tradeInfo, transactionData);

                // Set LedgerOperation
                logger.debug('firstTransaction data : ' + JSON.stringify(result.data));
                const ledgerOperation: LedgerOperation = new LedgerOperation("sendRawTransaction", "", result.data);

                // Run Verifier (Ethereum)
                verifierEthereum.requestLedgerOperation(ledgerOperation);

                // Specify the filtering condition of the event to be received
                logger.debug(`##setEventListener!! `);
                const filter = {
                    txId: result.txId
                }
                this.setEventFilter(filter);
            })
            .catch(err => {
                logger.error(err);
            });
    }

    secondTransaction(carID: string, fabricAccountTo: string, tradeInfo: TradeInfo) {

        logger.debug("called secondTransaction");

        ///// Fab Transfer

        // Get Verifier Instance
        const verifierFabric = transactionManagement.getVerifier(this.useValidator['validatorID'][1]);

        verifierFabric.setEventListener(this);
        logger.debug("setEventListener");
        verifierFabric.startMonitor();
        logger.debug("##startMonitor(ethereum)");

        // Generate parameters for sendSignedProposal(changeCarOwner)
        const ccFncName: string = "changeCarOwner";

        const ccArgs: string[] = [
            carID, // CarID
            fabricAccountTo // Owner
        ];
        makeSignedProposal(ccFncName, ccArgs)
            .then(result => {
                logger.info('secondTransaction txId : ' + result.txId);

                // Register transaction data in DB
                const transactionData: TransactionData = new TransactionData("transfer", "ledger002", result.txId);
                this.transactionInfoManagement.setTransactionData(tradeInfo, transactionData);

                // Set LedgerOperation
                // logger.debug('secondTransaction data : ' + JSON.stringify(result.data));
                const ledgerOperation: LedgerOperation = new LedgerOperation("sendSignedProposal", "", result.data);

                // Run Verifier (Fabric)
                verifierFabric.requestLedgerOperation(ledgerOperation);

                // Specify the filtering condition of the event to be received
                logger.debug(`##setEventListener!! `);
                const filter = {
                    txId: result.txId
                }
                this.setEventFilter(filter);
            })
            .catch(err => {
                logger.error(err);
            });
    }

    thirdTransaction(ethereumAccountTo: string, tradingValue: string, tradeInfo: TradeInfo) {

        logger.debug("called thirdTransaction");

        // Get Verifier Instance
        const verifierEthereum = transactionManagement.getVerifier(this.useValidator['validatorID'][0]);
        logger.debug("getVerifierEthereum");

        // TODO: Get address of escrow and set parameter
        const escrowAddress = config.cartradeInfo.ethereum.escrowAddress;
        // TODO: get escrow secret key
        const escrowAddressPkey = config.cartradeInfo.ethereum.escrowAddressPkey;

        // Generate parameters for sendRawTransaction
        const txParam: { fromAddress: string, fromAddressPkey: string, toAddress: string, amount: number, gas: number } = {
            fromAddress: escrowAddress,
            fromAddressPkey: escrowAddressPkey,
            toAddress: ethereumAccountTo,
            amount: Number(tradingValue),
            gas: config.cartradeInfo.ethereum.gas
        }
        makeRawTransaction(txParam)
            .then(result => {
                logger.info('thirdTransaction txId : ' + result.txId);

                // Register transaction data in DB
                const transactionData: TransactionData = new TransactionData("settlement", "ledger003", result.txId);
                this.transactionInfoManagement.setTransactionData(tradeInfo, transactionData);

                // Set LedgerOperation
                logger.debug('thirdTransaction data : ' + JSON.stringify(result.data));
                const ledgerOperation: LedgerOperation = new LedgerOperation("sendRawTransaction", "", result.data);

                // Run Verifier (Ethereum)
                verifierEthereum.requestLedgerOperation(ledgerOperation);

                // Specify the filtering condition of the event to be received
                logger.debug(`##setEventListener!! `);
                const filter = {
                    txId: result.txId
                }
                this.setEventFilter(filter);
            })
            .catch(err => {
                logger.error(err);
            });
    }

    finish() {
        logger.debug("called finish");
    }

    onEvent(ledgerEvent: LedgerEvent): void {
        logger.debug(`##in BLP:EventListener(onEvent)`);
        logger.debug(`##event: ${json2str(ledgerEvent)}`);

        switch (ledgerEvent.verifierId) {
            case "VerifierEthereum": // TODO: Originally, it is necessary to divide processing by Validator ID such as "84jUisrs"
                this.onEvenEtherem(ledgerEvent.data);
                break;
            case "VerifierFabric": // TODO: Originally, it is necessary to divide processing by Validator ID such as "r9IS4dDf"
                this.onEvenFabric(ledgerEvent.data);
                break;
            default:
                logger.error(`##ERROR: onEvent(), invalid verifierId: ${ledgerEvent.verifierId}`);
                return;
        }

    }

    onEvenEtherem(event: object): void {
        logger.debug(`##in onEvenEtherem()`);
        const tx = this.getTransactionFromEthereumEvent(event);
        if (tx == null) {
            logger.error(`##ERR: invalid event: ${json2str(event)}`);
            return;
        }

        try {
            const txId = tx['hash'];
            const status = event['status']
            logger.debug(`##txId = ${txId}`);
            logger.debug(`##status =${status}`);

            if (status !== 200) {
                logger.error(`##ERR: error event, status: ${status}, txId: ${txId}`);
                return;
            }

            // Perform the following transaction actions
            this.executeNextTransaction(tx, txId);
        }
        catch (err) {
            logger.error(`##err: onEvent, err: ${err}, event: ${json2str(event)}`);
        }
    }

    getTransactionFromEthereumEvent(event: object): object | null {
        try {
            const retTransaction = event['blockData']['transactions'][0];
            logger.debug(`##retTransaction: ${retTransaction}`);
            return retTransaction;
        }
        catch (err) {
            logger.error(`##ERR: invalid even, err:${err}, event:${event}`);
        }
    }

    onEvenFabric(event: object): void {
        logger.debug(`##in onEvenFabric()`);
        const tx = this.getTransactionFromFabricEvent(event);
        if (tx == null) {
            logger.warn(`##ERR: invalid event: ${json2str(event)}`);
            return;
        }

        try {
            const txId = tx['txId'];
            const status = event['status']
            logger.debug(`##txId = ${txId}`);
            logger.debug(`##status =${status}`);

            if (status !== 200) {
                logger.error(`##ERR: error event, status: ${status}, txId: ${txId}`);
                return;
            }

            // Perform the following transaction actions
            this.executeNextTransaction(tx, txId);
        }
        catch (err) {
            logger.error(`##err: onEvent, err: ${err}, event: ${json2str(event)}`);
        }
    }

    getTransactionFromFabricEvent(event: object): object | null {
        try {
            const retTransaction = event['blockData'][0];
            logger.debug(`##retTransaction: ${retTransaction}`);
            return retTransaction;
        }
        catch (err) {
            logger.error(`##ERR: invalid even, err:${err}, event:${event}`);
        }
    }

    executeNextTransaction(txInfo: object, txId: string): void {
        let transactionInfo: TransactionInfo = null;
        try {
            // Retrieve DB transaction information
            transactionInfo = this.transactionInfoManagement.getTransactionInfoByTxId(txId);
            if (transactionInfo != null) {
                logger.debug(`##onEvent(A), transactionInfo: ${json2str(transactionInfo)}`);
            }
            else {
                logger.warn(`##onEvent(B), not found transactionInfo, txId: ${txId}`);
                return;
            }
            const txStatus = transactionInfo.status;
            const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
            let txInfoData: TxInfoData;
            switch (txStatus) {
                case "underEscrow":
                    // store transaction information in DB
                    txInfoData = new TxInfoData("escrow", json2str(txInfo));
                    this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

                    // underEscrow -> underTransfer
                    logger.info(`##INFO: underEscrow -> underTransfer, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`);
                    // const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
                    this.transactionInfoManagement.setStatus(tradeInfo, "underTransfer");
                    this.secondTransaction(transactionInfo.carID, transactionInfo.fabricAccountTo, tradeInfo);
                    break;
                case "underTransfer":
                    // store transaction information in DB
                    txInfoData = new TxInfoData("transfer", json2str(txInfo));
                    this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

                    // underTransfer -> underSettlement
                    logger.info(`##INFO: underTransfer -> underSettlement, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`);
                    // const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
                    this.transactionInfoManagement.setStatus(tradeInfo, "underSettlement");
                    this.thirdTransaction(transactionInfo.ethereumAccountTo, transactionInfo.tradingValue, tradeInfo);
                    break;
                case "underSettlement":
                    // store transaction information in DB
                    txInfoData = new TxInfoData("settlement", json2str(txInfo));
                    this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

                    // underSettlement -> completed
                    // const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
                    this.transactionInfoManagement.setStatus(tradeInfo, "completed");
                    logger.info(`##INFO: completed cartrade, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`);
                    break;
                case "completed":
                    logger.warn('##WARN: already completed, txinfo: ${json2str(transactionInfo)}');
                    return;
                default:
                    logger.error('##ERR: bad txStatus: ${txStatus}');
                    return;
            }
        }
        catch (err) {
            logger.error(`##ERR: executeNextTransaction(), err: ${err}, tx: ${json2str(transactionInfo)}`);
        }
    }

    createTradeInfoFromTransactionInfo(txInfo: TransactionInfo): TradeInfo {
        try {
            return new TradeInfo(txInfo.businessLogicID, txInfo.tradeID);
        }
        catch (err) {
            logger.error(`##ERR: createTradeInfoFromTransactionInfo(), ${err}`);
            throw err;
        }
    }

    isTargetEvent(ledgerEvent: LedgerEvent): boolean {
        logger.debug(`##in isTargetEvent`);
        logger.debug(`##event: ${json2str(ledgerEvent)}`);

        const filter = this.getEventFilter();
        if (filter === null) {
            logger.debug(`##filter is null, skip.`);
            return false;
        }

        switch (ledgerEvent.verifierId) {
            case "VerifierEthereum": // TODO: Originally, it is necessary to divide processing by Validator ID such as "84jUisrs"
                return this.isTargetEventEtherem(ledgerEvent.data, filter);
            case "VerifierFabric": // TODO: Originally, it is necessary to divide processing by Validator ID such as "r9IS4dDf"
                return this.isTargetEventFabric(ledgerEvent.data, filter);
            default:
                logger.error(`##ERROR: onEvent(), invalid verifierId: ${ledgerEvent.verifierId}`);
        }

        return false;
    }

    isTargetEventEtherem(event: object, filter: object): boolean {
        logger.debug(`##in isTargetEventEtherem()`);
        const tx = this.getTransactionFromEthereumEvent(event);
        if (tx == null) {
            logger.error(`##ERR: invalid event: ${json2str(event)}`);
            return;
        }

        try {
            const txId = tx['hash'];

            if (!filter.hasOwnProperty('txId')) {
                logger.warn(`eventFilter: not exist txId.`);
                return true;
            }
            const filterTxId = filter['txId'];
            logger.debug(`####txId: ${txId}, filterTxId: ${filterTxId}, ret: ${txId === filterTxId}`);

            return (txId === filterTxId);
        }
        catch (err) {
            logger.error(`##err: isTargetEventEtherem, err: ${err}, event: ${json2str(event)}`);
            return false;
        }
    }

    isTargetEventFabric(event: object, filter: object): boolean {
        logger.debug(`##in isTargetEventFabric()`);
        const tx = this.getTransactionFromFabricEvent(event);
        if (tx == null) {
            logger.warn(`##ERR: invalid event: ${json2str(event)}`);
            return;
        }

        try {
            const txId = tx['txId'];

            if (!filter.hasOwnProperty('txId')) {
                logger.warn(`eventFilter: not exist txId.`);
                return true;
            }
            const filterTxId = filter['txId'];
            logger.debug(`####txId: ${txId}, filterTxId: ${filterTxId}, ret: ${txId === filterTxId}`);

            return (txId === filterTxId);
        }
        catch (err) {
            logger.error(`##err: isTargetEventFabric, err: ${err}, event: ${json2str(event)}`);
            return false;
        }
    }

}
