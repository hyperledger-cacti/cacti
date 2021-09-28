/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * asset.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { RIFUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/RIFUtil";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";
import {
  RIFError,
  BadRequestError,
  InternalServerError,
} from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/RIFError";
import { AssetManagement } from "./AssetManagement";
import axios from "axios";
import { RuntimeError } from "run-time-error";

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
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      logger.error(`##err name: ${err.constructor.name}`);
      if (err instanceof RIFError) {
        logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
        res.status(err.statusCode);
        res.send(err.message);
        return;
      }
      logger.error(`##err in asset: ${err}`);
      next(err);
    } else if (err instanceof Error) {
      throw new RuntimeError("unexpected exception", err);
    } else {
      throw new RuntimeError(
        "unexpected exception with incorrect type",
        JSON.stringify(err),
      );
    }
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
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      logger.error(`##err name: ${err.constructor.name}`);
      if (err instanceof RIFError) {
        logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
        res.status(err.statusCode);
        res.send(err.message);
        return;
      }
      logger.error(`##err in asset: ${err}`);
      next(err);
    } else if (err instanceof Error) {
      throw new RuntimeError("unexpected exception", err);
    } else {
      throw new RuntimeError(
        "unexpected exception with incorrect type",
        JSON.stringify(err),
      );
    }
  }
});

export default router;
