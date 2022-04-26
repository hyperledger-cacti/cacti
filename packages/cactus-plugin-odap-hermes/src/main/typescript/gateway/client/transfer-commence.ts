import {
  TransferCommenceV1Request,
  TransferCommenceV1Response,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "client-transfer-commence-helper",
});

export async function sendTransferCommenceRequest(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | TransferCommenceV1Request> {
  const fnTag = `${odap.className}#sendTransferCommenceRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.assetProfile == undefined ||
    sessionData.recipientBasePath == undefined ||
    // sessionData.originatorPubkey == undefined ||
    // sessionData.beneficiaryPubkey == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.sourceGatewayDltSystem == undefined ||
    sessionData.recipientGatewayDltSystem == undefined ||
    sessionData.initializationResponseMessageHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const hashAssetProfile = SHA256(
    JSON.stringify(sessionData.assetProfile),
  ).toString();

  const transferCommenceRequestMessage: TransferCommenceV1Request = {
    messageType: OdapMessageType.TransferCommenceRequest,
    // originatorPubkey: sessionData.originatorPubkey,
    // beneficiaryPubkey: sessionData.beneficiaryPubkey,
    originatorPubkey: "sessionData.originatorPubkey",
    beneficiaryPubkey: "sessionData.beneficiaryPubkey",
    senderDltSystem: sessionData.sourceGatewayDltSystem,
    recipientDltSystem: sessionData.recipientGatewayDltSystem,
    sessionID: sessionID,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashAssetProfile: hashAssetProfile,
    hashPrevMessage: sessionData.initializationResponseMessageHash,
    // clientTransferNumber
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(transferCommenceRequestMessage)),
  );

  transferCommenceRequestMessage.signature = messageSignature;

  sessionData.transferCommenceMessageRequestHash = SHA256(
    JSON.stringify(transferCommenceRequestMessage),
  ).toString();

  sessionData.clientSignatureTransferCommenceRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "init",
    operation: "commence",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending TransferCommenceRequest...`);

  if (!remote) {
    return transferCommenceRequestMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.recipientBasePath,
    ).phase2TransferCommenceRequestV1(transferCommenceRequestMessage),
    "TransferCommenceRequest",
  );
}

export async function checkValidTransferCommenceResponse(
  response: TransferCommenceV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidTransferCommenceResponse`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  if (response.messageType != OdapMessageType.TransferCommenceResponse) {
    throw new Error(
      `${fnTag}, wrong message type for TransferCommenceResponse`,
    );
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    throw new Error(
      `${fnTag}, TransferCommenceResponse sequence number incorrect`,
    );
  }

  if (
    sessionData.transferCommenceMessageRequestHash !=
    response.hashCommenceRequest
  ) {
    throw new Error(
      `${fnTag}, TransferCommenceResponse previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, TransferCommenceResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, TransferCommenceResponse clientIdentity public key does not match the one that was sent`,
    );
  }

  if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
    throw new Error(
      `${fnTag}, TransferCommenceResponse message signature verification failed`,
    );
  }

  storeSessionData(response, odap);

  log.info(`TransferCommenceResponse passed all checks.`);
}

function storeSessionData(
  response: TransferCommenceV1Response,
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

  sessionData.transferCommenceMessageResponseHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureTransferCommenceResponseMessage =
    response.signature;

  sessionData.step = 5;

  odap.sessions.set(sessionData.id, sessionData);
}
