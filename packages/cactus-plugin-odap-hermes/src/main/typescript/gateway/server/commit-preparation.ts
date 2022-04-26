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
  remote: boolean,
): Promise<void | CommitPreparationV1Response> {
  const fnTag = `${odap.className}#sendCommitPrepareResponse()`;

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
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  commitPreparationResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await odap.sign(JSON.stringify(commitPreparationResponseMessage)),
  );

  sessionData.commitPrepareResponseMessageHash = SHA256(
    JSON.stringify(commitPreparationResponseMessage),
  ).toString();

  sessionData.serverSignatureCommitPreparationResponseMessage =
    commitPreparationResponseMessage.signature;

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "ack",
    operation: "prepare",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending CommitPreparationResponse...`);

  if (!remote) {
    return commitPreparationResponseMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.sourceBasePath,
    ).phase3CommitPreparationResponseV1(commitPreparationResponseMessage),
    "CommitPreparationResponse",
  );
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
    throw new Error(`${fnTag}, previous message hash does not match`);
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitPreparationRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitPreparationRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "exec",
    operation: "prepare",
    data: JSON.stringify(sessionData),
  });

  if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, CommitPreparationRequest message signature verification failed`,
    );
  }

  storeSessionData(request, odap);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "done",
    operation: "prepare",
    data: JSON.stringify(sessionData),
  });

  sessionData.step = 8;
  odap.sessions.set(sessionID, sessionData);

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
    request.signature;

  odap.sessions.set(request.sessionID, sessionData);
}
