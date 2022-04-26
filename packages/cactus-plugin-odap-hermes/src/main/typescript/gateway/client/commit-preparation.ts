import {
  CommitPreparationV1Request,
  CommitPreparationV1Response,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "client-commit-preparation-helper",
});

export async function sendCommitPreparationRequest(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | CommitPreparationV1Request> {
  const fnTag = `${odap.className}#sendCommitPreparationRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.lockEvidenceResponseMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashLockEvidenceAck: sessionData.lockEvidenceResponseMessageHash,
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  commitPrepareRequestMessage.signature = messageSignature;

  sessionData.commitPrepareRequestMessageHash = SHA256(
    JSON.stringify(commitPrepareRequestMessage),
  ).toString();

  sessionData.clientSignatureCommitPreparationRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "init",
    operation: "prepare",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending CommitPreparationRequest...`);

  if (!remote) {
    return commitPrepareRequestMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.recipientBasePath,
    ).phase3CommitPreparationRequestV1(commitPrepareRequestMessage),
    "CommitPreparationRequest",
  );
}

export async function checkValidCommitPreparationResponse(
  response: CommitPreparationV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitPreparationResponse`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  if (response.messageType != OdapMessageType.CommitPreparationResponse) {
    throw new Error(
      `${fnTag}, wrong message type for CommitPreparationResponse`,
    );
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    throw new Error(
      `${fnTag}, CommitPreparationResponse sequence number incorrect`,
    );
  }

  if (sessionData.commitPrepareRequestMessageHash != response.hashCommitPrep) {
    throw new Error(
      `${fnTag}, CommitPreparationResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitPreparationResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitPreparationResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
    throw new Error(
      `${fnTag}, CommitPreparationResponse message signature verification failed`,
    );
  }

  storeSessionData(response, odap);

  log.info(`CommitPreparationResponse passed all checks.`);
}

function storeSessionData(
  response: CommitPreparationV1Response,
  odap: PluginOdapGateway,
): void {
  const fnTag = `${odap.className}#storeSessionData`;
  const sessionData = odap.sessions.get(response.sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.id == undefined
  ) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  sessionData.commitPrepareResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureCommitPreparationResponseMessage =
    response.signature;

  sessionData.step = 9;

  odap.sessions.set(sessionData.id, sessionData);
}
