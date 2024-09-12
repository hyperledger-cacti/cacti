/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * index.ts
 */

import { Router, NextFunction, Request, Response } from "express";
import { TransactionManagement } from "../TransactionManagement";
import { VerifierFactory } from "../../verifier/VerifierFactory";
import escapeHtml from "escape-html";

const router: Router = Router();
export const transactionManagement: TransactionManagement =
  new TransactionManagement();
export const verifierFactory: VerifierFactory = new VerifierFactory(
  transactionManagement,
);

/* GET home page. */
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    res.render("index", { title: "Express" });
  } catch (err) {
    next(err);
  }
});

// Show Business Logics
router.get(
  "/api/v1/bl/logics/",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.render("Not Implemented (Show Business Logics)\n");
    } catch (err) {
      next(err);
    }
  },
);

// Show Specification of Business Logic
router.get(
  "/api/v1/bl/logics/:id",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.render(
        "Not Implemented (Show Specification of Business Logic" +
          ", id=" +
          escapeHtml(req.params.id) +
          ")\n",
      );
    } catch (err) {
      next(err);
    }
  },
);

// Register a Wallet
router.post(
  "/api/v1/bl/wallets/",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.render("Not Implemented (Register a Wallet)\n");
    } catch (err) {
      next(err);
    }
  },
);

// Show Wallet List
router.get(
  "/api/v1/bl/wallets/",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.render("Not Implemented (Show Wallet List)\n");
    } catch (err) {
      next(err);
    }
  },
);

// Update Existing Wallets
router.put(
  "/api/v1/bl/wallets/:id",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.render(
        "Not Implemented (Update Existing Wallets" +
          ", id=" +
          escapeHtml(req.params.id) +
          ")\n",
      );
    } catch (err) {
      next(err);
    }
  },
);

// Delete a Wallet
router.delete(
  "/api/v1/bl/wallets/:id",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const walletIdEsc = escapeHtml(req.params.id);
      const out = "Not Implemented (Delete a Wallet, id=" + walletIdEsc + ")\n";
      res.status(501).send(out);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
