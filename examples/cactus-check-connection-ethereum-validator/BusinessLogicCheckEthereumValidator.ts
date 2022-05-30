import { Request } from "express";
import { getLogger } from "log4js";
import { RequestInfo } from "./RequestInfo";

import { TradeInfo } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TradeInfo";
import { transactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { verifierFactory } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { BusinessLogicBase } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BusinessLogicBase";
import { Verifier } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/Verifier";
import { LedgerEvent } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/LedgerPlugin";
import { json2str } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/DriverCommon";

const fs = require("fs");
const yaml = require("js-yaml");

const config: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/default.yaml", "utf8"),
);

// Setup logger
const moduleName = "BusinessLogicCheckEthereumValidator";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BusinessLogicCheckEthereumValidator extends BusinessLogicBase {
  businessLogicID: string;

  constructor(businessLogicID: string) {
    super();
    this.businessLogicID = businessLogicID;
  }

  startTransaction(req: Request, businessLogicID: string, tradeID: string) {
    logger.debug(` ##startTransaction(): called startTransaction()`);

    const requestInfo: RequestInfo = new RequestInfo();
    requestInfo.setBusinessLogicID(businessLogicID);
    requestInfo.setTradeID(tradeID);

    const tradeInfo: TradeInfo = new TradeInfo(
      requestInfo.businessLogicID,
      requestInfo.tradeID,
    );

    this.startMonitor(tradeInfo);
  }

  startMonitor(tradeInfo: TradeInfo) {
    logger.debug(
      `##startMonitor(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );

    const validator = this.getValidator(tradeInfo);

    if (config.monitorMode === true) {
      logger.debug(`##startMonitor(): Creating validator with Monitor Mode`);
    } else {
      logger.debug(`##startMonitor(): Creating validator without Monitor Mode`)
    }

    const verifier = this.getVerifier(validator);

    this.sendTestRequest(verifier);
  }

  private getValidator(tradeInfo: TradeInfo) {
    logger.debug(`##getValidator(): Getting validator with tradeInfo: ${tradeInfo}`);
    const validator = JSON.parse(
      transactionManagement.getValidatorToUse(tradeInfo.businessLogicID),
    );
    const ethValidator = validator["validatorID"][0];
    return ethValidator;
  }

  private getVerifier(validator: any) {
    logger.debug(`getVerifier(): Getting Verifier with validator: ${validator}`);

    const verifier = verifierFactory.getVerifier(
      validator,
      moduleName,
      {},
      config.monitorMode
    );

    return verifier;
  }

  stopMonitor(tradeInfo: TradeInfo) {
    logger.debug(`##calling stopMonitor()`);

    // get validator
    const validator = this.getValidator(tradeInfo);
    // get verifier
    const verifier = this.getVerifier(validator);
    // stop monitoring
    verifier.stopMonitor(moduleName);
  }

  sendTestRequest(verifier: Verifier) {
    const contract = {};
    const method = { command: "getBalance", type: "web3Eth" };
    const accountEthereum = "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97";
    const args = { args: [accountEthereum] };

    logger.debug(`##sendTestRequest(): calling verifier.sendSyncRequest()`);
    verifier
      .sendSyncRequest(contract, method, args)
      .then((response) => {
        if (response.status == 504 && response.data === undefined) {
          logger.error(`##sendTestRequest(): Could not establish connection to ethereum ledger`);
        } else {
          logger.info(`##sendTestRequest(): Successfully connected to ethereum ledger`);
        }
        return { status: response.status, data: response.data };
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    logger.debug(`##onEvent(): ${json2str(ledgerEvent)}`);

    const tx = this.getTransactionFromEvent(ledgerEvent, targetIndex);
    if (tx == null) {
      logger.error(`##onEvent(): invalid event: ${json2str(ledgerEvent)}`);
      return;
    }

    try {
      const txId = tx["hash"];
      const status = ledgerEvent.data["status"];
      logger.debug(`##onEvent(): txId = ${txId}`);
      logger.debug(`##onEvent(): status = ${status}`);

      if (status !== 200) {
        logger.error(
          `##onEvent(): error event, status: ${status}, txId: ${txId}`
        );
        return;
      }
    } catch (err) {
      logger.error(`##onEvent(): err: ${err}, event: ${json2str(ledgerEvent)}`);
    }
  }

  getTxIDFromEvent(event: LedgerEvent, targetIndex: number): string | null {
    const tx = this.getTransactionFromEvent(event, targetIndex);
    console.log(tx)
    if (tx == null) {
      logger.warn(`##getTxIDFromEvent(): skip(not found tx)`);
      return null;
    }

    try {
      const txId = tx["hash"];
      if (typeof txId !== "string") {
        logger.warn(
          `##getTxIDFromEvent(): skip(invalid block, not found txId.), event: ${json2str(
            event
          )}`
        );
        return null;
      }

      logger.debug(`##getTxIDFromEvent(): txId: ${txId}`);
      return txId;
    } catch (err) {
      logger.error(
        `##getTxIDFromEvent(): err: ${err}, event: ${json2str(event)}`
      );
      return null;
    }
  }

  getEventDataNum(ledgerEvent: LedgerEvent): number {
    logger.debug(
      `##getEventDataNum(), ledgerEvent.verifierId: ${ledgerEvent.verifierId}`
    );
    const event = ledgerEvent.data;
    let retEventNum = 0;

    try {
      const validatorID = config.checkEthereumValidator.connector.validatorID;

      retEventNum = event["blockData"]["transactions"].length;
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

  getTransactionFromEvent(
    event: LedgerEvent,
    targetIndex: number
  ): object | null {
    try {
      const retTransaction = event.data["blockData"]["transactions"][targetIndex];
      logger.debug(
        `##getTransactionFromEvent(), retTransaction: ${retTransaction}`
      );
      console.log(retTransaction)
      return retTransaction;
    } catch (err) {
      logger.error(
        `##getTransactionFromEvent(): invalid even, err:${err}, event:${event}`
      );
    }
  }
}

