/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * fabric-asset.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import { RIFError } from "@hyperledger/cactus-common-example-server";
import { queryAsset, queryAllAssets } from "./transaction-fabric";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "fabric-asset";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();

/* GET query asset. */
router.get("/:assetID", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug(`start queryAsset`);

    queryAsset(req.params.assetID)
      .then((result: unknown) => {
        logger.debug("result(queryAsset) = " + JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err: unknown) => {
        logger.error(err);
      });
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`##(queryAsset)err name: ${err.constructor.name}`);
    }

    if (err instanceof RIFError) {
      logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
      res.status(err.statusCode);
      res.send(err.message);
      return;
    }

    logger.error(`##err in queryAsset: ${err}`);
    next(err);
  }
});

/* GET query all assets. */
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug(`start queryAllAssets`);

    queryAllAssets()
      .then((result: unknown) => {
        logger.debug("result(queryAllAssets) = " + JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err: unknown) => {
        logger.error(err);
      });
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`##(queryAllAssets)err name: ${err.constructor.name}`);
    }

    if (err instanceof RIFError) {
      logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
      res.status(err.statusCode);
      res.send(err.message);
      return;
    }

    logger.error(`##err in queryAllAssets: ${err}`);
    next(err);
  }
});

export default router;
