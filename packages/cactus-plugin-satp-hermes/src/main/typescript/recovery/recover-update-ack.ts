import { RecoverUpdateAckV1Message } from "../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginSATPGateway } from "../plugin-satp-gateway";
// import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "recover-update-ack-helper",
});

export async function sendRecoverUpdateAckMessage(
  sessionID: string,
  gateway: PluginSATPGateway,
  remote: boolean,
): Promise<void | RecoverUpdateAckV1Message> {
  const fnTag = `${gateway.className}#sendRecoverUpdateAckMessage()`;

  const sessionData = gateway.sessions.get(sessionID);

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

  const signature = PluginSATPGateway.bufArray2HexStr(
    gateway.sign(JSON.stringify(recoverUpdateMessage)),
  );

  recoverUpdateMessage.signature = signature;

  log.info(`${fnTag}, sending RecoverUpdateAck message...`);

  if (!remote) {
    return recoverUpdateMessage;
  }

  await gateway.makeRequest(
    sessionID,
    PluginSATPGateway.getSatpAPI(
      gateway.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).recoverUpdateAckV1Message(recoverUpdateMessage),
    "RecoverUpdateAck",
  );
}

export async function checkValidRecoverUpdateAckMessage(
  response: RecoverUpdateAckV1Message,
  gateway: PluginSATPGateway,
): Promise<void> {
  const fnTag = `${gateway.className}#checkValidRecoverUpdateAckMessage`;

  const sessionID = response.sessionID;
  const sessionData = gateway.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const pubKey = gateway.isClientGateway(response.sessionID)
    ? sessionData.recipientGatewayPubkey
    : sessionData.sourceGatewayPubkey;

  if (pubKey == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  // if (response.messageType != SatpMessageType.CommitFinalResponse) {
  //   throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
  // }

  // check if this is a valid recover update ack message
  // check valid recovered logs

  if (!gateway.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RecoverUpdateAckMessage message signature verification failed`,
    );
  }

  // storeSessionData(response, satp);

  log.info(`RecoverUpdateAckMessage passed all checks.`);
}
