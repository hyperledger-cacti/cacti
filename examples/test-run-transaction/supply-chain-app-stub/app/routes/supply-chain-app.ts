/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * supply-chain-app.ts
 */

import { Router, NextFunction, Request, Response } from "express";

const router: Router = Router();

/* GET home page. */
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    //res.render('index', { title: 'Express' });
    res.status(200).send("supply-chain-app:GET!!\n");
  } catch (err) {
    next(err);
  }
});

/* POST home page. */
router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    //res.render('index', { title: 'Express' });
    console.debug(`req1: ${JSON.stringify(req.body)}`);
    console.debug(`req2: ${req.body}`);
    console.debug(`keychainId: ${req.body.keychainId}`);
    console.debug(`keychainRef: ${req.body.keychainRef}`);
    console.debug(`channelName: ${req.body.channelName}`);
    console.debug(`invocationType: ${req.body.invocationType}`);
    console.debug(`functionName: ${req.body.functionName}`);
    console.debug(`functionArgs: ${req.body.functionArgs}`);
    sleep(5, function () {
      console.debug(`##send response`);
      res.status(200).send(JSON.stringify({ "supply-chain-app": "POST..." }));
    });
  } catch (err) {
    next(err);
  }
});

function sleep(waitSec: number, callbackFunc: any) {
  let spanedSec = 0;
  var id = setInterval(function () {
    spanedSec++;
    if (spanedSec >= waitSec) {
      clearInterval(id);
      if (callbackFunc) callbackFunc();
    }
  }, 1000);
}

export default router;
