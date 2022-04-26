import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  LockEvidenceV1Request,
  LockEvidenceV1Response,
} from "../../generated/openapi/typescript-axios";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "server-lock-evidence-helper",
});

export async function sendLockEvidenceResponse(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | LockEvidenceV1Response> {
  const fnTag = `${odap.className}#sendLockEvidenceResponse()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.lockEvidenceRequestMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const lockEvidenceResponseMessage: LockEvidenceV1Response = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceResponse,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashLockEvidenceRequest: sessionData.lockEvidenceRequestMessageHash,
    // server transfer number
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  lockEvidenceResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await odap.sign(JSON.stringify(lockEvidenceResponseMessage)),
  );

  sessionData.lockEvidenceResponseMessageHash = SHA256(
    JSON.stringify(lockEvidenceResponseMessage),
  ).toString();

  sessionData.serverSignatureLockEvidenceResponseMessage =
    lockEvidenceResponseMessage.signature;

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "ack",
    operation: "lock",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending LockEvidenceResponse...`);

  if (!remote) {
    return lockEvidenceResponseMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.sourceBasePath,
    ).phase2LockEvidenceResponseV1(lockEvidenceResponseMessage),
    "LockEvidenceResponse",
  );
}

export async function checkValidLockEvidenceRequest(
  request: LockEvidenceV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidLockEvidenceRequest()`;

  const sessionID = request.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.lastSequenceNumber == undefined
  ) {
    throw new Error(
      `${fnTag}, session Id does not correspond to any open session`,
    );
  }

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "exec",
    operation: "lock",
    data: JSON.stringify(sessionData),
  });

  if (request.messageType != OdapMessageType.LockEvidenceRequest) {
    throw new Error(`${fnTag}, wrong message type for LockEvidenceRequest`);
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    throw new Error(
      `${fnTag}, LockEvidenceRequestMessage sequence number incorrect`,
    );
  }

  if (
    sessionData.transferCommenceMessageResponseHash !=
    request.hashCommenceAckRequest
  ) {
    throw new Error(
      `${fnTag}, previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, LockEvidenceRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, LockEvidenceRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  if (
    request.lockEvidenceClaim == undefined ||
    new Date() > new Date(request.lockEvidenceExpiration)
  ) {
    throw new Error(`${fnTag}, invalid or expired lock evidence claim`);
  }

  if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, LockEvidenceRequest message signature verification failed`,
    );
  }

  const claimHash = SHA256(request.lockEvidenceClaim).toString();
  const retrievedClaim = await odap.getLogFromIPFS(
    PluginOdapGateway.getOdapLogKey(sessionID, "proof", "lock"),
  );

  if (claimHash != retrievedClaim.hash) {
    throw new Error(
      `${fnTag}, LockEvidence Claim hash does not match the one stored in IPFS`,
    );
  }

  if (!odap.verifySignature(retrievedClaim, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, LockEvidence Claim message signature verification failed`,
    );
  }

  storeSessionData(request, odap);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "done",
    operation: "lock",
    data: JSON.stringify(sessionData),
  });

  sessionData.step = 6;
  odap.sessions.set(sessionID, sessionData);

  log.info(`LockEvidenceRequest passed all checks.`);
}

function storeSessionData(
  request: LockEvidenceV1Request,
  odap: PluginOdapGateway,
): void {
  const fnTag = `${odap.className}#()storeSessionData`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.lockEvidenceRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureLockEvidenceRequestMessage = request.signature;

  sessionData.lockEvidenceClaim = request.lockEvidenceClaim;

  odap.sessions.set(request.sessionID, sessionData);
}
