import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  // Configuration,
  // DefaultApi as OdapApi,
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
): Promise<void> {
  const fnTag = `${odap.className}#sendTransferCommenceResponse()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
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
    serverSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  transferCommenceResponse.serverSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(transferCommenceResponse)),
  );

  sessionData.transferCommenceMessageResponseHash = SHA256(
    JSON.stringify(transferCommenceResponse),
  ).toString();

  sessionData.serverSignatureTransferCommenceResponseMessage =
    transferCommenceResponse.serverSignature;

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "commence",
      nodes: `${odap.pubKey}->${sessionData.sourceGatewayPubkey}`,
    },
    `${sessionID}-${sessionData.step.toString()}`,
  );

  log.info(`${fnTag}, sending TransferCommenceResponse...`);

  const response = await odap
    .getOdapAPI(sessionData.sourceBasePath)
    .phase2TransferCommenceResponseV1(transferCommenceResponse);

  if (response.status != 200) {
    throw new Error(`${fnTag}, TransferCommenceResponse message failed`);
  }
}

export async function checkValidtransferCommenceRequest(
  request: TransferCommenceV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidtransferCommenceRequest()`;

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

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "commence",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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
    throw new Error(
      `${fnTag}, TransferCommenceRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  storeSessionData(request, odap);

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "done",
      operation: "commence",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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

  sessionData.clientSignatureTransferCommenceRequestMessage =
    request.clientSignature;

  sessionData.originatorPubkey = request.originatorPubkey;
  sessionData.beneficiaryPubkey = request.beneficiaryPubkey;

  odap.sessions.set(request.sessionID, sessionData);
}
