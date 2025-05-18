/**
 * Endpoints for interacting with this sample app Indy agent.
 */

import { Router, NextFunction, Request, Response } from "express";
import escapeHtml from "escape-html";
import { getLogger } from "log4js";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import { connectToClientAgent } from "./transaction-indy";

const config: any = ConfigUtil.getConfig();
const moduleName = "indy-endpoints";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();

/**
 * POST
 * Connect to the client indy agent.
 * Caller must supply it's invitationUrl and accept the connection.
 */
router.post(
  "/connect",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitationUrl = req.body.invitationUrl as string;
      if (!invitationUrl || typeof invitationUrl !== "string") {
        throw new Error(`Missing invitationUrl in the request body`);
      }

      logger.debug("Connecting to Indy agent with invitation:", invitationUrl);
      const blpConnectionId = await connectToClientAgent(invitationUrl);

      res.status(200).json({
        message: "Invitation accepted",
        blpConnectionId,
      });
    } catch (err) {
      res.status(500).send({
        error: escapeHtml(err),
      });
      next(err);
    }
  },
);

export default router;
