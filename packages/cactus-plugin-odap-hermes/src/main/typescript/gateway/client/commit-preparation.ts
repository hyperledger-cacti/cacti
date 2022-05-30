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
): Promise<void> {
  const fnTag = `${odap.className}#sendCommitPreparationRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.lockEvidenceResponseMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "init",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}->${sessionData.recipientGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashLockEvidenceAck: sessionData.lockEvidenceResponseMessageHash,
    clientSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  commitPrepareRequestMessage.clientSignature = messageSignature;

  sessionData.commitPrepareRequestMessageHash = SHA256(
    JSON.stringify(commitPrepareRequestMessage),
  ).toString();

  sessionData.clientSignatureCommitPreparationRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  log.info(`${fnTag}, sending CommitPreparationRequest...`);

  const response = await odap
    .getOdapAPI(sessionData.recipientBasePath)
    .phase3CommitPreparationRequestV1(commitPrepareRequestMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, CommitPreparationRequest message failed`);
  }
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
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, wrong message type for CommitPreparationResponse`,
    );
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationResponse sequence number incorrect`,
    );
  }

  if (sessionData.commitPrepareRequestMessageHash != response.hashCommitPrep) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  const commitPrepareResponseMessageDataSignature = response.serverSignature;

  const sourceServerSignature = new Uint8Array(
    Buffer.from(commitPrepareResponseMessageDataSignature, "hex"),
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
      `${fnTag}, CommitPreparationResponse message signature verification failed`,
    );
  }

  response.serverSignature = commitPrepareResponseMessageDataSignature;

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

  sessionData.step++;

  sessionData.commitPrepareResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureCommitPreparationResponseMessage =
    response.serverSignature;

  odap.sessions.set(sessionData.id, sessionData);
}
