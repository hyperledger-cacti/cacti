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
  BusinessLogicBase,
  json2str,
  ConfigUtil,
} from "@hyperledger/cactus-common-example-server";
import { sendEthereumTransaction } from "./TransactionEthereum";

const config: any = ConfigUtil.getConfig() as any;
import { getLogger } from "log4js";
import { getSawtoothApiClient } from "./sawtooth-connector";
import {
  isWatchBlocksV1CactiTransactionsResponse,
  WatchBlocksV1ListenerType,
  WatchBlocksV1Progress,
} from "@hyperledger/cactus-plugin-ledger-connector-sawtooth";

const moduleName = "BusinessLogicElectricityTrade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

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

    this.startSawtoothMonitor();
  }

  startSawtoothMonitor(): void {
    // Start monitoring
    const sawtoothApiClient = getSawtoothApiClient();
    const watchObservable = sawtoothApiClient.watchBlocksV1({
      type: WatchBlocksV1ListenerType.CactiTransactions,
      txFilterBy: {
        family_name: config.electricityTradeInfo.sawtooth.filterKey,
      },
    });
    watchObservable.subscribe({
      next: (event: WatchBlocksV1Progress) => {
        logger.debug(`##in onEventSawtooth()`);

        if (!isWatchBlocksV1CactiTransactionsResponse(event)) {
          logger.error("Wrong input block format!", event);
          return;
        }

        for (const tx of event.cactiTransactionsEvents) {
          try {
            const txId = tx.header_signature;
            logger.debug(`##txId = ${txId}`);

            const txPayload = tx.payload_decoded[0];
            if (txPayload && txPayload.Verb !== "set") {
              this.remittanceTransaction({
                Name: txPayload.Name,
                Value: txPayload.Value,
                Verb: txPayload.Verb,
              });
            }
          } catch (err) {
            logger.error(
              `##onEventSawtooth(): onEvent, err: ${err}, event: ${JSON.stringify(
                tx,
              )}`,
              tx,
            );
          }
        }
      },
      error(err: unknown) {
        logger.error("Sawtooth watchBlocksV1() error:", err);
      },
    });
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
        gasLimit: config.electricityTradeInfo.ethereum.gas,
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

  onEvent(): void {
    logger.error(
      "onEvent() ERROR - No monitors are running, should not be called!",
    );
    return;
  }

  getOperationStatus(): Record<string, unknown> {
    logger.debug(`##in getOperationStatus()`);
    return {};
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
