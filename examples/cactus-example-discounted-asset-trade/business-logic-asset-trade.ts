/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * business-logic-asset-trade.ts
 */

import { Request } from "express";
import { RequestInfo } from "@hyperledger/cactus-common-example-server";
import { TradeInfo } from "@hyperledger/cactus-common-example-server";
import { TransactionInfoManagement } from "./transaction-info-management";
import { TransactionInfo } from "./transaction-info";
import { TransactionData } from "./transaction-data";
import { BusinessLogicInquireAssetTradeStatus } from "./business-logic-inquire-asset-trade-status";
import { TxInfoData } from "./tx-info-data";
import { BusinessLogicBase } from "@hyperledger/cactus-common-example-server";
import { transferOwnership } from "./transaction-fabric";
import { isEmploymentCredentialProofValid } from "./transaction-indy";
import {
  LedgerEvent,
  ConfigUtil,
} from "@hyperledger/cactus-common-example-server";
import { json2str } from "@hyperledger/cactus-common-example-server";
import { AssetTradeStatus } from "./define";
import {
  CactiBlockTransactionEventV1,
  WatchBlocksListenerTypeV1 as FabricWatchBlocksListenerTypeV1,
  WatchBlocksResponseV1 as FabricWatchBlocksResponseV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { Web3TransactionReceipt } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
const config: any = ConfigUtil.getConfig();

import { getLogger } from "log4js";
import {
  createSigningToken,
  getFabricApiClient,
  getSignerIdentity,
} from "./fabric-connector";
import { sendEthereumTransaction } from "./transaction-ethereum";
import { hasKey } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";

const moduleName = "BusinessLogicAssetTrade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

interface TransactionStatusData {
  stateInfo: number | undefined;
  transactionStatus: {
    state: string;
    ledger: string;
    txID: string;
    txInfo: string; // JSON string
  }[];
}

export class BusinessLogicAssetTrade extends BusinessLogicBase {
  transactionInfoManagement: TransactionInfoManagement;

  constructor() {
    super();
    this.transactionInfoManagement = new TransactionInfoManagement();
  }

  startTransaction(
    req: Request,
    businessLogicID: string,
    tradeID: string,
  ): void {
    logger.debug("called startTransaction");

    // set RequestInfo
    let requestInfo: RequestInfo = new RequestInfo();
    requestInfo.businessLogicID = businessLogicID;
    requestInfo.tradeInfo.ethereumAccountFrom = req.body.tradeParams[0];
    requestInfo.tradeInfo.ethereumAccountTo = req.body.tradeParams[1];
    requestInfo.tradeInfo.fabricAccountFrom = req.body.tradeParams[2];
    requestInfo.tradeInfo.fabricAccountTo = req.body.tradeParams[3];
    requestInfo.tradeInfo.assetID = req.body.tradeParams[4];
    requestInfo.tradeInfo.indyAgentConId = req.body.tradeParams[5];

    // set TradeID
    requestInfo.setTradeID(tradeID);

    // Register transaction information in transaction information management
    const transactionInfo: TransactionInfo = new TransactionInfo();
    transactionInfo.setRequestInfo(0, requestInfo);
    // pricing of trade by user's status which is employee or not employee
    this.Pricing(requestInfo)
      .then((result) => {
        requestInfo = result;
        // Create trade information
        const tradeInfo: TradeInfo = new TradeInfo(
          requestInfo.businessLogicID,
          requestInfo.tradeID,
        );
        // Save transaction value
        transactionInfo.setRequestInfo(1, requestInfo);
        this.transactionInfoManagement.addTransactionInfo(transactionInfo);
        // trade status update
        this.transactionInfoManagement.setStatus(
          tradeInfo,
          AssetTradeStatus.UnderEscrow,
        );
        this.firstTransaction(requestInfo, tradeInfo);
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  dummyTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo): void {
    logger.debug("called dummyTransaction");

    let transactionData: TransactionData = new TransactionData(
      "escrow",
      "ledger001",
      "tid001",
    );
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData,
    );

    this.transactionInfoManagement.setStatus(
      tradeInfo,
      AssetTradeStatus.UnderTransfer,
    );

    transactionData = new TransactionData("transfer", "ledger002", "tid002");
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData,
    );

    this.transactionInfoManagement.setStatus(
      tradeInfo,
      AssetTradeStatus.UnderSettlement,
    );

    transactionData = new TransactionData("settlement", "ledger003", "tid003");
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData,
    );

    this.transactionInfoManagement.setStatus(
      tradeInfo,
      AssetTradeStatus.Completed,
    );
  }

  async Pricing(requestInfo: RequestInfo): Promise<RequestInfo> {
    logger.debug("called Pricing");

    // price list
    const priceList = { default: "50", employee: "25" };

    const credentialDefinitionId =
      config?.assetTradeInfo?.indy?.credentialDefinitionId;
    if (!credentialDefinitionId) {
      throw new Error(
        "Missing employment credentialDefinitionId! Can't proof employment status!",
      );
    }
    const isPreferredCustomer = await isEmploymentCredentialProofValid(
      requestInfo.tradeInfo.indyAgentConId,
      credentialDefinitionId,
    );

    // decide the price from result of isPreferredCustomer
    if (isPreferredCustomer) {
      logger.debug("##isPreferredCustomer result : true");
      requestInfo.tradeInfo.tradingValue = priceList.employee;
    } else {
      logger.debug("##isPreferredCustomer result : false");
      requestInfo.tradeInfo.tradingValue = priceList.default;
    }

    return requestInfo;
  }

  /**
   * Eth Escrow
   */
  firstTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo): void {
    logger.debug(
      `##firstTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );

    // Send funds to escrow
    logger.debug(
      `####fromAddress: ${requestInfo.tradeInfo.ethereumAccountFrom}`,
    );
    const fromAddressPkey =
      config.assetTradeInfo.ethereum[
        "fromAddressPkey_" + requestInfo.tradeInfo.ethereumAccountFrom
      ];
    logger.debug(`####fromAddressPkey: ${fromAddressPkey}`);
    const escrowAddress = config.assetTradeInfo.ethereum.escrowAddress;

    sendEthereumTransaction(
      {
        to: escrowAddress,
        value: Number(requestInfo.tradeInfo.tradingValue),
        gasLimit: config.assetTradeInfo.ethereum.gas,
      },
      requestInfo.tradeInfo.ethereumAccountFrom,
      fromAddressPkey,
    )
      .then((result) => {
        logger.debug("sendEthereumTransaction escrow tx:", result);
        const txId = result.transactionReceipt.transactionHash;
        logger.info("firstTransaction txId : ", txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "escrow",
          "ledger001",
          txId,
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData,
        );

        this.executeNextTransaction(result.transactionReceipt, txId);
      })
      .catch((err) => {
        logger.error("sendEthereumTransaction Escrow ERROR:", err);
      });
  }

  async secondTransaction(
    assetID: string,
    fabricAccountTo: string,
    tradeInfo: TradeInfo,
  ): Promise<void> {
    logger.debug("called secondTransaction");

    // Start monitoring
    const fabricApiClient = getFabricApiClient();
    const watchObservable = fabricApiClient.watchBlocksDelegatedSignV1({
      channelName: config.assetTradeInfo.fabric.channelName,
      type: FabricWatchBlocksListenerTypeV1.CactiTransactions,
      signerCertificate: getSignerIdentity().credentials.certificate,
      signerMspID: getSignerIdentity().mspId,
      uniqueTransactionData: createSigningToken("watchBlock"),
    });
    const watchSub = watchObservable.subscribe({
      next: (event: FabricWatchBlocksResponseV1) => {
        if (!("cactiTransactionsEvents" in event)) {
          logger.error("Wrong input block format!", event);
          return;
        }

        for (const ev of event.cactiTransactionsEvents) {
          logger.debug(`##in onEventFabric()`);

          try {
            const txId = ev.transactionId;
            logger.debug(`##txId = ${txId}`);
            if (this.hasTxIDInTransactions(txId)) {
              watchSub.unsubscribe();
              this.executeNextTransaction(ev, txId);
              break;
            }
          } catch (err) {
            logger.error(
              `##onEventFabric(): onEvent, err: ${err}, event: ${JSON.stringify(
                ev,
              )}`,
              ev,
            );
          }
        }
      },
      error(err: unknown) {
        logger.error("Fabric watchBlocksV1() error:", err);
      },
    });

    const result = await transferOwnership(assetID, fabricAccountTo);
    if (
      !hasKey(result, "transactionId") ||
      typeof result.transactionId !== "string"
    ) {
      throw new RuntimeError(
        "secondTransaction() Invalid transactionId returned from transferOwnership: %s",
        result.transactionId,
      );
    }
    logger.info("secondTransaction txId : " + result.transactionId);

    // Register transaction data in DB
    const transactionData: TransactionData = new TransactionData(
      "transfer",
      "ledger002",
      result.transactionId,
    );
    this.transactionInfoManagement.setTransactionData(
      tradeInfo,
      transactionData,
    );
  }

  thirdTransaction(
    ethereumAccountTo: string,
    tradingValue: string,
    tradeInfo: TradeInfo,
  ): void {
    logger.debug(
      `##thirdTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
    const escrowAddress = config.assetTradeInfo.ethereum.escrowAddress;
    const escrowAddressPkey = config.assetTradeInfo.ethereum.escrowAddressPkey;

    sendEthereumTransaction(
      {
        to: ethereumAccountTo,
        value: Number(tradingValue),
        gasLimit: config.assetTradeInfo.ethereum.gas,
      },
      escrowAddress,
      escrowAddressPkey,
    )
      .then((result) => {
        logger.debug("sendEthereumTransaction() final results:", result);
        const txId = result.transactionReceipt.transactionHash;
        logger.info("thirdTransaction txId : ", txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "settlement",
          "ledger003",
          txId,
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData,
        );
        this.executeNextTransaction(result.transactionReceipt, txId);
      })
      .catch((err) => {
        logger.error("sendEthereumTransaction Final ERROR:", err);
      });
  }

  completedTransaction(tradeInfo: TradeInfo): void {
    logger.debug("called completedTransaction");

    logger.debug(
      `##completedTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
  }

  finish(): void {
    logger.debug("called finish");
  }

  onEvent(): void {
    logger.warn(`onEvent() should not be called`);
  }

  executeNextTransaction(
    txInfo: CactiBlockTransactionEventV1 | Web3TransactionReceipt,
    txId: string,
  ): void {
    let transactionInfo: TransactionInfo | null = null;
    try {
      // Retrieve DB transaction information
      transactionInfo =
        this.transactionInfoManagement.getTransactionInfoByTxId(txId);
      if (transactionInfo != null) {
        logger.debug(
          `##onEvent(A), transactionInfo: ${json2str(transactionInfo)}`,
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
        case AssetTradeStatus.UnderEscrow:
          // store transaction information in DB
          txInfoData = new TxInfoData("escrow", JSON.stringify(txInfo));
          this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

          // underEscrow -> underTransfer
          logger.info(
            `##INFO: underEscrow -> underTransfer, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`,
          );
          this.transactionInfoManagement.setStatus(
            tradeInfo,
            AssetTradeStatus.UnderTransfer,
          );
          this.secondTransaction(
            transactionInfo.assetID,
            transactionInfo.fabricAccountTo,
            tradeInfo,
          );
          break;
        case AssetTradeStatus.UnderTransfer:
          // store transaction information in DB
          txInfoData = new TxInfoData("transfer", JSON.stringify(txInfo));
          this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

          // underTransfer -> underSettlement
          logger.info(
            `##INFO: underTransfer -> underSettlement, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`,
          );
          this.transactionInfoManagement.setStatus(
            tradeInfo,
            AssetTradeStatus.UnderSettlement,
          );
          this.thirdTransaction(
            transactionInfo.ethereumAccountTo,
            transactionInfo.tradingValue,
            tradeInfo,
          );
          break;
        case AssetTradeStatus.UnderSettlement:
          // store transaction information in DB
          txInfoData = new TxInfoData("settlement", JSON.stringify(txInfo));
          this.transactionInfoManagement.setTxInfo(tradeInfo, txInfoData);

          // underSettlement -> completed
          this.transactionInfoManagement.setStatus(
            tradeInfo,
            AssetTradeStatus.Completed,
          );
          logger.info(
            `##INFO: completed asset-trade, businessLogicID: ${transactionInfo.businessLogicID}, tradeID: ${transactionInfo.tradeID}`,
          );
          this.completedTransaction(tradeInfo);
          break;
        case AssetTradeStatus.Completed:
          logger.warn(
            `##WARN: already completed, txinfo: ${json2str(transactionInfo)}`,
          );
          return;
        default:
          logger.error(`##ERR: bad txStatus: ${txStatus}`);
          return;
      }
    } catch (err) {
      logger.error(
        `##ERR: executeNextTransaction(), err: ${err}, tx: ${JSON.stringify(
          transactionInfo,
        )}`,
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

  getOperationStatus(tradeID: string): TransactionStatusData {
    logger.debug(`##in getOperationStatus()`);
    const businessLogicInquireAssetTradeStatus: BusinessLogicInquireAssetTradeStatus =
      new BusinessLogicInquireAssetTradeStatus();
    const transactionStatusData =
      businessLogicInquireAssetTradeStatus.getAssetTradeOperationStatus(
        tradeID,
      );

    return transactionStatusData;
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
      `##in BLP:getEventDataNum(), ledgerEvent.verifierId: ${ledgerEvent.verifierId}`,
    );
    const event = ledgerEvent.data;
    let retEventNum = 0;

    try {
      switch (ledgerEvent.verifierId) {
        case config.assetTradeInfo.ethereum.validatorID:
          retEventNum = event["blockData"]["transactions"].length;
          break;
        case config.assetTradeInfo.fabric.validatorID:
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
}
