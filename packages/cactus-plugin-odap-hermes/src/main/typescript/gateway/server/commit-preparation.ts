import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  CommitPreparationV1Request,
  CommitPreparationV1Response,
} from "../../generated/openapi/typescript-axios";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "server-commit-preparation-helper",
});

export async function sendCommitPreparationResponse(
  sessionID: string,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#sendCommitPrepareResponse()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.commitPrepareRequestMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const commitPreparationResponseMessage: CommitPreparationV1Response = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationResponse,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashCommitPrep: sessionData.commitPrepareRequestMessageHash,
    serverSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  commitPreparationResponseMessage.serverSignature = odap.bufArray2HexStr(
    await odap.sign(JSON.stringify(commitPreparationResponseMessage)),
  );

  sessionData.commitPrepareResponseMessageHash = SHA256(
    JSON.stringify(commitPreparationResponseMessage),
  ).toString();

  sessionData.serverSignatureCommitPreparationResponseMessage =
    commitPreparationResponseMessage.serverSignature;

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}->${sessionData.sourceGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  log.info(`${fnTag}, sending CommitPreparationResponse...`);

  const response = await odap
    .getOdapAPI(sessionData.sourceBasePath)
    .phase3CommitPreparationResponseV1(commitPreparationResponseMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, CommitPreparationResponse message failed`);
  }
}

export async function checkValidCommitPreparationRequest(
  request: CommitPreparationV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitPrepareRequest()`;

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

  // We need to check somewhere if this phase is completed within the asset-lock duration.

  if (request.messageType != OdapMessageType.CommitPreparationRequest) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, wrong message type for CommitPreparationRequest`,
    );
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    throw new Error(
      `${fnTag}, CommitPreparationRequest sequence number incorrect`,
    );
  }

  if (
    sessionData.lockEvidenceResponseMessageHash != request.hashLockEvidenceAck
  ) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, previous message hash does not match`);
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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
      `${fnTag}, CommitPreparationRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  storeSessionData(request, odap);

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "done",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  log.info(`CommitPreparationRequest passed all checks.`);
}

function storeSessionData(
  request: CommitPreparationV1Request,
  odap: PluginOdapGateway,
): void {
  const fnTag = `${odap.className}#()storeSessionData`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.commitPrepareRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureCommitPreparationRequestMessage =
    request.clientSignature;

  odap.sessions.set(request.sessionID, sessionData);
}
