/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * trades.ts
 */

import { Router, NextFunction, Request, Response } from 'express';
import { RequestInfo } from '../RequestInfo';
import { TransactionManagement } from '../TransactionManagement';
import { VerifierBase } from '../../ledger-plugin/VerifierBase';
import { LedgerOperation } from '../../business-logic-plugin/LedgerOperation';
import { ApiInfo } from '../../ledger-plugin/LedgerPlugin';
import { RIFError, BadRequestError, InternalServerError } from '../RIFError';

import config = require('config');

const router: Router = Router();
const requestInfo: RequestInfo = new RequestInfo();
export const transactionManagement: TransactionManagement = new TransactionManagement();

// Request Execution of Trade
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    requestInfo.businessLogicID = req.body.businessLogicID;
    requestInfo.tradeInfo.ethereumAccountFrom = req.body.tradeParams[0];
    requestInfo.tradeInfo.ethereumAccountTo = req.body.tradeParams[1];
    requestInfo.tradeInfo.fabricAccountFrom = req.body.tradeParams[2];
    requestInfo.tradeInfo.fabricAccountTo = req.body.tradeParams[3];
    requestInfo.tradeInfo.tradingValue = req.body.tradeParams[4];
    requestInfo.tradeInfo.carID = req.body.tradeParams[5];
    requestInfo.authInfo.company = req.body.authParams[0];
    const tradeID: string = transactionManagement.startBusinessLogic(requestInfo);

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
