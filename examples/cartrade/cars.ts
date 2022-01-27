/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * cars.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socket-server";
import { RIFError } from "@hyperledger/cactus-cmd-socket-server";
import { CarsManagement } from "./CarsManagement";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "cars";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
const carsManagement: CarsManagement = new CarsManagement();

/* GET query car. */
router.get("/:carID", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug(`start queryCar`);

    carsManagement
      .queryCar(req.params.carID)
      .then((result) => {
        logger.debug("result(queryCar) = " + JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err) => {
        logger.error(err);
      });
  } catch (err) {
    logger.error(`##(queryCar)err name: ${err.constructor.name}`);

    if (err instanceof RIFError) {
      logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
      res.status(err.statusCode);
      res.send(err.message);
      return;
    }

    logger.error(`##err in queryCar: ${err}`);
    next(err);
  }
});

/* GET query all cars. */
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug(`start queryAllCars`);

    carsManagement
      .queryAllCars()
      .then((result) => {
        logger.debug("result(queryAllCars) = " + JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err) => {
        logger.error(err);
      });
  } catch (err) {
    logger.error(`##(queryAllCars)err name: ${err.constructor.name}`);

    if (err instanceof RIFError) {
      logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
      res.status(err.statusCode);
      res.send(err.message);
      return;
    }

    logger.error(`##err in queryAllCars: ${err}`);
    next(err);
  }
});

export default router;
