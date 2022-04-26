import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  TransferCommenceV1Request,
  TransferCommenceV1Response,
} from "../../generated/openapi/typescript-axios";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "server-transfer-commence-helper",
});

export async function sendTransferCommenceResponse(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | TransferCommenceV1Response> {
  const fnTag = `${odap.className}#sendTransferCommenceResponse()`;

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
    sessionData.transferCommenceMessageRequestHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const transferCommenceResponse: TransferCommenceV1Response = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceResponse,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashCommenceRequest: sessionData.transferCommenceMessageRequestHash,
    // serverTransferNumber??
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  transferCommenceResponse.signature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(transferCommenceResponse)),
  );

  sessionData.transferCommenceMessageResponseHash = SHA256(
    JSON.stringify(transferCommenceResponse),
  ).toString();

  sessionData.serverSignatureTransferCommenceResponseMessage =
    transferCommenceResponse.signature;

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "ack",
    operation: "commence",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending TransferCommenceResponse...`);

  if (!remote) {
    return transferCommenceResponse;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.sourceBasePath,
    ).phase2TransferCommenceResponseV1(transferCommenceResponse),
    "TransferCommenceResponse",
  );
}

export async function checkValidtransferCommenceRequest(
  request: TransferCommenceV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidtransferCommenceRequest()`;

  const sessionID = request.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined || sessionData.lastSequenceNumber == undefined) {
    throw new Error(
      `${fnTag}, session Id does not correspond to any open session`,
    );
  }

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "exec",
    operation: "commence",
    data: JSON.stringify(sessionData),
  });

  if (request.messageType != OdapMessageType.TransferCommenceRequest) {
    throw new Error(`${fnTag}, wrong message type for TransferCommenceRequest`);
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    throw new Error(
      `${fnTag}, TransferCommenceRequest sequence number incorrect`,
    );
  }

  if (
    sessionData.initializationResponseMessageHash != request.hashPrevMessage
  ) {
    throw new Error(
      `${fnTag}, TransferCommenceRequest previous message hash does not match the one that was sent`,
    );
  }

  if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
    throw new Error(
      `${fnTag}, TransferCommenceRequest serverIdentity public key does not match the one that was sent`,
    );
  }

  if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
    throw new Error(
      `${fnTag}, TransferCommenceRequest clientIdentity public key does not match the one that was sent`,
    );
  }

  const assetProfileHash = SHA256(
    JSON.stringify(sessionData.assetProfile),
  ).toString();
  if (assetProfileHash !== request.hashAssetProfile) {
    throw new Error(`${fnTag}, assetProfile hash not match`);
  }

  if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, TransferCommenceRequest message signature verification failed`,
    );
  }

  storeSessionData(request, odap);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "done",
    operation: "commence",
    data: JSON.stringify(sessionData),
  });

  sessionData.step = 4;
  odap.sessions.set(sessionID, sessionData);

  log.info(`TransferCommenceRequest passed all checks.`);
}

async function storeSessionData(
  request: TransferCommenceV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeSessionData`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.transferCommenceMessageRequestHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureTransferCommenceRequestMessage = request.signature;

  sessionData.originatorPubkey = request.originatorPubkey;
  sessionData.beneficiaryPubkey = request.beneficiaryPubkey;

  odap.sessions.set(request.sessionID, sessionData);
}
