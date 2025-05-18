/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * trades.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { TransactionManagement } from "@hyperledger/cactus-common-example-server";
import { RIFError } from "@hyperledger/cactus-common-example-server";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";

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
    res
      .status(201)
      .location(
        config.applicationHostInfo.hostName + "/api/v1/trades/" + tradeID,
      )
      .json(result);
  } catch (err) {
    if (err instanceof RIFError) {
      res.status(err.statusCode);
      res.send(escapeHtml(err.message));
      return;
    }

    next(err);
  }
});

// Show Current Status of Trade
router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = transactionManagement.getOperationStatus(req.params.id);
    if (result) {
      res.status(200).json(result);
    } else {
      throw new RIFError("Could not get operation status");
    }
  } catch (err) {
    if (err instanceof RIFError) {
      res.status(err.statusCode);
      res.send(escapeHtml(err.message));
      return;
    }

    next(err);
  }
});

export default router;
