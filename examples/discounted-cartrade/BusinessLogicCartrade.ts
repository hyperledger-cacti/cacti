/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicCartrade.ts
 */

import { Request } from "express";
import { RequestInfo } from "@hyperledger/cactus-cmd-socket-server";
import { TradeInfo } from "@hyperledger/cactus-cmd-socket-server";
import { TransactionInfoManagement } from "./TransactionInfoManagement";
import { TransactionInfo } from "./TransactionInfo";
import { TransactionData } from "./TransactionData";
import { BusinessLogicInquireCartradeStatus } from "./BusinessLogicInquireCartradeStatus";
import { TxInfoData } from "./TxInfoData";
import { routesTransactionManagement } from "@hyperledger/cactus-cmd-socket-server";
import { routesVerifierFactory } from "@hyperledger/cactus-cmd-socket-server";
import { LedgerOperation } from "@hyperledger/cactus-cmd-socket-server";
import { BusinessLogicBase } from "@hyperledger/cactus-cmd-socket-server";
import { makeRawTransaction } from "./TransactionEthereum";
import { makeSignedProposal } from "./TransactionFabric";
import { getDataFromIndy } from "./TransactionIndy";
import { LedgerEvent } from "@hyperledger/cactus-cmd-socket-server";
import { json2str } from "@hyperledger/cactus-cmd-socket-server";
import { CartradeStatus } from "./define";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
//const config: any = JSON.parse(fs.readFileSync("/etc/cactus/default.json", 'utf8'));
const config: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/default.yaml", "utf8")
);

import { getLogger } from "log4js";
const moduleName = "BusinessLogicCartrade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const indy = require("indy-sdk");
const assert = require("assert");
const identifierSchema = "schema";
const identifierCredDef = "credDef";

export class BusinessLogicCartrade extends BusinessLogicBase {
  transactionInfoManagement: TransactionInfoManagement;
  // useValidator: {};

  constructor() {
    super();
    this.transactionInfoManagement = new TransactionInfoManagement();
  }

  startTransaction(req: Request, businessLogicID: string, tradeID: string) {
    logger.debug("called startTransaction");

    // set RequestInfo
    let requestInfo: RequestInfo = new RequestInfo();
    requestInfo.businessLogicID = businessLogicID;
    requestInfo.tradeInfo.ethereumAccountFrom = req.body.tradeParams[0];
    requestInfo.tradeInfo.ethereumAccountTo = req.body.tradeParams[1];
    requestInfo.tradeInfo.fabricAccountFrom = req.body.tradeParams[2];
    requestInfo.tradeInfo.fabricAccountTo = req.body.tradeParams[3];
    //requestInfo.tradeInfo.tradingValue = req.body.tradeParams[4];
    requestInfo.tradeInfo.carID = req.body.tradeParams[4];
    requestInfo.tradeInfo.proofJson = JSON.parse(req.body.tradeParams[5]);
    // requestInfo.authInfo.company = req.body.authParams[0];

    // set TradeID
    requestInfo.setTradeID(tradeID);

    // Register transaction information in transaction information management
    const transactionInfo: TransactionInfo = new TransactionInfo();
    transactionInfo.setRequestInfo(0, requestInfo);
    this.transactionInfoManagement.addTransactionInfo(transactionInfo);

    // pricing of trade by user's status which is employee or not employee
    this.Pricing(requestInfo)
      .then((result) => {
        // logger.debug(`Pricing.result: ${result}`);
        // logger.debug(`##startTransaction(): requestInfo.tradeInfo.tradingValue : ${requestInfo.tradeInfo.tradingValue}`);

        requestInfo = result;

        // Create trade information
        const tradeInfo: TradeInfo = new TradeInfo(
          requestInfo.businessLogicID,
          requestInfo.tradeID
        );

        // trade status update
        this.transactionInfoManagement.setStatus(
          tradeInfo,
          CartradeStatus.UnderEscrow
        );

        // Get varidator information
        // this.useValidator = JSON.parse(routesTransactionManagement.getValidatorToUse(requestInfo.businessLogicID));

        // this.dummyTransaction(requestInfo, tradeInfo);
        this.firstTransaction(requestInfo, tradeInfo);
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  dummyTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo) {
    logger.debug("called dummyTransaction");

    let transactionData: TransactionData = new TransactionData(
      "escrow",
      "ledger001",
      "tid001"
    );
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData
    );

    this.transactionInfoManagement.setStatus(
      tradeInfo,
      CartradeStatus.UnderTransfer
    );

    transactionData = new TransactionData("transfer", "ledger002", "tid002");
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData
    );

    this.transactionInfoManagement.setStatus(
      tradeInfo,
      CartradeStatus.UnderSettlement
    );

    transactionData = new TransactionData("settlement", "ledger003", "tid003");
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData
    );

    this.transactionInfoManagement.setStatus(
      tradeInfo,
      CartradeStatus.Completed
    );
  }

  async Pricing(requestInfo: RequestInfo) {
    logger.debug("called Pricing");

    // price list
    const priceList = { default: "50", employee: "25" };

    logger.debug(JSON.stringify(requestInfo.tradeInfo.proofJson));
    const isPreferredCustomer = await this.isPreferredCustomer(
      requestInfo.tradeInfo.proofJson
    );

    // decide the price from result of isPreferredCustomer
    if (isPreferredCustomer) {
      logger.debug("##isPreferredCustomer result : true");
      requestInfo.tradeInfo.tradingValue = priceList.employee;
    } else {
      logger.debug("##isPreferredCustomer result : false");
      requestInfo.tradeInfo.tradingValue = priceList.default;
    }
    // logger.debug(`##Pricing(): requestInfo.tradeInfo.tradingValue : ${requestInfo.tradeInfo.tradingValue}`);

    return requestInfo;
  }

  async isPreferredCustomer(input_obj) {
    let proofRequestJson;
    let proofJson;
    try {
      proofRequestJson = JSON.parse(input_obj["proof_request"]);
      proofJson = JSON.parse(input_obj["proof"]);
    } catch (err) {
      logger.error(
        "Error while reading proof and proof request. returning false."
      );
      return false;
    }

    // get schema & credential definition from indy
    // now verifierGetEntitiesFromLedger don't get revRegDefs & revRegs
    // did is null. If it is null, indy.buidlGetSchemaRequest API get data by default param.
    const [schemasJson, credDefsJson, revRegDefsJson, revRegsJson] =
      await this.verifierGetEntitiesFromLedger(null, proofJson["identifiers"]);

    assert(
      "Permanent" ===
        proofJson["requested_proof"]["revealed_attrs"]["attr1_referent"]["raw"]
    );

    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger schemasJson : ${JSON.stringify(
        schemasJson
      )}`
    );
    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger credDefsJson : ${JSON.stringify(
        credDefsJson
      )}`
    );
    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger revRegDefsJson : ${JSON.stringify(
        revRegDefsJson
      )}`
    );
    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger revRegsJson : ${JSON.stringify(
        revRegsJson
      )}`
    );

    try {
      const verif_result = await indy.verifierVerifyProof(
        proofRequestJson,
        proofJson,
        schemasJson,
        credDefsJson,
        revRegDefsJson,
        revRegsJson
      );
      logger.debug("verify proof: " + (verif_result ? "ok" : "not ok"));
      return verif_result;
    } catch (err) {
      logger.error(
        "error raised during indy.verifierVerifyProof() invocation. defaulting to false (= NO DISCOUNT)"
      );
      logger.error(err);
      return false;
    }
  }

  async verifierGetEntitiesFromLedger(did, identifiers) {
    const schemas = {};
    const credDefs = {};
    const revRegDefs = {};
    const revRegs = {};

    for (const referent of Object.keys(identifiers)) {
      const item = identifiers[referent];
      const args_request_getSchema = { did: did, schemaId: item["schema_id"] };
      const responseSchema = await getDataFromIndy(
        args_request_getSchema,
        identifierSchema
      );
      const [receivedSchemaId, receivedSchema] = responseSchema["data"];
      schemas[receivedSchemaId] = JSON.parse(receivedSchema);

      const args_request_getCredDef = {
        did: did,
        schemaId: item["cred_def_id"],
      };
      const responseCredDef = await getDataFromIndy(
        args_request_getCredDef,
        identifierCredDef
      );
      const [receivedCredDefId, receivedCredDef] = responseCredDef["data"];
      credDefs[receivedCredDefId] = JSON.parse(receivedCredDef);

      if (item.rev_reg_seq_no) {
        // TODO Get Revocation Definitions and Revocation Registries
      }
    }

    logger.debug("finish get Data from indy");

    return [schemas, credDefs, revRegDefs, revRegs];
  }

  firstTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo) {
    logger.debug("called firstTransaction");

    ///// Eth Escrow

    // Get Verifier Instance
    logger.debug(
      `##firstTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID)
    );
    //        const verifierEthereum = routesTransactionManagement.getVerifier(useValidator['validatorID'][0]);
    const verifierEthereum = routesVerifierFactory.getVerifier(
      useValidator["validatorID"][0],
      "BusinessLogicCartrade"
    );
    logger.debug("getVerifierEthereum");

    // TODO: get private key from
    logger.debug(
      `####fromAddress: ${requestInfo.tradeInfo.ethereumAccountFrom}`
    );
    const fromAddressPkey =
      config.cartradeInfo.ethereum[
        "fromAddressPkey_" + requestInfo.tradeInfo.ethereumAccountFrom
      ];
    logger.debug(`####fromAddressPkey: ${fromAddressPkey}`);
    // TODO: Get address of escrow and set parameter
    const escrowAddress = config.cartradeInfo.ethereum.escrowAddress;

    // Generate parameters for// sendRawTransaction
    const txParam: {
      fromAddress: string;
      fromAddressPkey: string;
      toAddress: string;
      amount: number;
      gas: number;
    } = {
      fromAddress: requestInfo.tradeInfo.ethereumAccountFrom,
      fromAddressPkey: fromAddressPkey,
      toAddress: escrowAddress,
      amount: Number(requestInfo.tradeInfo.tradingValue),
      gas: config.cartradeInfo.ethereum.gas,
    };
    logger.debug(`####exec makeRawTransaction!!`);
    makeRawTransaction(txParam)
      .then((result) => {
        logger.info("firstTransaction txId : " + result.txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "escrow",
          "ledger001",
          result.txId
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData
        );

        // Set Parameter
        logger.debug("firstTransaction data : " + JSON.stringify(result.data));
        const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
        const method = { type: "web3Eth", command: "sendRawTransaction" };
        const template = "default";
        const args = { args: [result.data["serializedTx"]] };
        // const method = "default";
        // const args = {"method": {type: "web3Eth", command: "sendRawTransaction"},"args": {"args": [result.data["serializedTx"]]}};

        // Run Verifier (Ethereum)
        verifierEthereum
          .sendAsyncRequest(contract, method, args)
          .then(() => {
            logger.debug(`##firstTransaction sendAsyncRequest finish`);
          })
          .catch((err) => {
            logger.error(err);
          });
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  secondTransaction(
    carID: string,
    fabricAccountTo: string,
    tradeInfo: TradeInfo
  ) {
    logger.debug("called secondTransaction");

    ///// Fab Transfer

    // Get Verifier Instance
    logger.debug(
      `##secondTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID)
    );
    //        const verifierFabric = routesTransactionManagement.getVerifier(useValidator['validatorID'][1]);
    const verifierFabric = routesVerifierFactory.getVerifier(
      useValidator["validatorID"][1],
      "BusinessLogicCartrade"
    );
    logger.debug("getVerifierFabric");

    // Generate parameters for sendSignedProposal(changeCarOwner)
    const ccFncName = "changeCarOwner";

    const ccArgs: string[] = [
      carID, // CarID
      fabricAccountTo, // Owner
    ];
    makeSignedProposal(ccFncName, ccArgs, verifierFabric)
      .then((result) => {
        // logger.info(`##ret makeSignedProposal: result: ${JSON.stringify(result)}`);
        logger.info("secondTransaction txId : " + result.txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "transfer",
          "ledger002",
          result.txId
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData
        );

        // NOTE: Convert properties to binary.
        //       If you do not convert the following, you will get an error.
        result.data["signedCommitProposal"].signature = Buffer.from(
          result.data["signedCommitProposal"].signature
        );
        result.data["signedCommitProposal"].proposal_bytes = Buffer.from(
          result.data["signedCommitProposal"].proposal_bytes
        );

        // Set Parameter
        //logger.debug('secondTransaction data : ' + JSON.stringify(result.data));
        const contract = { channelName: "mychannel" };
        const method = { type: "sendSignedTransaction" };
        const template = "default";
        const args = { args: [result.data] };

        // Run Verifier (Fabric)
        verifierFabric
          .sendAsyncRequest(contract, method, args)
          .then(() => {
            logger.debug(`##secondTransaction sendAsyncRequest finish`);
          })
          .catch((err) => {
            logger.error(err);
          });
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  thirdTransaction(
    ethereumAccountTo: string,
    tradingValue: string,
    tradeInfo: TradeInfo
  ) {
    logger.debug("called thirdTransaction");

    // Get Verifier Instance
    logger.debug(
      `##thirdTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID)
    );
    //        const verifierEthereum = routesTransactionManagement.getVerifier(useValidator['validatorID'][0]);
    const verifierEthereum = routesVerifierFactory.getVerifier(
      useValidator["validatorID"][0],
      "BusinessLogicCartrade"
    );
    logger.debug("getVerifierEthereum");

    // TODO: Get address of escrow and set parameter
    const escrowAddress = config.cartradeInfo.ethereum.escrowAddress;
    // TODO: get escrow secret key
    const escrowAddressPkey = config.cartradeInfo.ethereum.escrowAddressPkey;

    // Generate parameters for sendRawTransaction
    const txParam: {
      fromAddress: string;
      fromAddressPkey: string;
      toAddress: string;
      amount: number;
      gas: number;
    } = {
      fromAddress: escrowAddress,
      fromAddressPkey: escrowAddressPkey,
      toAddress: ethereumAccountTo,
      amount: Number(tradingValue),
      gas: config.cartradeInfo.ethereum.gas,
    };
    makeRawTransaction(txParam)
      .then((result) => {
        logger.info("thirdTransaction txId : " + result.txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "settlement",
          "ledger003",
          result.txId
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData
        );

        // Set LedgerOperation
        logger.debug("thirdTransaction data : " + JSON.stringify(result.data));
        const ledgerOperation: LedgerOperation = new LedgerOperation(
          "sendRawTransaction",
          "",
          result.data
        );

        // Run Verifier (Ethereum)
        // verifierEthereum.requestLedgerOperation(ledgerOperation);

        // TODO: Neo!!
        // Set Parameter
        const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
        const method = { type: "web3Eth", command: "sendRawTransaction" };
        const template = "default";
        const args = { args: [result.data["serializedTx"]] };
        // const method = "default";
        // const args = {"method": {type: "web3Eth", command: "sendRawTransaction"}, "args": {"args": [result.data["serializedTx"]]}};

        // Run Verifier (Ethereum)
        verifierEthereum
          .sendAsyncRequest(contract, method, args)
          .then(() => {
            logger.debug(`##thirdTransaction sendAsyncRequest finish`);
          })
          .catch((err) => {
            logger.error(err);
          });
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  completedTransaction(tradeInfo: TradeInfo) {
    logger.debug("called completedTransaction");

    logger.debug(
      `##completedTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID)
    );
    const validatorId = useValidator["validatorID"][0];
  }

  finish() {
    logger.debug("called finish");
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    logger.debug(`##in BLP:onEvent()`);
    logger.debug(`##onEvent(): ${json2str(ledgerEvent)}`);

    switch (ledgerEvent.verifierId) {
      case config.cartradeInfo.ethereum.validatorID:
        this.onEvenEtherem(ledgerEvent.data, targetIndex);
        break;
      case config.cartradeInfo.fabric.validatorID:
        this.onEvenFabric(ledgerEvent.data, targetIndex);
        break;
      default:
        logger.error(
          `##onEvent(), invalid verifierId: ${ledgerEvent.verifierId}`
        );
        return;
    }
  }

  onEvenEtherem(event: object, targetIndex: number): void {
    logger.debug(`##in onEvenEtherem()`);
    const tx = this.getTransactionFromEthereumEvent(event, targetIndex);
    if (tx == null) {
      logger.error(`##onEvenEtherem(): invalid event: ${json2str(event)}`);
      return;
    }

    try {
      const txId = tx["hash"];
      const status = event["status"];
      logger.debug(`##txId = ${txId}`);
      logger.debug(`##status =${status}`);

      if (status !== 200) {
        logger.error(
          `##onEvenEtherem(): error event, status: ${status}, txId: ${txId}`
        );
        return;
      }

      // Perform the following transaction actions
      this.executeNextTransaction(tx, txId);
    } catch (err) {
      logger.error(`##onEvenEtherem(): err: ${err}, event: ${json2str(event)}`);
    }
  }

  getTransactionFromEthereumEvent(
    event: object,
    targetIndex: number
  ): object | null {
    try {
      const retTransaction = event["blockData"]["transactions"][targetIndex];
      logger.debug(
        `##getTransactionFromEthereumEvent(), retTransaction: ${retTransaction}`
      );
      return retTransaction;
    } catch (err) {
      logger.error(
        `##getTransactionFromEthereumEvent(): invalid even, err:${err}, event:${event}`
      );
    }
  }

  onEvenFabric(event: object, targetIndex: number): void {
    logger.debug(`##in onEvenFabric()`);
    const tx = this.getTransactionFromFabricEvent(event, targetIndex);
    if (tx == null) {
      logger.warn(`##onEvenFabric(): invalid event: ${json2str(event)}`);
      return;
    }

    try {
      const txId = tx["txId"];
      const status = event["status"];
      logger.debug(`##txId = ${txId}`);
      logger.debug(`##status =${status}`);

      if (status !== 200) {
        logger.error(
          `##onEvenFabric(): error event, status: ${status}, txId: ${txId}`
        );
        return;
      }

      // Perform the following transaction actions
      this.executeNextTransaction(tx, txId);
    } catch (err) {
      logger.error(
        `##onEvenFabric(): onEvent, err: ${err}, event: ${json2str(event)}`
      );
    }
  }

  getTransactionFromFabricEvent(event: object, targetIndex): object | null {
    try {
      const retTransaction = event["blockData"][targetIndex];
      logger.debug(
        `##getTransactionFromFabricEvent(): retTransaction: ${retTransaction}`
      );
      return retTransaction;
    } catch (err) {
      logger.error(
        `##getTransactionFromFabricEvent(): invalid even, err:${err}, event:${event}`
      );
    }
  }

  executeNextTransaction(txInfo: object, txId: string): void {
    let transactionInfo: TransactionInfo = null;
    try {
      // Retrieve DB transaction information
      transactionInfo =
        this.transactionInfoManagement.getTransactionInfoByTxId(txId);
      if (transactionInfo != null) {
        logger.debug(
          `##onEvent(A), transactionInfo: ${json2str(transactionInfo)}`
        );
      } else {
        logger.warn(`##onEvent(B), not found transactionInfo, txId: ${txId}`);
        return;
      }
      const txStatus = transactionInfo.status;
      const tradeInfo =
        this.createTradeInfoFromTransactionInfo(transactionInfo);
      let txInfoData: TxInfoData;
      switch (txStatus) {
        case CartradeStatus.UnderEscrow:
          // store transaction information in DB
          txInfoData = new TxInfoData("escrow", json2str(txInfo));
          this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

          // underEscrow -> underTransfer
          logger.info(
            `##INFO: underEscrow -> underTransfer, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`
          );
          // const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
          this.transactionInfoManagement.setStatus(
            tradeInfo,
            CartradeStatus.UnderTransfer
          );
          this.secondTransaction(
            transactionInfo.carID,
            transactionInfo.fabricAccountTo,
            tradeInfo
          );
          break;
        case CartradeStatus.UnderTransfer:
          // store transaction information in DB
          txInfoData = new TxInfoData("transfer", json2str(txInfo));
          this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

          // underTransfer -> underSettlement
          logger.info(
            `##INFO: underTransfer -> underSettlement, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`
          );
          // const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
          this.transactionInfoManagement.setStatus(
            tradeInfo,
            CartradeStatus.UnderSettlement
          );
          this.thirdTransaction(
            transactionInfo.ethereumAccountTo,
            transactionInfo.tradingValue,
            tradeInfo
          );
          break;
        case CartradeStatus.UnderSettlement:
          // store transaction information in DB
          txInfoData = new TxInfoData("settlement", json2str(txInfo));
          this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

          // underSettlement -> completed
          // const tradeInfo = this.createTradeInfoFromTransactionInfo(transactionInfo);
          this.transactionInfoManagement.setStatus(
            tradeInfo,
            CartradeStatus.Completed
          );
          logger.info(
            `##INFO: completed cartrade, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`
          );
          this.completedTransaction(tradeInfo);
          break;
        case CartradeStatus.Completed:
          logger.warn(
            `##WARN: already completed, txinfo: ${json2str(transactionInfo)}`
          );
          return;
        default:
          logger.error(`##ERR: bad txStatus: ${txStatus}`);
          return;
      }
    } catch (err) {
      logger.error(
        `##ERR: executeNextTransaction(), err: ${err}, tx: ${json2str(
          transactionInfo
        )}`
      );
    }
  }

  createTradeInfoFromTransactionInfo(txInfo: TransactionInfo): TradeInfo {
    try {
      return new TradeInfo(txInfo.businessLogicID, txInfo.tradeID);
    } catch (err) {
      logger.error(`##ERR: createTradeInfoFromTransactionInfo(), ${err}`);
      throw err;
    }
  }

  getOperationStatus(tradeID: string): object {
    logger.debug(`##in getOperationStatus()`);
    const businessLogicInquireCartradeStatus: BusinessLogicInquireCartradeStatus =
      new BusinessLogicInquireCartradeStatus();
    const transactionStatusData =
      businessLogicInquireCartradeStatus.getCartradeOperationStatus(tradeID);

    return transactionStatusData;
  }

  getTxIDFromEvent(
    ledgerEvent: LedgerEvent,
    targetIndex: number
  ): string | null {
    logger.debug(`##in getTxIDFromEvent`);
    logger.debug(`##event: ${json2str(ledgerEvent)}`);

    switch (ledgerEvent.verifierId) {
      case config.cartradeInfo.ethereum.validatorID:
        return this.getTxIDFromEventEtherem(ledgerEvent.data, targetIndex);
      case config.cartradeInfo.fabric.validatorID:
        return this.getTxIDFromEventFabric(ledgerEvent.data, targetIndex);
      default:
        logger.error(
          `##getTxIDFromEvent(): invalid verifierId: ${ledgerEvent.verifierId}`
        );
    }
    return null;
  }

  getTxIDFromEventEtherem(event: object, targetIndex: number): string | null {
    logger.debug(`##in getTxIDFromEventEtherem()`);
    const tx = this.getTransactionFromEthereumEvent(event, targetIndex);
    if (tx == null) {
      logger.warn(`#getTxIDFromEventEtherem(): skip(not found tx)`);
      return null;
    }

    try {
      const txId = tx["hash"];

      if (typeof txId !== "string") {
        logger.warn(
          `#getTxIDFromEventEtherem(): skip(invalid block, not found txId.), event: ${json2str(
            event
          )}`
        );
        return null;
      }

      logger.debug(`###getTxIDFromEventEtherem(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
        `##getTxIDFromEventEtherem(): err: ${err}, event: ${json2str(event)}`
      );
      return null;
    }
  }

  getTxIDFromEventFabric(event: object, targetIndex: number): string | null {
    logger.debug(`##in getTxIDFromEventFabric()`);
    const tx = this.getTransactionFromFabricEvent(event, targetIndex);
    if (tx == null) {
      logger.warn(`#getTxIDFromEventFabric(): skip(not found tx)`);
      return null;
    }

    try {
      const txId = tx["txId"];

      if (typeof txId !== "string") {
        logger.warn(
          `#getTxIDFromEventFabric(): skip(invalid block, not found txId.), event: ${json2str(
            event
          )}`
        );
        return null;
      }

      logger.debug(`###getTxIDFromEventFabric(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
        `##getTxIDFromEventFabric(): err: ${err}, event: ${json2str(event)}`
      );
      return null;
    }
  }

  hasTxIDInTransactions(txID: string): boolean {
    logger.debug(`##in hasTxIDInTransactions(), txID: ${txID}`);
    const transactionInfo =
      this.transactionInfoManagement.getTransactionInfoByTxId(txID);
    logger.debug(`##hasTxIDInTransactions(), ret: ${transactionInfo !== null}`);
    return transactionInfo !== null;
  }

  getEventDataNum(ledgerEvent: LedgerEvent): number {
    logger.debug(
      `##in BLP:getEventDataNum(), ledgerEvent.verifierId: ${ledgerEvent.verifierId}`
    );
    const event = ledgerEvent.data;
    let retEventNum = 0;

    try {
      switch (ledgerEvent.verifierId) {
        case config.cartradeInfo.ethereum.validatorID:
          retEventNum = event["blockData"]["transactions"].length;
          break;
        case config.cartradeInfo.fabric.validatorID:
          retEventNum = event["blockData"].length;
          break;
        default:
          logger.error(
            `##getEventDataNum(): invalid verifierId: ${ledgerEvent.verifierId}`
          );
          break;
      }
      logger.debug(
        `##getEventDataNum(): retEventNum: ${retEventNum}, verifierId: ${ledgerEvent.verifierId}`
      );
      return retEventNum;
    } catch (err) {
      logger.error(
        `##getEventDataNum(): invalid even, err: ${err}, event: ${event}`
      );
      return 0;
    }
  }
}
