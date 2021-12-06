import { Request } from "express";
import { getLogger } from "log4js";
import { RequestInfo } from "./RequestInfo";

import { TradeInfo } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TradeInfo";
import { transactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { verifierFactory } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { BusinessLogicBase } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BusinessLogicBase";
import { Verifier } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/Verifier";

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
    logger.debug("called startTransaction()");

    const requestInfo: RequestInfo = new RequestInfo();
    requestInfo.setBusinessLogicID(businessLogicID);
    requestInfo.setTradeID(tradeID);

    const tradeInfo: TradeInfo = new TradeInfo(
      requestInfo.businessLogicID,
      requestInfo.tradeID,
    );

    this.executeTransaction(tradeInfo);
  }

  executeTransaction(tradeInfo: TradeInfo) {
    logger.debug(
      `##startMonitor(): businessLogicID: ${tradeInfo.businessLogicID}`,
    );

    const validator = JSON.parse(
      transactionManagement.getValidatorToUse(tradeInfo.businessLogicID),
    );
    const ethereumValidator = validator["validatorID"][0];
    const verifier = verifierFactory.getVerifier(
      ethereumValidator,
      moduleName,
      {},
      false,
    );

    this.sendRequest(verifier);
  }

  sendRequest(verifier: Verifier) {
    const contract = {};
    const method = { command: "getBalance", type: "web3Eth" };
    const accountEthereum = "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97";
    const args = { args: [accountEthereum] };

    logger.debug(`##sendRequest(): calling verifier.sendSyncRequest()`);
    verifier
      .sendSyncRequest(contract, method, args)
      .then((response) => {
        logger.debug(
          `got response: \n status code: ${response.status} \n Ethereum balance: ${response.data}`,
        );
        if (response.status == 504 && response.data === undefined) {
          logger.error(`Could not establish connection to ethereum ledger`);
        } else {
          logger.info(`Successfully connected to ethereum ledger`);
        }
        return { status: response.status, data: response.data };
      })
      .catch((err) => {
        logger.error(err);
      });
  }
}
