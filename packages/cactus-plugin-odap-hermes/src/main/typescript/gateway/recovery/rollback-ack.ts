import { RollbackAckV1Message } from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginOdapGateway } from "../plugin-odap-gateway";
// import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "rollback-ack-helper",
});

export async function sendRollbackAckMessage(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | RollbackAckV1Message> {
  const fnTag = `${odap.className}#sendRollbackAckMessage()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.rollbackProofs == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.rollbackActionsPerformed == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const rollbackAckMessage: RollbackAckV1Message = {
    sessionID: sessionID,
    success: true,
    signature: "",
  };

  const signature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(rollbackAckMessage)),
  );

  rollbackAckMessage.signature = signature;

  log.info(`${fnTag}, sending Rollback Ack message...`);

  if (!remote) {
    return rollbackAckMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      odap.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).rollbackAckV1Message(rollbackAckMessage),
    "RollbackAck",
  );
}

export async function checkValidRollbackAckMessage(
  response: RollbackAckV1Message,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidRollbackAckMessage`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const pubKey = odap.isClientGateway(response.sessionID)
    ? sessionData.recipientGatewayPubkey
    : sessionData.sourceGatewayPubkey;

  if (pubKey == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  // if (response.messageType != OdapMessageType.CommitFinalResponse) {
  //   throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
  // }

  if (!odap.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RollbackAckMessage message signature verification failed`,
    );
  }

  log.info(`RollbackAckMessage passed all checks.`);
}
