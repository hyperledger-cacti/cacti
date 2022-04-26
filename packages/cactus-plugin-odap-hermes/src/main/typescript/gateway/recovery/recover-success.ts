import { RecoverSuccessV1Message } from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginOdapGateway } from "../plugin-odap-gateway";
// import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "recover-success-helper",
});

export async function sendRecoverSuccessMessage(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | RecoverSuccessV1Message> {
  const fnTag = `${odap.className}#sendRecoverSuccessMessage()`;

  const sessionData = odap.sessions.get(sessionID);

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

  const signature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(recoverSuccessMessage)),
  );

  recoverSuccessMessage.signature = signature;

  log.info(`${fnTag}, sending RecoverSuccess message...`);

  if (!remote) {
    return recoverSuccessMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      odap.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).recoverV1Success(recoverSuccessMessage),
    "RecoverSuccess",
  );
}

export async function checkValidRecoverSuccessMessage(
  response: RecoverSuccessV1Message,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidRecoverSuccessMessage`;

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

  if (!response.success) {
    throw new Error(`${fnTag}, RecoverSuccess message is invalid`);
  }

  if (!odap.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RecoverUpdateAckMessage message signature verification failed`,
    );
  }

  // storeSessionData(response, odap);

  log.info(`RecoverSuccessMessage passed all checks.`);
}
