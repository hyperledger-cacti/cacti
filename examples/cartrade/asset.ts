/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * asset.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socket-server";
import { RIFError } from "@hyperledger/cactus-cmd-socket-server";
import { AssetManagement } from "./AssetManagement";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "asset";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
const assetManagement: AssetManagement = new AssetManagement();

// POST : add asset.
router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    assetManagement
      .addAsset(req.body.amount)
      .then((result) => {
        logger.debug("result(addAsset) = " + JSON.stringify(result));
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

    logger.error(`##err in asset: ${err}`);
    next(err);
  }
});

// GET : get asset.
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    assetManagement
      .getAsset()
      .then((result) => {
        logger.debug("result(getAsset) = " + JSON.stringify(result));
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

    logger.error(`##err in asset: ${err}`);
    next(err);
  }
});

export default router;
