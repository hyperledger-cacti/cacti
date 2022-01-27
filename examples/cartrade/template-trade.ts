/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * template-trade.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socket-server";
import { RIFError } from "@hyperledger/cactus-cmd-socket-server";
import { TemplateTradeManagement } from "./TemplateTradeManagement";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "template-trade";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
const templateTradeManagement: TemplateTradeManagement =
  new TemplateTradeManagement();

/* POST template-trade. */
// router.post('/:functionName', (req: Request, res: Response, next: NextFunction) => {
//   try {
//
//     logger.info(`#####[${moduleName}], functionName: ${req.param.functionName}`);
//
//     templateTradeManagement.execTemplateTrade(req.param.functionName, req).then(result => {
//         logger.debug(`#####[moduleName]`);
//         logger.debug("result(execTemplateTrade) = " + JSON.stringify(result));
//         res.status(200).json(result);
//     }).catch((err) => {
//         logger.error(err);
//     });
//
//   } catch (err) {
//     logger.error(`##err name: ${err.constructor.name}`);
//
//     if (err instanceof RIFError) {
//         logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
//         res.status(err.statusCode);
//         res.send(err.message);
//         return;
//     }
//
//     logger.error(`##err in balance: ${err}`);
//     next(err);
//   }
// });

router.post(
  "/execSyncFunction",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const functionName = "execSyncFunction";
      logger.info(`#####[${moduleName}], functionName: ${functionName}`);

      templateTradeManagement
        .execTemplateTrade(functionName, req)
        .then((result) => {
          logger.debug(`#####[moduleName]`);
          logger.debug("result(execTemplateTrade) = " + JSON.stringify(result));
          res.status(200).json(result);
        })
        .catch((err) => {
          logger.error(err);
        });
    } catch (err) {
      logger.error(`##err name: ${err.constructor.name}`);

      if (err instanceof RIFError) {
        logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
        res.status(err.statusCode);
        res.send(err.message);
        return;
      }

      logger.error(`##err in balance: ${err}`);
      next(err);
    }
  }
);

router.post(
  "/sendSignedTransaction",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const functionName = "sendSignedTransaction";
      logger.info(`#####[${moduleName}], functionName: ${functionName}`);

      const tradeID: string = templateTradeManagement.execTemplateTradeAsync(
        functionName,
        req
      );
      const result = { tradeID: tradeID };
      //res.status(201).location(config.applicationHostInfo.hostName + "/api/v1/trades/" + tradeID).json(result);
      res.status(201).json(result);
    } catch (err) {
      logger.error(`##err name: ${err.constructor.name}`);

      if (err instanceof RIFError) {
        logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
        res.status(err.statusCode);
        res.send(err.message);
        return;
      }

      logger.error(`##err in balance: ${err}`);
      next(err);
    }
  }
);

export default router;
