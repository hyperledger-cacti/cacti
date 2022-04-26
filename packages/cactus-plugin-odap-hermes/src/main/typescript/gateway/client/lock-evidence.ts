import {
  LockEvidenceV1Request,
  LockEvidenceV1Response,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "client-lock-evidence-helper",
});

export async function sendLockEvidenceRequest(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | LockEvidenceV1Request> {
  const fnTag = `${odap.className}#sendLockEvidenceRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.lockEvidenceClaim == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.transferCommenceMessageResponseHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    lockEvidenceClaim: sessionData.lockEvidenceClaim,
    // lock claim format
    lockEvidenceExpiration: new Date()
      .setDate(new Date().getDate() + 1)
      .toString(), // a day from now
    hashCommenceAckRequest: sessionData.transferCommenceMessageResponseHash,
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  lockEvidenceRequestMessage.signature = messageSignature;

  sessionData.lockEvidenceRequestMessageHash = SHA256(
    JSON.stringify(lockEvidenceRequestMessage),
  ).toString();

  sessionData.clientSignatureLockEvidenceRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "init",
    operation: "lock",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending LockEvidenceRequest...`);

  if (!remote) {
    return lockEvidenceRequestMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.recipientBasePath,
    ).phase2LockEvidenceRequestV1(lockEvidenceRequestMessage),
    "LockEvidenceRequest",
  );
}

export async function checkValidLockEvidenceResponse(
  response: LockEvidenceV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidLockEvidenceResponse`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  if (response.messageType != OdapMessageType.LockEvidenceResponse) {
    throw new Error(`${fnTag}, wrong message type for LockEvidenceResponse`);
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    throw new Error(`${fnTag}, LockEvidenceResponse sequence number incorrect`);
  }

  if (
    sessionData.lockEvidenceRequestMessageHash !=
    response.hashLockEvidenceRequest
  ) {
    throw new Error(
      `${fnTag}, LockEvidenceResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, LockEvidenceResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, LockEvidenceResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
    throw new Error(
      `${fnTag}, LockEvidenceResponse message signature verification failed`,
    );
  }

  storeSessionData(response, odap);

  log.info(`LockEvidenceResponse passed all checks.`);
}

function storeSessionData(
  response: LockEvidenceV1Response,
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

  sessionData.lockEvidenceResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureLockEvidenceResponseMessage = response.signature;

  sessionData.step = 7;

  odap.sessions.set(sessionData.id, sessionData);
}
