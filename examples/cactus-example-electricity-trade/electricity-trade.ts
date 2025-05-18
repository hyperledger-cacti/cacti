/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * electricity-trade.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import {
  TransactionManagement,
  RIFError,
  ConfigUtil,
} from "@hyperledger/cactus-common-example-server";
import escapeHtml from "escape-html";

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
    const tradeID = transactionManagement.startBusinessLogic(req);
    if (!tradeID) {
      throw new RIFError(`Could not run BLP, tradeId = ${tradeID}`);
    }
    const result = { tradeID: tradeID };
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof RIFError) {
      res.status(err.statusCode);
      res.send(escapeHtml(err.message));
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
      const result = transactionManagement.setBusinessLogicConfig(req) as any;

      if (!result) {
        throw new RIFError("Error when running setBusinessLogicConfig");
      }

      let status = 200;

      if (result["action"] === "add") {
        status = 201;
      }
      res.status(status).json(result);
    } catch (err) {
      if (err instanceof RIFError) {
        res.status(err.statusCode);
        res.send(escapeHtml(err.message));
        return;
      }

      next(err);
    }
  },
);

export default router;
