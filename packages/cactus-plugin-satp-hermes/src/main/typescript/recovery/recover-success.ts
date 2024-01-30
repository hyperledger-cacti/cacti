import { RecoverSuccessV1Message } from "../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginSATPGateway } from "../plugin-satp-gateway";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "recover-success-helper",
});

export async function sendRecoverSuccessMessage(
  sessionID: string,
  gateway: PluginSATPGateway,
  remote: boolean,
): Promise<void | RecoverSuccessV1Message> {
  const fnTag = `${gateway.className}#sendRecoverSuccessMessage()`;

  const sessionData = gateway.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.recipientBasePath == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const recoverSuccessMessage: RecoverSuccessV1Message = {
    sessionID: sessionID,
    success: true,
    signature: "",
  };

  const signature = PluginSATPGateway.bufArray2HexStr(
    gateway.sign(JSON.stringify(recoverSuccessMessage)),
  );

  recoverSuccessMessage.signature = signature;

  log.info(`${fnTag}, sending RecoverSuccess message...`);

  if (!remote) {
    return recoverSuccessMessage;
  }

  await gateway.makeRequest(
    sessionID,
    PluginSATPGateway.getSatpAPI(
      gateway.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).recoverV1Success(recoverSuccessMessage),
    "RecoverSuccess",
  );
}

export async function checkValidRecoverSuccessMessage(
  response: RecoverSuccessV1Message,
  gateway: PluginSATPGateway,
): Promise<void> {
  const fnTag = `${gateway.className}#checkValidRecoverSuccessMessage`;

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

  if (!response.success) {
    throw new Error(`${fnTag}, RecoverSuccess message is invalid`);
  }

  if (!gateway.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RecoverUpdateAckMessage message signature verification failed`,
    );
  }

  // storeSessionData(response, satp);

  log.info(`RecoverSuccessMessage passed all checks.`);
}
