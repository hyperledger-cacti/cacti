/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * fabric-asset.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import { RIFError } from "@hyperledger/cactus-cmd-socketio-server";
import { FabricAssetManagement } from "./fabric-asset-management";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "fabric-asset";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
const fabricAssetManagement: FabricAssetManagement = new FabricAssetManagement();

/* GET query asset. */
router.get("/:assetID", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug(`start queryAsset`);

    fabricAssetManagement
      .queryAsset(req.params.assetID)
      .then((result) => {
        logger.debug("result(queryAsset) = " + JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err) => {
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

    fabricAssetManagement
      .queryAllAssets()
      .then((result) => {
        logger.debug("result(queryAllAssets) = " + JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err) => {
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
