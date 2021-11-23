/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicRunTransaction.ts
 */

import { Request } from "express";
import { RequestInfo } from "./RequestInfo";
//import { MeterManagement } from './MeterManagement';
//import { MeterInfo } from './MeterInfo';
import { TradeInfo } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TradeInfo";
import { transactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { verifierFactory } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { BusinessLogicBase } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BusinessLogicBase";
//import { makeRawTransaction } from './TransactionEthereum'
import { LedgerEvent } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/LedgerPlugin";
import { json2str } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/DriverCommon";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
//const config: any = JSON.parse(fs.readFileSync("/etc/cactus/default.json", 'utf8'));
const config: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/default.yaml", "utf8")
);
import { getLogger } from "log4js";
const moduleName = "BusinessLogicRunTransaction";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BusinessLogicRunTransaction extends BusinessLogicBase {
  businessLogicID: string;

  constructor(businessLogicID: string) {
    super();
    this.businessLogicID = businessLogicID;
  }

  startTransaction(req: Request, businessLogicID: string, tradeID: string) {
    logger.debug("called startTransaction()");

    // set RequestInfo
    const requestInfo: RequestInfo = new RequestInfo();
    requestInfo.setBusinessLogicID(businessLogicID);
    requestInfo.keychainId = req.body.tradeParams[0];
    requestInfo.keychainRef = req.body.tradeParams[1];
    requestInfo.channelName = req.body.tradeParams[2];
    requestInfo.invocationType = req.body.tradeParams[3];
    requestInfo.functionName = req.body.tradeParams[4];
    requestInfo.functionArgs = req.body.tradeParams[5];
    logger.debug(`tradeParams: ${req.body.tradeParams}`);

    // set TradeID
    requestInfo.setTradeID(tradeID);

    // Create trade information
    const tradeInfo: TradeInfo = new TradeInfo(
      requestInfo.businessLogicID,
      requestInfo.tradeID
    );

    // Call Verifier to perform the function
    this.execTransaction(requestInfo, tradeInfo);
  }

  execTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo) {
    logger.debug("called execTransaction()");

    const useValidator = JSON.parse(
      transactionManagement.getValidatorToUse(tradeInfo.businessLogicID)
    );

    // TODO: Temporarily specify no monitoring required (# 4rd parameter = false)
    const verifier = verifierFactory.getVerifier(
      useValidator["validatorID"][0],
      "BusinessLogicRunTransaction",
      {},
      false
    );
    logger.debug("getVerifier");

    const contract = {};
    const method = { command: "test-run-transaction" };
    const args = {
      args: {
        keychainId: requestInfo.keychainId,
        keychainRef: requestInfo.keychainRef,
        channelName: requestInfo.channelName,
        invocationType: requestInfo.invocationType,
        functionName: requestInfo.functionName,
        functionArgs: requestInfo.functionArgs,
      },
    };

    logger.debug(`##execTransaction call verifier.sendAsyncRequest()`);
    verifier
      .sendAsyncRequest(contract, method, args)
      .then(() => {
        logger.debug(`##execTransaction sendAsyncRequest finish`);
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    logger.debug(`##in BLP:onEvent()`);
    logger.debug(`##onEvent(): ${json2str(ledgerEvent)}`);
  }

  getEventDataNum(ledgerEvent: LedgerEvent): number {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    // TODO:
    logger.debug(
      `##in getEventDataNum(), ledgerEvent: ${JSON.stringify(ledgerEvent)}`
    );
    const retEventNum = ledgerEvent.data["blockData"].length;
    logger.debug(`##retEventNum: ${retEventNum}`);
    return retEventNum;
  }

  getTxIDFromEvent(
    ledgerEvent: LedgerEvent,
    targetIndex: number
  ): string | null {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    // TODO:
    logger.debug(
      `##in getTxIDFromEvent(), ledgerEvent: ${JSON.stringify(ledgerEvent)}`
    );

    const txId = ledgerEvent.data["txId"];

    if (typeof txId !== "string") {
      logger.warn(
        `#getTxIDFromEvent(): skip(invalid block, not found txId.), event: ${json2str(
          ledgerEvent
        )}`
      );
      return null;
    }

    logger.debug(`###getTxIDFromEvent(): txId: ${txId}`);
    return txId;
  }
}
