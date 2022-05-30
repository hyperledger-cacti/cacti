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
): Promise<void> {
  const fnTag = `${odap.className}#sendLockEvidenceResponse()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
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
    serverSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  lockEvidenceResponseMessage.serverSignature = odap.bufArray2HexStr(
    await odap.sign(JSON.stringify(lockEvidenceResponseMessage)),
  );

  sessionData.lockEvidenceResponseMessageHash = SHA256(
    JSON.stringify(lockEvidenceResponseMessage),
  ).toString();

  sessionData.serverSignatureLockEvidenceResponseMessage =
    lockEvidenceResponseMessage.serverSignature;

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "lock",
      nodes: `${odap.pubKey}->${sessionData.sourceGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  log.info(`${fnTag}, sending LockEvidenceResponse...`);

  const response = await odap
    .getOdapAPI(sessionData.sourceBasePath)
    .phase2LockEvidenceResponseV1(lockEvidenceResponseMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, LockEvidenceResponse message failed`);
  }
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

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "lock",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  if (request.messageType != OdapMessageType.LockEvidenceRequest) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, wrong message type for LockEvidenceRequest`);
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceRequestMessage sequence number incorrect`,
    );
  }

  if (
    sessionData.transferCommenceMessageResponseHash !=
    request.hashCommenceAckRequest
  ) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  if (
    request.lockEvidenceClaim == undefined ||
    new Date() > new Date(request.lockEvidenceExpiration)
  ) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, invalid or expired lock evidence claim`);
  }

  const sourceClientSignature = new Uint8Array(
    Buffer.from(request.clientSignature, "hex"),
  );

  const sourceClientPubkey = new Uint8Array(
    Buffer.from(request.clientIdentityPubkey, "hex"),
  );

  const signature = request.clientSignature;
  request.clientSignature = "";
  if (
    !odap.verifySignature(
      JSON.stringify(request),
      sourceClientSignature,
      sourceClientPubkey,
    )
  ) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  storeSessionData(request, odap);

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "done",
      operation: "lock",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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

  sessionData.clientSignatureLockEvidenceRequestMessage =
    request.clientSignature;

  sessionData.lockEvidenceClaim = request.lockEvidenceClaim;

  odap.sessions.set(request.sessionID, sessionData);
}
