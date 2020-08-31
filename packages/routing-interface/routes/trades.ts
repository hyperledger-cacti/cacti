/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * trades.ts
 */

import { Router, NextFunction, Request, Response } from 'express';
import { TransactionManagement } from '../TransactionManagement';
import { RIFError } from '../RIFError';

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'trades';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
export const transactionManagement: TransactionManagement = new TransactionManagement();

// Request Execution of Trade
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tradeID: string = transactionManagement.startBusinessLogic(req);

    const resultString: string = '{"tradeID":"' + tradeID + '"}'
    res.status(201).location(config.applicationHostInfo.hostName + "/api/v1/trades/" + tradeID).json(resultString);

    //    res.send("Not Implemented (Request Execution of Trade)\n");
  } catch (err) {
    if (err instanceof RIFError) {
      res.status(err.statusCode);
      res.send(err.message);
      return;
    }

    next(err);
  }
});

// Show Current Status of Trade
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {


    const resultString: string = transactionManagement.getCartradeOperationStatus(req.params.id);

    res.status(200).json(resultString);

    //    res.send("Not Implemented (Show Current Status of Trade" + ", id=" + req.params.id + ")\n" + resultString + "\n");
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
