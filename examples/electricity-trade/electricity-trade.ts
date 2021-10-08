/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * electricity-trade.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { TransactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TransactionManagement";
import { RIFError } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/RIFError";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "trades";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
export const transactionManagement: TransactionManagement =
  new TransactionManagement();

// Request Execution of Trade
router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tradeID: string = transactionManagement.startBusinessLogic(req);

    const result = { tradeID: tradeID };
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof RIFError) {
      res.status(err.statusCode);
      res.send(err.message);
      return;
    }

    next(err);
  }
});

// Request Execution of Trade
router.post(
  "/meter/register/",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result: object = transactionManagement.setBusinessLogicConfig(req);
      let status = 200;
      if (result["action"] === "add") {
        status = 201;
      }
      res.status(status).json(result);
    } catch (err) {
      if (err instanceof RIFError) {
        res.status(err.statusCode);
        res.send(err.message);
        return;
      }

      next(err);
    }
  }
);

export default router;
