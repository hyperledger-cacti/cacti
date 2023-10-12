/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * business-logic-asset-trade.ts
 */

import { Request } from "express";
import { RequestInfo } from "@hyperledger/cactus-cmd-socketio-server";
import { TradeInfo } from "@hyperledger/cactus-cmd-socketio-server";
import { TransactionInfoManagement } from "./transaction-info-management";
import { TransactionInfo } from "./transaction-info";
import { TransactionData } from "./transaction-data";
import { BusinessLogicInquireAssetTradeStatus } from "./business-logic-inquire-asset-trade-status";
import { TxInfoData } from "./tx-info-data";
import { routesTransactionManagement } from "@hyperledger/cactus-cmd-socketio-server";
import { BusinessLogicBase } from "@hyperledger/cactus-cmd-socketio-server";
import { LPInfoHolder } from "@hyperledger/cactus-cmd-socketio-server";
import { makeRawTransaction } from "./transaction-ethereum";
import { transferOwnership } from "./transaction-fabric";
import { getDataFromIndy } from "./transaction-indy";
import {
  LedgerEvent,
  ConfigUtil,
} from "@hyperledger/cactus-cmd-socketio-server";
import { json2str } from "@hyperledger/cactus-cmd-socketio-server";
import { AssetTradeStatus } from "./define";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";
import {
  WatchBlocksCactusTransactionsEventV1,
  WatchBlocksListenerTypeV1,
  WatchBlocksResponseV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

const config: any = ConfigUtil.getConfig();

import { getLogger } from "log4js";
import {
  createSigningToken,
  getFabricApiClient,
  getSignerIdentity,
} from "./fabric-connector";
const moduleName = "BusinessLogicAssetTrade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const connectInfo = new LPInfoHolder();
const routesVerifierFactory = new VerifierFactory(
  connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
  config.logLevel,
);

const indy = require("indy-sdk");
const assert = require("assert");
const identifierSchema = "schema";
const identifierCredDef = "credDef";

interface EthEvent {
  blockData: { transactions: { [key: string]: EthData } };
  hash: string;
  status: number;
}
interface EthData {
  hash: string;
}

interface FabricEvent {
  txId: string;
  blockData: [];
  hash: string;
  status: number;
}

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
  // useValidator: {};

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
    //requestInfo.tradeInfo.tradingValue = req.body.tradeParams[4];
    requestInfo.tradeInfo.assetID = req.body.tradeParams[4];
    requestInfo.tradeInfo.proofJson = JSON.parse(req.body.tradeParams[5]);
    // requestInfo.authInfo.company = req.body.authParams[0];

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

    logger.debug(JSON.stringify(requestInfo.tradeInfo.proofJson));
    const isPreferredCustomer = await this.isPreferredCustomer(
      requestInfo.tradeInfo.proofJson,
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

  async isPreferredCustomer(input_obj: {
    tradeInfo: string;
    proof_request: string;
    proof: string;
  }): Promise<boolean | unknown> {
    let proofRequestJson;
    let proofJson;
    try {
      proofRequestJson = JSON.parse(input_obj["proof_request"]);
      proofJson = JSON.parse(input_obj["proof"]);
    } catch (err) {
      logger.error(
        "Error while reading proof and proof request. returning false.",
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
        proofJson["requested_proof"]["revealed_attrs"]["attr1_referent"]["raw"],
    );

    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger schemasJson : ${JSON.stringify(
        schemasJson,
      )}`,
    );
    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger credDefsJson : ${JSON.stringify(
        credDefsJson,
      )}`,
    );
    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger revRegDefsJson : ${JSON.stringify(
        revRegDefsJson,
      )}`,
    );
    logger.debug(
      `##isPreferredCustomer verifierGetEntitiesFromLedger revRegsJson : ${JSON.stringify(
        revRegsJson,
      )}`,
    );

    try {
      const verif_result = await indy.verifierVerifyProof(
        proofRequestJson,
        proofJson,
        schemasJson,
        credDefsJson,
        revRegDefsJson,
        revRegsJson,
      );
      logger.debug("verify proof: " + (verif_result ? "ok" : "not ok"));
      return verif_result;
    } catch (err) {
      logger.error(
        "error raised during indy.verifierVerifyProof() invocation. defaulting to false (= NO DISCOUNT)",
      );
      logger.error(err);
      return false;
    }
  }

  async verifierGetEntitiesFromLedger(
    did: string | null,
    identifiers: {
      [keyof: string]: { schema_id: string; cred_def_id: string };
    },
  ): Promise<
    [
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>,
    ]
  > {
    const schemas: { [keyof: string]: string } = {};
    const credDefs: { [keyof: string]: string } = {};
    const revRegDefs = {};
    const revRegs = {};

    for (const referent of Object.keys(identifiers)) {
      const item = identifiers[referent];
      const args_request_getSchema = { did: did, schemaId: item["schema_id"] };
      const responseSchema: {
        data: string[];
      } = await getDataFromIndy(args_request_getSchema, identifierSchema);
      const [receivedSchemaId, receivedSchema] = responseSchema["data"];
      schemas[receivedSchemaId] = JSON.parse(receivedSchema);

      const args_request_getCredDef = {
        did: did,
        schemaId: item["cred_def_id"],
      };
      const responseCredDef: {
        data: string[];
      } = await getDataFromIndy(args_request_getCredDef, identifierCredDef);

      const [receivedCredDefId, receivedCredDef] = responseCredDef["data"];
      credDefs[receivedCredDefId] = JSON.parse(receivedCredDef);
    }

    logger.debug("finish get Data from indy");

    return [schemas, credDefs, revRegDefs, revRegs];
  }

  firstTransaction(requestInfo: RequestInfo, tradeInfo: TradeInfo): void {
    logger.debug("called firstTransaction");

    ///// Eth Escrow

    // Get Verifier Instance
    logger.debug(
      `##firstTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID),
    );
    const verifierEthereum = routesVerifierFactory.getVerifier(
      useValidator["validatorID"][0],
    );
    verifierEthereum.startMonitor(
      "BusinessLogicAssetTrade",
      {},
      routesTransactionManagement,
    );
    logger.debug("getVerifierEthereum");

    // TODO: get private key from
    logger.debug(
      `####fromAddress: ${requestInfo.tradeInfo.ethereumAccountFrom}`,
    );
    const fromAddressPkey =
      config.assetTradeInfo.ethereum[
        "fromAddressPkey_" + requestInfo.tradeInfo.ethereumAccountFrom
      ];
    logger.debug(`####fromAddressPkey: ${fromAddressPkey}`);
    // TODO: Get address of escrow and set parameter
    const escrowAddress = config.assetTradeInfo.ethereum.escrowAddress;

    // Generate parameters for// sendSignedTransaction
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
      gas: config.assetTradeInfo.ethereum.gas,
    };
    logger.debug(`####exec makeRawTransaction!!`);
    makeRawTransaction(txParam)
      .then((result) => {
        logger.info("firstTransaction txId : " + result.txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "escrow",
          "ledger001",
          result.txId,
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData,
        );

        // Set Parameter
        logger.debug("firstTransaction data : " + JSON.stringify(result.data));
        const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
        const method = { type: "web3Eth", command: "sendSignedTransaction" };

        const args = { args: [result.data["serializedTx"]] };
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
    assetID: string,
    fabricAccountTo: string,
    tradeInfo: TradeInfo,
  ): void {
    logger.debug("called secondTransaction");

    // Start monitoring
    const fabricApiClient = getFabricApiClient();
    const watchObservable = fabricApiClient.watchBlocksDelegatedSignV1({
      channelName: config.assetTradeInfo.fabric.channelName,
      type: WatchBlocksListenerTypeV1.CactusTransactions,
      signerCertificate: getSignerIdentity().credentials.certificate,
      signerMspID: getSignerIdentity().mspId,
      uniqueTransactionData: createSigningToken("watchBlock"),
    });
    const watchSub = watchObservable.subscribe({
      next: (event: WatchBlocksResponseV1) => {
        if (!("cactusTransactionsEvents" in event)) {
          logger.error("Wrong input block format!", event);
          return;
        }

        for (const ev of event.cactusTransactionsEvents) {
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

    transferOwnership(assetID, fabricAccountTo).then((result) => {
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
    });
  }

  thirdTransaction(
    ethereumAccountTo: string,
    tradingValue: string,
    tradeInfo: TradeInfo,
  ): void {
    logger.debug("called thirdTransaction");

    // Get Verifier Instance
    logger.debug(
      `##thirdTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
    const useValidator = JSON.parse(
      routesTransactionManagement.getValidatorToUse(tradeInfo.businessLogicID),
    );
    const verifierEthereum = routesVerifierFactory.getVerifier(
      useValidator["validatorID"][0],
    );
    logger.debug("getVerifierEthereum");

    // TODO: Get address of escrow and set parameter
    const escrowAddress = config.assetTradeInfo.ethereum.escrowAddress;
    // TODO: get escrow secret key
    const escrowAddressPkey = config.assetTradeInfo.ethereum.escrowAddressPkey;

    // Generate parameters for sendSignedTransaction
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
      gas: config.assetTradeInfo.ethereum.gas,
    };
    makeRawTransaction(txParam)
      .then((result) => {
        logger.info("thirdTransaction txId : " + result.txId);

        // Register transaction data in DB
        const transactionData: TransactionData = new TransactionData(
          "settlement",
          "ledger003",
          result.txId,
        );
        this.transactionInfoManagement.setTransactionData(
          tradeInfo,
          transactionData,
        );

        // Set LedgerOperation
        logger.debug("thirdTransaction data : " + JSON.stringify(result.data));

        // Run Verifier (Ethereum)
        // verifierEthereum.requestLedgerOperation(ledgerOperation);

        // TODO: Neo!!
        // Set Parameter
        const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
        const method = { type: "web3Eth", command: "sendSignedTransaction" };
        const args = { args: [result.data["serializedTx"]] };

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

  completedTransaction(tradeInfo: TradeInfo): void {
    logger.debug("called completedTransaction");

    logger.debug(
      `##completedTransaction(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );
  }

  finish(): void {
    logger.debug("called finish");
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    logger.debug(`##in BLP:onEvent()`);
    logger.debug(`##onEvent(): ${json2str(ledgerEvent)}`);

    switch (ledgerEvent.verifierId) {
      case config.assetTradeInfo.ethereum.validatorID:
        this.onEvenEtherem(ledgerEvent.data, targetIndex);
        break;
      default:
        logger.error(
          `##onEvent(), invalid verifierId: ${ledgerEvent.verifierId}`,
        );
        return;
    }
  }

  onEvenEtherem(event: EthEvent, targetIndex: number): void {
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
          `##onEvenEtherem(): error event, status: ${status}, txId: ${txId}`,
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
    event: EthEvent,
    targetIndex: number,
  ): EthData | undefined {
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

  executeNextTransaction(
    txInfo: WatchBlocksCactusTransactionsEventV1 | EthData,
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

  getTxIDFromEvent(
    ledgerEvent: LedgerEvent,
    targetIndex: number,
  ): string | null {
    logger.debug(`##in getTxIDFromEvent`);
    logger.debug(`##event: ${json2str(ledgerEvent)}`);

    if (ledgerEvent.verifierId !== config.assetTradeInfo.ethereum.validatorID) {
      logger.error(
        `##getTxIDFromEvent(): invalid verifierId: ${ledgerEvent.verifierId}`,
      );
    }

    logger.debug(`##in getTxIDFromEventEtherem()`);
    const tx = this.getTransactionFromEthereumEvent(
      ledgerEvent.data,
      targetIndex,
    );
    if (tx == null) {
      logger.warn(`#getTxIDFromEventEtherem(): skip(not found tx)`);
      return null;
    }

    try {
      const txId = tx["hash"];

      if (typeof txId !== "string") {
        logger.warn(
          `#getTxIDFromEventEtherem(): skip(invalid block, not found txId.), event: ${json2str(
            ledgerEvent.data,
          )}`,
        );
        return null;
      }

      logger.debug(`###getTxIDFromEventEtherem(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
        `##getTxIDFromEventEtherem(): err: ${err}, event: ${json2str(
          ledgerEvent.data,
        )}`,
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
