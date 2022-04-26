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
  remote: boolean,
): Promise<void | CommitFinalV1Response> {
  const fnTag = `${odap.className}#sendCommitFinalResponse()`;

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
    sessionData.commitAcknowledgementClaim == undefined ||
    sessionData.commitFinalRequestMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const commitFinalResponseMessage: CommitFinalV1Response = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalResponse,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    commitAcknowledgementClaim: sessionData.commitAcknowledgementClaim,
    hashCommitFinal: sessionData.commitFinalRequestMessageHash,
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  commitFinalResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await odap.sign(JSON.stringify(commitFinalResponseMessage)),
  );

  sessionData.commitFinalResponseMessageHash = SHA256(
    JSON.stringify(commitFinalResponseMessage),
  ).toString();

  sessionData.serverSignatureCommitFinalResponseMessage =
    commitFinalResponseMessage.signature;

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "ack",
    operation: "final",
    data: JSON.stringify(sessionData),
  });

  odap.sessions.set(sessionID, sessionData);

  log.info(`${fnTag}, sending CommitFinalResponse...`);

  if (!remote) {
    return commitFinalResponseMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.sourceBasePath,
    ).phase3CommitFinalResponseV1(commitFinalResponseMessage),
    "CommitFinalResponse",
  );
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

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "exec",
    operation: "final",
    data: JSON.stringify(sessionData),
  });

  if (request.messageType != OdapMessageType.CommitFinalRequest) {
    throw new Error(`${fnTag}, wrong message type for CommitFinalRequest`);
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    throw new Error(`${fnTag}, CommitFinalRequest sequence number incorrect`);
  }

  if (request.commitFinalClaim == undefined) {
    throw new Error(`${fnTag}, claim presented by client is invalid`);
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitFinalRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitFinalRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  if (
    sessionData.commitPrepareResponseMessageHash != request.hashCommitPrepareAck
  ) {
    throw new Error(`${fnTag}, previous message hash does not match`);
  }

  if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, CommitFinalRequest message signature verification failed`,
    );
  }

  // We need to check somewhere if this phase is completed within the asset-lock duration.
  const claimHash = SHA256(request.commitFinalClaim).toString();
  const retrievedClaim = await odap.getLogFromIPFS(
    PluginOdapGateway.getOdapLogKey(sessionID, "proof", "delete"),
  );

  if (claimHash != retrievedClaim.hash) {
    throw new Error(
      `${fnTag}, Commit Final Claim hash does not match the one stored in IPFS`,
    );
  }

  if (!odap.verifySignature(retrievedClaim, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, Commit Final Claim signature verification failed`,
    );
  }

  storeSessionData(request, odap);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "done",
    operation: "final",
    data: JSON.stringify(sessionData),
  });

  sessionData.step = 10;
  odap.sessions.set(sessionID, sessionData);

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

  sessionData.clientSignatureCommitFinalRequestMessage = request.signature;

  odap.sessions.set(request.sessionID, sessionData);
}
