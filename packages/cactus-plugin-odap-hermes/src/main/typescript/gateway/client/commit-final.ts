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
  remote: boolean,
): Promise<void | CommitFinalV1Request> {
  const fnTag = `${odap.className}#sendCommitFinalRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.commitFinalClaim == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.commitPrepareResponseMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    commitFinalClaim: sessionData.commitFinalClaim,
    // commit final claim format
    hashCommitPrepareAck: sessionData.commitPrepareResponseMessageHash,
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  commitFinalRequestMessage.signature = messageSignature;

  sessionData.commitFinalRequestMessageHash = SHA256(
    JSON.stringify(commitFinalRequestMessage),
  ).toString();

  sessionData.clientSignatureCommitFinalRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "init",
    operation: "final",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending CommitFinalRequest...`);

  if (!remote) {
    return commitFinalRequestMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.recipientBasePath,
    ).phase3CommitFinalRequestV1(commitFinalRequestMessage),
    "CommitFinalRequest",
  );
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
    throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    throw new Error(`${fnTag}, CommitFinalResponse sequence number incorrect`);
  }

  if (response.commitAcknowledgementClaim == undefined) {
    throw new Error(`${fnTag}, the claim provided is not valid`);
  }

  if (sessionData.commitFinalRequestMessageHash != response.hashCommitFinal) {
    throw new Error(
      `${fnTag}, CommitFinalResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitFinalResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, CommitFinalResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
    throw new Error(
      `${fnTag}, CommitFinalResponse message signature verification failed`,
    );
  }

  const claimHash = SHA256(response.commitAcknowledgementClaim).toString();
  const retrievedClaim = await odap.getLogFromIPFS(
    PluginOdapGateway.getOdapLogKey(sessionID, "proof", "create"),
  );

  if (claimHash != retrievedClaim.hash) {
    throw new Error(
      `${fnTag}, Commit Acknowledgement Claim hash does not match the one stored in IPFS`,
    );
  }

  if (!odap.verifySignature(retrievedClaim, response.serverIdentityPubkey)) {
    throw new Error(
      `${fnTag}, Commit Acknowledgement Claim signature verification failed`,
    );
  }

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

  sessionData.commitAcknowledgementClaim = response.commitAcknowledgementClaim;

  sessionData.commitFinalResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureCommitFinalResponseMessage = response.signature;

  sessionData.step = 11;

  odap.sessions.set(sessionData.id, sessionData);
}
