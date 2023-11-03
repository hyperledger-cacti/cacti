/**
 * Defines Indy Aries JS Agent that will be used to verify proofs.
 * TODO - Initialize Indy connector instead of agent here (once indy connector is ready)
 */

import { getLogger } from "log4js";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import {
  setupAgent,
  AnoncredAgent,
} from "@hyperledger/cactus-example-discounted-asset-trade-client";

const config: any = ConfigUtil.getConfig();
const moduleName = "indy-agent";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const BLP_AGENT_NAME = "cactiDiscountedAssetTradeAgent";
const BLP_AGENT_PORT = 5035;

// Single BLP indy agent instance
let blpAgent: AnoncredAgent | undefined = undefined;

/**
 * Create indy agent for this BLP app
 */
export async function initIndyAgent(): Promise<void> {
  if (!blpAgent) {
    blpAgent = await setupAgent(BLP_AGENT_NAME, BLP_AGENT_PORT);
    logger.info("initIndyAgent() done.");
  } else {
    logger.info("initIndyAgent() Indy agent already initialized");
  }
}

/**
 * Get instance of indy agent
 */
export async function getIndyAgent(): Promise<AnoncredAgent> {
  if (!blpAgent) {
    await initIndyAgent();
  }

  if (blpAgent) {
    return blpAgent;
  } else {
    throw new Error("Could not initialize new indy agent!");
  }
}
