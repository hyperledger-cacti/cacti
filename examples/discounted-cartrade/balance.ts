/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * balance.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { RIFUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/RIFUtil";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";
import {
  RIFError,
  BadRequestError,
  InternalServerError,
} from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/RIFError";
import { BalanceManagement } from "./BalanceManagement";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "balance";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
const balanceManagement: BalanceManagement = new BalanceManagement();

/* GET balance. */
router.get("/:account", (req: Request, res: Response, next: NextFunction) => {
  try {
    balanceManagement
      .getBalance(req.params.account)
      .then((result) => {
        logger.debug(`#####[sample/balance.ts]`);
        logger.debug("result(getBalance) = " + JSON.stringify(result));
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
});

export default router;
