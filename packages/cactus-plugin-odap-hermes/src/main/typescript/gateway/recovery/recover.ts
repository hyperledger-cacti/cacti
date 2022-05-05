import { RecoverV1Message } from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginOdapGateway } from "../plugin-odap-gateway";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "recover-helper",
});

export async function sendRecoverMessage(
  sessionID: string,
  odap: PluginOdapGateway,
  backup: boolean,
  remote: boolean,
): Promise<void | RecoverV1Message> {
  const fnTag = `${odap.className}#sendRecoverMessage()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.lastLogEntryTimestamp == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const recoverMessage: RecoverV1Message = {
    sessionID: sessionID,
    odapPhase: "sessionData.odapPhase",
    sequenceNumber: sessionData.lastSequenceNumber,
    lastLogEntryTimestamp: sessionData.lastLogEntryTimestamp,
    isBackup: backup,
    newBasePath: "",
    newGatewayPubKey: sessionData.sourceGatewayPubkey,
    signature: "",
  };

  const signature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(recoverMessage)),
  );

  recoverMessage.signature = signature;

  log.info(`${fnTag}, sending Recover message...`);

  if (!remote) {
    return recoverMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      odap.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).recoverV1Message(recoverMessage),
    "Recover",
  );
}

export async function checkValidRecoverMessage(
  response: RecoverV1Message,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidRecoverMessage`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  let pubKey = undefined;

  if (odap.isClientGateway(response.sessionID)) {
    if (
      response.isBackup &&
      sessionData.recipientGatewayPubkey != response.newGatewayPubKey
    ) {
      // this is a backup gateway
      sessionData.recipientGatewayPubkey = response.newGatewayPubKey;

      if (
        !sessionData.recipientGatewayPubkey ||
        !sessionData.allowedSourceBackupGateways?.includes(
          sessionData.recipientGatewayPubkey,
        )
      ) {
        throw new Error(`${fnTag}, backup gateway not allowed`);
      }
    }
    pubKey = sessionData.recipientGatewayPubkey;
  } else {
    if (
      response.isBackup &&
      sessionData.sourceGatewayPubkey != response.newGatewayPubKey
    ) {
      // this is a backup gateway
      sessionData.sourceGatewayPubkey = response.newGatewayPubKey;

      if (
        !sessionData.sourceGatewayPubkey ||
        !sessionData.allowedSourceBackupGateways?.includes(
          sessionData.sourceGatewayPubkey,
        )
      ) {
        throw new Error(`${fnTag}, backup gateway not allowed`);
      }
    }
    pubKey = sessionData.sourceGatewayPubkey;
  }

  if (pubKey == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  // if (response.messageType != OdapMessageType.CommitFinalResponse) {
  //   throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
  // }

  if (response.lastLogEntryTimestamp == undefined) {
    throw new Error(`${fnTag}, last log entry timestamp is not valid`);
  }

  if (!odap.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RecoverMessage message signature verification failed`,
    );
  }

  sessionData.lastLogEntryTimestamp = response.lastLogEntryTimestamp;

  odap.sessions.set(sessionID, sessionData);

  log.info(`RecoverMessage passed all checks.`);
}
