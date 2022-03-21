import {
  CommitFinalV1Request,
  CommitFinalV1Response,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "client-commit-final-helper",
});

export async function sendCommitFinalRequest(
  sessionID: string,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#sendCommitFinalRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.commitPrepareResponseMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "init",
      operation: "commit-final",
      nodes: `${odap.pubKey}->${sessionData.recipientGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  const fabricDeleteAssetProof = await odap.deleteFabricAsset(sessionID);
  sessionData.commitFinalClaim = fabricDeleteAssetProof;

  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    commitFinalClaim: fabricDeleteAssetProof,
    // commit final claim format
    hashCommitPrepareAck: sessionData.commitPrepareResponseMessageHash,
    clientSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  commitFinalRequestMessage.clientSignature = messageSignature;

  sessionData.commitFinalRequestMessageHash = SHA256(
    JSON.stringify(commitFinalRequestMessage),
  ).toString();

  sessionData.clientSignatureCommitFinalRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  log.info(`${fnTag}, sending CommitFinalRequest...`);

  const response = await odap
    .getOdapAPI(sessionData.recipientBasePath)
    .phase3CommitFinalRequestV1(commitFinalRequestMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, CommitFinalRequest message failed`);
  }
}

export async function checkValidCommitFinalResponse(
  response: CommitFinalV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitFinalResponse`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  if (response.messageType != OdapMessageType.CommitFinalResponse) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, CommitFinalResponse sequence number incorrect`);
  }

  if (response.commitAcknowledgementClaim == undefined) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, the claim provided is not valid`);
  }

  if (sessionData.commitFinalRequestMessageHash != response.hashCommitFinal) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitFinalResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitFinalResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitFinalResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  const commitFinalResponseMessageDataSignature = response.serverSignature;

  const sourceServerSignature = new Uint8Array(
    Buffer.from(commitFinalResponseMessageDataSignature, "hex"),
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
      `${fnTag}, CommitFinalResponse message signature verification failed`,
    );
  }

  response.serverSignature = commitFinalResponseMessageDataSignature;

  storeSessionData(response, odap);

  log.info(`CommitFinalResponse passed all checks.`);
}

function storeSessionData(
  response: CommitFinalV1Response,
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

  sessionData.commitAcknowledgementClaim = response.commitAcknowledgementClaim;

  sessionData.commitFinalResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureCommitFinalResponseMessage =
    response.serverSignature;

  odap.sessions.set(sessionData.id, sessionData);
}
