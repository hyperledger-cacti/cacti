import { RecoverUpdateAckV1Message } from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginOdapGateway } from "../plugin-odap-gateway";
// import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "recover-update-ack-helper",
});

export async function sendRecoverUpdateAckMessage(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | RecoverUpdateAckV1Message> {
  const fnTag = `${odap.className}#sendRecoverUpdateAckMessage()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const recoverUpdateMessage: RecoverUpdateAckV1Message = {
    sessionID: sessionID,
    success: true,
    changedEntriesHash: [],
    signature: "",
  };

  const signature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(recoverUpdateMessage)),
  );

  recoverUpdateMessage.signature = signature;

  log.info(`${fnTag}, sending RecoverUpdateAck message...`);

  if (!remote) {
    return recoverUpdateMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      odap.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).recoverUpdateAckV1Message(recoverUpdateMessage),
    "RecoverUpdateAck",
  );
}

export async function checkValidRecoverUpdateAckMessage(
  response: RecoverUpdateAckV1Message,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidRecoverUpdateAckMessage`;

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

  // check if this is a valid recover update ack message
  // check valid recovered logs

  if (!odap.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RecoverUpdateAckMessage message signature verification failed`,
    );
  }

  // storeSessionData(response, odap);

  log.info(`RecoverUpdateAckMessage passed all checks.`);
}
