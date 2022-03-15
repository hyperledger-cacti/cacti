import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  TransferCommenceV1Request,
  TransferCommenceV1Response,
} from "../../generated/openapi/typescript-axios";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-lock-evidence-helper",
});

export async function transferCommence(
  request: TransferCommenceV1Request,
  odap: PluginOdapGateway,
): Promise<TransferCommenceV1Response> {
  const fnTag = `${odap.className}#transferCommence()`;
  log.info(
    `server gateway receives TransferCommenceMessage: ${JSON.stringify(
      request,
    )}`,
  );

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData == undefined || sessionData.step == undefined) {
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

  // Calculate the hash here to avoid changing the object and the hash
  const transferCommenceRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  log.info(
    `TransferCommenceRequest hash is: ${transferCommenceRequestMessageHash}`,
  );

  await checkValidtransferCommenceRequest(request, odap);

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

  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    clientIdentityPubkey: request.clientIdentityPubkey,
    serverIdentityPubkey: request.serverIdentityPubkey,
    hashCommenceRequest: transferCommenceRequestMessageHash,
    // serverTransferNumber??
    serverSignature: "",
    sequenceNumber: request.sequenceNumber,
  };

  const serverSignature = await odap.sign(
    JSON.stringify(transferCommenceResponse),
  );

  transferCommenceResponse.serverSignature = odap.bufArray2HexStr(
    serverSignature,
  );

  await storeSessionData(request, transferCommenceResponse, odap);

  await odap.storeOdapLog(
    {
      phase: "p2",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "commence",
      nodes: `${odap.pubKey}->${request.clientIdentityPubkey}`,
    },
    `${request.sessionID}-${sessionData.step.toString()}`,
  );

  sessionData.step++;

  return transferCommenceResponse;
}

async function checkValidtransferCommenceRequest(
  request: TransferCommenceV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidtransferCommenceRequest()`;

  if (request.messageType != OdapMessageType.TransferCommenceRequest) {
    throw new Error(`${fnTag}, wrong message type for TransferCommenceRequest`);
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

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData === undefined) {
    throw new Error(`${fnTag}, sessionID non exist`);
  }

  if (sessionData.initializationRequestMessageHash != request.hashPrevMessage) {
    throw new Error(`${fnTag}, previous message hash not match`);
  }

  const assetProfileHash = SHA256(
    JSON.stringify(sessionData.assetProfile),
  ).toString();
  const isAssetProfileHashMatch = assetProfileHash === request.hashAssetProfile;
  if (!isAssetProfileHashMatch) {
    throw new Error(`${fnTag}, assetProfile hash not match`);
  }
}

async function storeSessionData(
  request: TransferCommenceV1Request,
  response: TransferCommenceV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeSessionData`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.transferCommenceMessageRequestHash = response.hashCommenceRequest;
  sessionData.transferCommenceMessageResponseHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.clientSignatureTransferCommenceRequestMessage =
    request.clientSignature;

  sessionData.serverSignatureTransferCommenceResponseMessage =
    response.serverSignature;

  sessionData.originatorPubkey = request.originatorPubkey;
  sessionData.beneficiaryPubkey = request.beneficiaryPubkey;

  odap.sessions.set(request.sessionID, sessionData);
}
