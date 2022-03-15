import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  CommitPreparationV1Request,
  CommitPreparationV1Response,
} from "../../generated/openapi/typescript-axios";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-lock-evidence-helper",
});

export async function commitPrepare(
  request: CommitPreparationV1Request,
  odap: PluginOdapGateway,
): Promise<CommitPreparationV1Response> {
  const fnTag = `${odap.className}#CommitPrepare()`;
  log.info(
    `server gateway receives CommitPrepareRequestMessage: ${JSON.stringify(
      request,
    )}`,
  );

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData == undefined || sessionData.step == undefined) {
    await odap.Revert(request.sessionID);
    throw new Error(
      `${fnTag}, session Id does not correspond to any open session`,
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

  // Calculate the hash here to avoid changing the object and the hash
  const commitPrepareRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  log.info(
    `CommitPrepareRequestMessage hash is: ${commitPrepareRequestMessageHash}`,
  );

  await checkValidCommitPreparationRequest(request, odap);

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

  const commitPreparationResponseMessage: CommitPreparationV1Response = {
    messageType: OdapMessageType.CommitPreparationResponse,
    clientIdentityPubkey: request.clientIdentityPubkey,
    serverIdentityPubkey: request.serverIdentityPubkey,
    hashCommitPrep: commitPrepareRequestMessageHash,
    serverSignature: "",
    sequenceNumber: request.sequenceNumber,
  };

  commitPreparationResponseMessage.serverSignature = odap.bufArray2HexStr(
    await odap.sign(JSON.stringify(commitPreparationResponseMessage)),
  );

  storeSessionData(request, commitPreparationResponseMessage, odap);

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}->${request.clientIdentityPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  sessionData.step++;

  return commitPreparationResponseMessage;
}

async function checkValidCommitPreparationRequest(
  request: CommitPreparationV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitPreparationRequest()`;

  if (request.messageType != OdapMessageType.CommitPreparationRequest) {
    await odap.Revert(request.sessionID);
    throw new Error(
      `${fnTag}, wrong message type for CommitPreparationRequest`,
    );
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
    await odap.Revert(request.sessionID);
    throw new Error(
      `${fnTag}, CommitPreparationRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  // We need to check somewhere if this phase is completed within the asset-lock duration.

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData === undefined) {
    throw new Error(`${fnTag}, sessionID non exist`);
  }

  if (
    sessionData.lockEvidenceResponseMessageHash != request.hashLockEvidenceAck
  ) {
    await odap.Revert(request.sessionID);
    throw new Error(`${fnTag}, previous message hash does not match`);
  }
}

function storeSessionData(
  request: CommitPreparationV1Request,
  response: CommitPreparationV1Response,
  odap: PluginOdapGateway,
): void {
  const fnTag = `${odap.className}#()storeDataAfterCommitPreparationRequest`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.commitPrepareRequestMessageHash = response.hashCommitPrep;
  sessionData.commitPrepareResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.clientSignatureCommitPreparationRequestMessage =
    request.clientSignature;
  sessionData.serverSignatureCommitPreparationResponseMessage =
    response.serverSignature;

  odap.sessions.set(request.sessionID, sessionData);
}
