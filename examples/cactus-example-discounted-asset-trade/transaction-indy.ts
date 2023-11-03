/*
 * TODO - Replace these methods with their counterparts in Indy connector (when it's ready).
 * For now we import utility functions from @hyperledger/cactus-example-discounted-asset-trade-client for simplicity.
 */

import { getLogger } from "log4js";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import {
  acceptInvitation,
  checkCredentialProof,
  waitForConnectionReady,
} from "@hyperledger/cactus-example-discounted-asset-trade-client";
import { getIndyAgent } from "./indy-agent";

const config: any = ConfigUtil.getConfig();

const moduleName = "transaction-indy";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

/**
 * Connect remote client indy agent using it's invitation URL.
 * Wait until connection is established and ready to use.
 *
 * @param invitationUrl anoncreds invitation URL.
 * @returns connection ID of newly created connection
 */
export async function connectToClientAgent(
  invitationUrl: string,
): Promise<string> {
  logger.info("Accepting invitation from client agent...");

  const blpAgent = await getIndyAgent();
  const outOfBandRecord = await acceptInvitation(blpAgent, invitationUrl);
  await waitForConnectionReady(blpAgent, outOfBandRecord.id);

  logger.debug(
    "connectToClientAgent() - outOfBandRecord ID:",
    outOfBandRecord.id,
  );
  const [connection] = await blpAgent.connections.findAllByOutOfBandId(
    outOfBandRecord.id,
  );

  if (!connection) {
    throw Error(
      "Could not establish a connection to remote client indy agent!",
    );
  }
  logger.debug("connectToClientAgent() - connection ID:", connection.id);

  return connection.id;
}

/**
 * Request and verify employment proof from client agent connected with specified ID.
 *
 * @param indyAgentConId client agent connection ID.
 * @param credentialDefinitionId employment credential definition ID.
 * @returns true if agent is an employee, false otherwise
 */
export async function isEmploymentCredentialProofValid(
  indyAgentConId: string,
  credentialDefinitionId: string,
) {
  const blpAgent = await getIndyAgent();
  const proof = await checkCredentialProof(
    blpAgent,
    credentialDefinitionId,
    indyAgentConId,
  );
  logger.debug("Received employment proof response:", proof);

  return proof.state === "done";
}
