/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicElectricityTrade.ts
 */

import type { Request } from "express";
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
import { sendEthereumTransaction } from "./TransactionEthereum";

const config: any = ConfigUtil.getConfig() as any;
import { getLogger } from "log4js";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const moduleName = "BusinessLogicElectricityTrade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;
const connectInfo = new LPInfoHolder();
const routesVerifierFactory = new VerifierFactory(
  connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
  config.logLevel,
);

interface SawtoothEventData {
  status: number | string;
  blockData: [];
}

interface SawtoothBlockDataData {
  header_signature: string;
  hash: string;
  payload_decoded: { Verb: string; Name: string; Value: string }[];
}

export class BusinessLogicElectricityTrade extends BusinessLogicBase {
  businessLogicID: string;
  meterManagement: MeterManagement;

  constructor(businessLogicID: string) {
    super();
    this.businessLogicID = businessLogicID;
    this.meterManagement = new MeterManagement();
  }

  startTransaction(
    req: Request,
    businessLogicID: string,
    tradeID: string,
  ): void {
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

  startMonitor(tradeInfo: TradeInfo): void {
    // Get Verifier Instance
    logger.debug(
      `##startMonitor(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID),
    );
    logger.debug(
      `filterKey: ${config.electricityTradeInfo.sawtooth.filterKey}`,
    );
    const options = {
      filterKey: config.electricityTradeInfo.sawtooth.filterKey,
    };
    //        const verifierSawtooth = transactionManagement.getVerifier(useValidator['validatorID'][0], options);
    const verifierSawtooth = routesVerifierFactory.getVerifier(
      useValidator["validatorID"][0],
    );
    verifierSawtooth.startMonitor(
      "BusinessLogicElectricityTrade",
      options,
      routesTransactionManagement,
    );
    logger.debug("getVerifierSawtooth");
  }

  remittanceTransaction(transactionSubset: Record<string, string>): void {
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

    logger.debug(
      `##remittanceTransaction(): businessLogicID: ${this.businessLogicID}`,
    );
    sendEthereumTransaction(
      {
        to: accountInfo["toAddress"],
        value: Number(transactionSubset["Value"]),
        gas: config.electricityTradeInfo.ethereum.gas,
      },
      accountInfo["fromAddress"],
      accountInfo["fromAddressPkey"],
    )
      .then((result) => {
        logger.info(
          "remittanceTransaction txId : " +
            result.transactionReceipt.transactionHash,
        );
        logger.debug(`##remittanceTransaction sendAsyncRequest finish`);
      })
      .catch((err) => {
        logger.error("sendEthereumTransaction remittance ERROR:", err);
      });
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    logger.debug(`##in BLP:onEvent()`);
    logger.debug(
      `##onEvent(): ${json2str(ledgerEvent["data"]["blockData"][targetIndex])}`,
    );

    switch (ledgerEvent.verifierId) {
      case config.electricityTradeInfo.sawtooth.validatorID:
        this.onEventSawtooth(ledgerEvent.data, targetIndex);
        break;
      default:
        logger.error(
          `##onEvent(), invalid verifierId: ${ledgerEvent.verifierId}`,
        );
        return;
    }
  }

  onEventSawtooth(event: SawtoothEventData, targetIndex: number): void {
    logger.debug(`##in onEventSawtooth()`);
    const tx = this.getTransactionFromSawtoothEvent(event, targetIndex);
    if (tx == null) {
      logger.error(`##onEventSawtooth(): invalid event: ${json2str(event)}`);
      return;
    }

    try {
      const txId = tx["header_signature"];
      logger.debug(`##txId = ${txId}`);

      if (tx["payload_decoded"][0].Verb !== "set") {
        const transactionSubset = {
          Name: tx["payload_decoded"][0].Name,
          Value: tx["payload_decoded"][0].Value,
          Verb: tx["payload_decoded"][0].Verb,
        };
        this.remittanceTransaction(transactionSubset);
      }
    } catch (err) {
      logger.error(
        `##onEventSawtooth(): err: ${err}, event: ${json2str(event)}`,
      );
    }
  }

  getTransactionFromSawtoothEvent(
    event: SawtoothEventData,
    targetIndex: number | string,
  ): SawtoothBlockDataData | undefined {
    try {
      if (typeof targetIndex === "number") {
        const retTransaction = event["blockData"][targetIndex];

        logger.debug(
          `##getTransactionFromSawtoothEvent(), retTransaction: ${retTransaction}`,
        );
        return retTransaction;
      }
    } catch (err) {
      logger.error(
        `##getTransactionFromSawtoothEvent(): invalid even, err:${err}, event:${event}`,
      );
    }
  }

  getOperationStatus(): Record<string, unknown> {
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
      case config.electricityTradeInfo.sawtooth.validatorID:
        return this.getTxIDFromEventSawtooth(ledgerEvent.data, targetIndex);
      default:
        logger.error(
          `##getTxIDFromEvent(): invalid verifierId: ${ledgerEvent.verifierId}`,
        );
    }
    return null;
  }

  getTxIDFromEventSawtooth(
    event: SawtoothEventData,
    targetIndex: number | string,
  ): string | null {
    logger.debug(`##in getTxIDFromEventSawtooth()`);
    const tx = this.getTransactionFromSawtoothEvent(event, targetIndex);
    if (tx == null) {
      logger.warn(`#getTxIDFromEventSawtooth(): skip(not found tx)`);
      return null;
    }

    try {
      const txId = tx["header_signature"];

      if (typeof txId !== "string") {
        logger.warn(
          `#getTxIDFromEventSawtooth(): skip(invalid block, not found txId.), event: ${json2str(
            event,
          )}`,
        );
        return null;
      }

      logger.debug(`###getTxIDFromEventSawtooth(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
        `##getTxIDFromEventSawtooth(): err: ${err}, event: ${json2str(event)}`,
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
      logger.error(ledgerEvent.data);

      switch (ledgerEvent.verifierId) {
        case config.electricityTradeInfo.sawtooth.validatorID:
          retEventNum = event["blockData"].length;
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

  getAccountInfo(
    transactionSubset: Record<string, string>,
  ): Record<string, string> {
    const transactionInfo: Record<string, string> = {};

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

  setConfig(meterParams: string[]): Record<string, string> {
    logger.debug("called setConfig()");

    // add MeterInfo
    const meterInfo = new MeterInfo(meterParams);
    const result = this.meterManagement.addMeterInfo(meterInfo);
    return result;
  }
}
