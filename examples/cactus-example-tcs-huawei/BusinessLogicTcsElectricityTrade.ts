/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicElectricityTrade.ts
 */

import { Request } from "express";
import { RequestInfo } from "./RequestInfo";
import { MeterManagement } from "./MeterManagement";
import { MeterInfo } from "./MeterInfo";
import {
  TradeInfo,
  routesTransactionManagement,
  BusinessLogicBase,
  LedgerEvent,
  json2str,
  ConfigUtil,
  LPInfoHolder,
} from "@hyperledger/cactus-cmd-socketio-server";
import { makeRawTransaction } from "./TransactionEthereum";

import fs from "fs";
import yaml from "js-yaml";
//const config: any = JSON.parse(fs.readFileSync("/etc/cactus/default.json", 'utf8'));
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";
import { NIL } from "uuid";

const moduleName = "BusinessLogicElectricityTrade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;
const connectInfo = new LPInfoHolder();
const routesVerifierFactory = new VerifierFactory(
    connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
    config.logLevel,
);

export class BusinessLogicElectricityTrade extends BusinessLogicBase {
  businessLogicID: string;
  meterManagement: MeterManagement;

  constructor(businessLogicID: string) {
    super();
    this.businessLogicID = businessLogicID;
    this.meterManagement = new MeterManagement();
  }

  startTransaction(req: Request, businessLogicID: string, tradeID: string) {
    logger.debug("called startTransaction()");

    // set RequestInfo
    const requestInfo: RequestInfo = new RequestInfo();
    requestInfo.businessLogicID = businessLogicID;

    // set TradeID
    requestInfo.setTradeID(tradeID);

    // Create trade information
    const tradeInfo: TradeInfo = new TradeInfo(
        requestInfo.businessLogicID,
        requestInfo.tradeID,
    );

    this.startMonitor(tradeInfo);
  }

  startMonitor(tradeInfo: TradeInfo) {
    // Get Verifier Instance
    logger.debug(
        `##startMonitor(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
    const useValidator = JSON.parse(
        routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID),
    );
    logger.debug(
        `filterKey: ${config.electricityTradeInfo.tcsHuawei.filterKey}`,
    );
    const options = {
      filterKey: config.electricityTradeInfo.tcsHuawei.filterKey,
    };
    const verifierTcs = routesVerifierFactory.getVerifier(
        useValidator["validatorID"][0],
    );
    verifierTcs.startMonitor(
        "BusinessLogicTcsElectricityTrade",
        options,
        routesTransactionManagement,
    );
    logger.debug("getVerifierTcs");
  }

  remittanceTransaction(transactionSubset: object) {
    logger.debug(
        `called remittanceTransaction(), accountInfo = ${json2str(
            transactionSubset,
        )}`,
    );

    const accountInfo = this.getAccountInfo(transactionSubset);
    if (Object.keys(accountInfo).length === 0) {
      logger.debug(`remittanceTransaction(): skip (No target meter)`);
      return;
    }

    const txParam: {
      fromAddress: string;
      fromAddressPkey: string;
      toAddress: string;
      amount: number;
      gas: number;
    } = {
      fromAddress: accountInfo["fromAddress"],
      fromAddressPkey: accountInfo["fromAddressPkey"],
      toAddress: accountInfo["toAddress"],
      amount: Number(transactionSubset["Value"]),
      gas: config.electricityTradeInfo.ethereum.gas,
    };
    logger.debug(`####txParam = ${json2str(txParam)}`);

    // Get Verifier Instance
    logger.debug(
        `##remittanceTransaction(): businessLogicID: ${this.businessLogicID}`,
    );
    const useValidator = JSON.parse(
        routesTransactionManagement.getValidatorToUse(this.businessLogicID),
    );
    //        const verifierEthereum = routesTransactionManagement.getVerifier(useValidator['validatorID'][1]);
    const verifierEthereum = routesVerifierFactory.getVerifier(
        useValidator["validatorID"][1],
    );
    verifierEthereum.startMonitor(
        "BusinessLogicElectricityTrade",
        {},
        routesTransactionManagement,
    );
    logger.debug("getVerifierEthereum");

    // Generate parameters for// sendRawTransaction
    logger.debug(`####exec makeRawTransaction!!`);
    makeRawTransaction(txParam)
        .then((result) => {
          logger.info("remittanceTransaction txId : " + result.txId);

          // Set Parameter
          logger.debug("remittanceTransaction data : " + json2str(result.data));
          const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
          const method = { type: "web3Eth", command: "sendRawTransaction" };
          const args = { args: [result.data["serializedTx"]] };

          // Run Verifier (Ethereum)
          verifierEthereum
              .sendAsyncRequest(contract, method, args)
              .then(() => {
                logger.debug(`##remittanceTransaction sendAsyncRequest finish`);
              })
              .catch((err) => {
                logger.error(err);
              });
        })
        .catch((err) => {
          logger.error(err);
        });
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    logger.debug(`##in BLP:onEvent()`);
    logger.debug(
        `##onEvent(): ${json2str(ledgerEvent["data"]["blockData"][targetIndex])}`,
    );
    switch (ledgerEvent.verifierId) {
      case config.electricityTradeInfo.tcsHuawei.validatorID:
        this.onEventTCS(ledgerEvent.data, targetIndex);
        break;
      case config.electricityTradeInfo.ethereum.validatorID:
        this.onEventEthereum(ledgerEvent.data, targetIndex);
        break;
      default:
        logger.error(
            `##onEvent(), invalid verifierId: ${ledgerEvent.verifierId}`,
        );
        return;
    }
  }

  onEventTCS(event: any, targetIndex: number): void {
    logger.debug(`##in onEventTCS()`);
    logger.debug("event.blockData", event["blockData"])
    logger.debug("event.blockData[0]", event["blockData"][targetIndex])
    logger.debug("event.blockData[0].Payload", event["blockData"][targetIndex]["Payload"])
    logger.debug("event.blockData.Payload.Name", event["blockData"][targetIndex]["Payload"]["Name"])

    var trxPayload = event["blockData"][targetIndex]["Payload"]
    if (trxPayload == undefined || trxPayload == NIL) {
      logger.error("transaction payload is empty")
      return
    }
    try {
      if (trxPayload["Func"] !== "set") {
        const transactionSubset = {
          Name: trxPayload["Arg"][0],
          Value: trxPayload["Arg"][1],
          Verb: trxPayload["Func"],
        };
        this.remittanceTransaction(transactionSubset);
      }
    } catch (err) {
      logger.error(
          `##onEventTCS(): err: ${err}, event: ${json2str(event)}`,
      );
    }
  }

  getTransactionFromTCSEvent(
      event: object,
      targetIndex: number,
  ): object | null {
    try {
      const retTransaction = event["blockData"][targetIndex];
      logger.debug(
          `##getTransactionFromTCSEvent(), retTransaction: ${retTransaction}`,
      );
      return retTransaction;
    } catch (err) {
      logger.error(
          `##getTransactionFromTCSEvent(): invalid even, err:${err}, event:${event}`,
      );
    }
  }

  onEventEthereum(event: object, targetIndex: number): void {
    logger.debug(`##in onEventEthereum()`);
    const tx = this.getTransactionFromEthereumEvent(event, targetIndex);
    if (tx == null) {
      logger.error(`##onEventEthereum(): invalid event: ${json2str(event)}`);
      return;
    }
    const contract = {contract:"cactustest"};
    const method = { type: "contract",method: "inc" };
    const args = { args: ["MI000001", "24"], crossChain: true };
    const verifierTcs = routesVerifierFactory.getVerifier(
        "sUr7dZly" ,
    );
    verifierTcs
        .sendAsyncRequest(contract, method, args)
        .then(() => {
          logger.debug(`##tcshuawei sendAsyncRequest finish`);
        })
        .catch((err) => {
          logger.error(err);
        });
    try {
      const txId = tx["hash"];
      const status = event["status"];
      logger.debug(`##txId = ${txId}`);
      logger.debug(`##status =${status}`);

      if (status !== 200) {
        logger.error(
            `##onEventEthereum(): error event, status: ${status}, txId: ${txId}`,
        );
        return;
      }
    } catch (err) {
      logger.error(
          `##onEventEthereum(): err: ${err}, event: ${json2str(event)}`,
      );
    }
  }

  getTransactionFromEthereumEvent(
      event: object,
      targetIndex: number,
  ): object | null {
    try {
      const retTransaction = event["blockData"]["transactions"][targetIndex];
      logger.debug(
          `##getTransactionFromEthereumEvent(), retTransaction: ${retTransaction}`,
      );
      return retTransaction;
    } catch (err) {
      logger.error(
          `##getTransactionFromEthereumEvent(): invalid even, err:${err}, event:${event}`,
      );
    }
  }

  getOperationStatus(tradeID: string): object {
    logger.debug(`##in getOperationStatus()`);
    return {};
  }

  getTxIDFromEvent(
      ledgerEvent: LedgerEvent,
      targetIndex: number,
  ): string | null {
    logger.debug(`##in getTxIDFromEvent`);
    //        logger.debug(`##event: ${json2str(ledgerEvent)}`);

    switch (ledgerEvent.verifierId) {
      case config.electricityTradeInfo.tcsHuawei.validatorID:
        return this.getTxIDFromEventTCS(ledgerEvent.data, targetIndex);
      case config.electricityTradeInfo.ethereum.validatorID:
        return this.getTxIDFromEventEtherem(ledgerEvent.data, targetIndex);
      default:
        logger.error(
            `##getTxIDFromEvent(): invalid verifierId: ${ledgerEvent.verifierId}`,
        );
    }
    return null;
  }

  getTxIDFromEventTCS(event: object, targetIndex: number): string | null {
    logger.debug(`##in getTxIDFromEventTCS()`);
    const tx = this.getTransactionFromTCSEvent(event, targetIndex);
    if (tx == null) {
      logger.warn(`#getTxIDFromEventTCS(): skip(not found tx)`);
      return null;
    }

    try {
      return "txId-test-1"
      const txId = tx["header_signature"];

      if (typeof txId !== "string") {
        logger.warn(
            `#getTxIDFromEventTCS(): skip(invalid block, not found txId.), event: ${json2str(
                event,
            )}`,
        );
        return null;
      }

      logger.debug(`###getTxIDFromEventTCS(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
          `##getTxIDFromEventTCS(): err: ${err}, event: ${json2str(event)}`,
      );
      return null;
    }
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
                event,
            )}`,
        );
        return null;
      }

      logger.debug(`###getTxIDFromEventEtherem(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
          `##getTxIDFromEventEtherem(): err: ${err}, event: ${json2str(event)}`,
      );
      return null;
    }
  }

  getEventDataNum(ledgerEvent: LedgerEvent): number {
    logger.debug(
        `##in BLP:getEventDataNum(), ledgerEvent.verifierId: ${ledgerEvent.verifierId}`,
    );
    const event = ledgerEvent.data;
    let retEventNum = 0;

    try {
      switch (ledgerEvent.verifierId) {
        case config.electricityTradeInfo.tcsHuawei.validatorID:
          retEventNum = event["blockData"].length;
          break;
        case config.electricityTradeInfo.ethereum.validatorID:
          retEventNum = event["blockData"]["transactions"].length;
          break;
        default:
          logger.error(
              `##getEventDataNum(): invalid verifierId: ${ledgerEvent.verifierId}`,
          );
          break;
      }
      logger.debug(
          `##getEventDataNum(): retEventNum: ${retEventNum}, verifierId: ${ledgerEvent.verifierId}`,
      );
      return retEventNum;
    } catch (err) {
      logger.error(
          `##getEventDataNum(): invalid even, err: ${err}, event: ${event}`,
      );
      return 0;
    }
  }

  getAccountInfo(transactionSubset: object): object {
    const transactionInfo = {};

    // Get Meter Information.
    const meterInfo: MeterInfo | null = this.meterManagement.getMeterInfo(
        transactionSubset["Name"],
    );
    if (meterInfo === null) {
      logger.debug(`Not registered. meterID = ${transactionSubset["Name"]}`);
      return transactionInfo;
    }

    logger.debug(`getAccountInfo(): Verb = ${transactionSubset["Verb"]}`);
    if (transactionSubset["Verb"] === "inc") {
      logger.debug("getAccountInfo(): Verb = inc");
      transactionInfo["fromAddress"] = "0x" + meterInfo.bankAccount;
      transactionInfo["fromAddressPkey"] = meterInfo.bankAccountPKey;
      transactionInfo["toAddress"] = "0x" + meterInfo.powerCompanyAccount;
    }

    return transactionInfo;
  }

  setConfig(meterParams: string[]): object {
    logger.debug("called setConfig()");

    // add MeterInfo
    const meterInfo = new MeterInfo(meterParams);
    const result: {} = this.meterManagement.addMeterInfo(meterInfo);
    return result;
  }
}
