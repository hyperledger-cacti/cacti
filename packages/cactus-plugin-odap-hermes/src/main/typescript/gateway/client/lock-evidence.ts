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
): Promise<void> {
  const fnTag = `${odap.className}#sendLockEvidenceRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.transferCommenceMessageResponseHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "init",
      operation: "lock",
      nodes: `${odap.pubKey}->${sessionData.recipientGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  const fabricLockAssetProof = await odap.lockFabricAsset(sessionID);

  log.info(`${fnTag}, proof of the asset lock: ${fabricLockAssetProof}`);

  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    lockEvidenceClaim: fabricLockAssetProof,
    // lock claim format
    lockEvidenceExpiration: new Date()
      .setDate(new Date().getDate() + 1)
      .toString(), // a day from now
    hashCommenceAckRequest: sessionData.transferCommenceMessageResponseHash,
    clientSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  lockEvidenceRequestMessage.clientSignature = messageSignature;

  sessionData.lockEvidenceRequestMessageHash = SHA256(
    JSON.stringify(lockEvidenceRequestMessage),
  ).toString();

  sessionData.clientSignatureLockEvidenceRequestMessage = messageSignature;

  sessionData.lockEvidenceClaim = fabricLockAssetProof;

  odap.sessions.set(sessionID, sessionData);

  log.info(`${fnTag}, sending LockEvidenceRequest...`);

  const response = await odap
    .getOdapAPI(sessionData.recipientBasePath)
    .phase2LockEvidenceRequestV1(lockEvidenceRequestMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, LockEvidenceRequest message failed`);
  }
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
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, wrong message type for LockEvidenceResponse`);
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, LockEvidenceResponse sequence number incorrect`);
  }

  if (
    sessionData.lockEvidenceRequestMessageHash !=
    response.hashLockEvidenceRequest
  ) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  const lockEvidenceResponseMesssageDataSignature = response.serverSignature;

  const sourceServerSignature = new Uint8Array(
    Buffer.from(lockEvidenceResponseMesssageDataSignature, "hex"),
  );

  const sourceServerPubkey = new Uint8Array(
    Buffer.from(sessionData.recipientGatewayPubkey, "hex"),
  );

  response.serverSignature = "";

  if (
    !odap.verifySignature(
      JSON.stringify(response),
      sourceServerSignature,
      sourceServerPubkey,
    )
  ) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, LockEvidenceResponse message signature verification failed`,
    );
  }

  response.serverSignature = lockEvidenceResponseMesssageDataSignature;

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

  sessionData.step++;

  sessionData.lockEvidenceResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureLockEvidenceResponseMessage =
    response.serverSignature;

  odap.sessions.set(sessionData.id, sessionData);
}
