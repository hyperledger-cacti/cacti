/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * test-run-transaction.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { TransactionManagement } from "../cactus-common-example-server/src/main/typescript/routing-interface/TransactionManagement";
import { RIFError } from "../cactus-common-example-server/src/main/typescript/routing-interface/RIFError";
import { ConfigUtil } from "../cactus-common-example-server/src/main/typescript/routing-interface/util/ConfigUtil";

import escapeHtml from "escape-html";
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "test-run-transaction";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
export const transactionManagement: TransactionManagement =
  new TransactionManagement();

// Request Execution of Test-Run-Transaction
router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("test-run-transaction()");
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

export default router;
