import { getLogger } from "log4js";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import { getAriesApiClient, getBlpAgentName } from "./aries-connector";

const config: any = ConfigUtil.getConfig();
const moduleName = "transaction-indy";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

/**
 * Connect remote client aries agent using it's invitation URL.
 * Wait until connection is established and ready to use.
 *
 * @param invitationUrl aries invitation URL.
 * @returns connection ID of newly created connection
 */
export async function connectToClientAgent(
  invitationUrl: string,
): Promise<string> {
  logger.info("Accepting invitation from client agent...");
  const ariesApiClient = getAriesApiClient();

  const acceptResponse = await ariesApiClient.acceptInvitationV1({
    agentName: getBlpAgentName(),
    invitationUrl: invitationUrl,
  });
  const { outOfBandId } = acceptResponse.data;
  await ariesApiClient.waitForConnectionReadyV1(getBlpAgentName(), outOfBandId);
  logger.debug("connectToClientAgent() - outOfBandId:", outOfBandId);

  // Get connection ID
  const connectionsResponse = await ariesApiClient.getConnectionsV1({
    agentName: getBlpAgentName(),
    filter: {
      outOfBandId,
    },
  });
  const connectionRecord = connectionsResponse.data.pop();
  if (!connectionRecord) {
    throw new Error(
      "Could not establish a connection to remote client indy agent!",
    );
  }
  logger.debug("connectToClientAgent() - connection ID:", connectionRecord.id);

  return connectionRecord.id;
}

/**
 * Request and verify employment proof from client agent with specified connection ID.
 *
 * @param indyAgentConId client agent connection ID.
 * @param credentialDefinitionId employment credential definition ID.
 * @returns true if agent is an employee, false otherwise
 */
export async function isEmploymentCredentialProofValid(
  indyAgentConId: string,
  credentialDefinitionId: string,
): Promise<boolean> {
  const ariesApiClient = getAriesApiClient();

  try {
    const proof = await ariesApiClient.requestProofAndWaitV1(
      getBlpAgentName(),
      indyAgentConId,
      [
        {
          name: "employee_status",
          isValueEqual: "Permanent",
          isCredentialDefinitionIdEqual: credentialDefinitionId,
        },
      ],
    );
    logger.debug("Received employment proof response:", proof);
    return proof.isVerified ?? false;
  } catch (error) {
    logger.warn("Error when requesting employment proof:", error);
  }

  return false;
}
