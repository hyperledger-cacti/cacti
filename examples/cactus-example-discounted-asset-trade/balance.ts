/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * balance.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import { RIFError } from "@hyperledger/cactus-common-example-server";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
import { getAccountBalance } from "./transaction-ethereum";
const moduleName = "balance";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();

/* GET balance. */
router.get("/:account", (req: Request, res: Response, next: NextFunction) => {
  try {
    getAccountBalance(req.params.account)
      .then((result) => {
        logger.debug(`#####[sample/balance.ts]`);
        logger.debug("result(getBalance) = " + result);
        res.status(200).json(result);
      })
      .catch((err) => {
        logger.error(err);
      });
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`##err name: ${err.constructor.name}`);
    }

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
