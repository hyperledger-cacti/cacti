import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  CommitFinalV1Request,
  CommitFinalV1Response,
} from "../../generated/openapi/typescript-axios";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "server-commit-final-helper",
});

export async function sendCommitFinalResponse(
  sessionID: string,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#sendCommitFinalResponse()`;

  const sessionData = odap.sessions.get(sessionID);
  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.commitFinalRequestMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const besuCreateAssetProof = await odap.createBesuAsset(sessionID);
  sessionData.commitAcknowledgementClaim = besuCreateAssetProof;

  const commitFinalResponseMessage: CommitFinalV1Response = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalResponse,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    commitAcknowledgementClaim: besuCreateAssetProof,
    hashCommitFinal: sessionData.commitFinalRequestMessageHash,
    serverSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  commitFinalResponseMessage.serverSignature = odap.bufArray2HexStr(
    await odap.sign(JSON.stringify(commitFinalResponseMessage)),
  );

  sessionData.commitFinalResponseMessageHash = SHA256(
    JSON.stringify(commitFinalResponseMessage),
  ).toString();

  sessionData.serverSignatureCommitFinalResponseMessage =
    commitFinalResponseMessage.serverSignature;

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  sessionData.step++;

  odap.sessions.set(sessionID, sessionData);

  // Log init???

  log.info(`${fnTag}, sending CommitFinalResponse...`);

  const response = await odap
    .getOdapAPI(sessionData.sourceBasePath)
    .phase3CommitFinalResponseV1(commitFinalResponseMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, CommitFinalResponse message failed`);
  }
}

export async function checkValidCommitFinalRequest(
  request: CommitFinalV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitFinalRequest()`;

  const sessionID = request.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (
    sessionData == undefined ||
    sessionData.id == undefined ||
    sessionData.step == undefined ||
    sessionData.lastSequenceNumber == undefined
  ) {
    throw new Error(
      `${fnTag}, session Id does not correspond to any open session`,
    );
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "commit-final",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  if (request.messageType != OdapMessageType.CommitFinalRequest) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, wrong message type for CommitFinalRequest`);
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, CommitFinalRequest sequence number incorrect`);
  }

  if (request.commitFinalClaim == undefined) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, claim presented by client is invalid`);
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitFinalRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitFinalRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  if (
    sessionData.commitPrepareResponseMessageHash != request.hashCommitPrepareAck
  ) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, previous message hash does not match`);
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
      `${fnTag}, CommitFinalRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  // We need to check somewhere if this phase is completed within the asset-lock duration.

  storeSessionData(request, odap);

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "done",
      operation: "commit-final",
      nodes: `${odap.pubKey}}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  log.info(`CommitFinalRequest passed all checks.`);
}

async function storeSessionData(
  request: CommitFinalV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeSessionData`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.commitFinalClaim = request.commitFinalClaim;

  sessionData.commitFinalRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureCommitFinalRequestMessage =
    request.clientSignature;

  odap.sessions.set(request.sessionID, sessionData);
}
