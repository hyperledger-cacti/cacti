/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * test-run-transaction.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { TransactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TransactionManagement";
import { RIFError } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/RIFError";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";

const fs = require("fs");
const path = require("path");
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

export default router;
