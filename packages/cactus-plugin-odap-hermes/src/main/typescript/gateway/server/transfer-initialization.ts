import {
  SessionData,
  TransferInitializationV1Request,
  TransferInitializationV1Response,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "server-transfer-initialization-helper",
});

export async function sendTransferInitializationResponse(
  sessionID: string,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#sendTransferInitiationResponse()`;

  const sessionData = odap.sessions.get(sessionID);
  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.initializationRequestMessageHash == undefined ||
    sessionData.initializationRequestMessageRcvTimeStamp == undefined ||
    sessionData.initializationRequestMessageProcessedTimeStamp == undefined
  ) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const transferInitializationResponse: TransferInitializationV1Response = {
    messageType: OdapMessageType.InitializationResponse,
    sessionID: sessionID,
    initialRequestMessageHash: sessionData.initializationRequestMessageHash,
    timeStamp: sessionData.initializationRequestMessageRcvTimeStamp,
    processedTimeStamp:
      sessionData.initializationRequestMessageProcessedTimeStamp,
    serverIdentityPubkey: odap.pubKey,
    sequenceNumber: sessionData.lastSequenceNumber,
    serverSignature: "",
  };

  transferInitializationResponse.serverSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(transferInitializationResponse)),
  );

  sessionData.initializationResponseMessageHash = SHA256(
    JSON.stringify(transferInitializationResponse),
  ).toString();

  sessionData.serverSignatureInitializationResponseMessage =
    transferInitializationResponse.serverSignature;

  await odap.storeOdapLog(
    {
      phase: "p1",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "validate",
      nodes: `${odap.pubKey}->${sessionData.sourceGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  sessionData.step++;

  odap.sessions.set(sessionID, sessionData);

  // Log init???

  log.info(`${fnTag}, sending TransferInitializationResponse...`);

  const response = await odap
    .getOdapAPI(sessionData.sourceBasePath)
    .phase1TransferInitiationResponseV1(transferInitializationResponse);

  if (response.status != 200) {
    throw new Error(`${fnTag}, TransferInitializationResponse message failed`);
  }
}

export async function checkValidInitializationRequest(
  request: TransferInitializationV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidInitializationRequest()`;

  const sessionData: SessionData = {};
  const recvTimestamp: string = Date.now().toString();
  const sessionID = request.sessionID;

  sessionData.id = sessionID;
  sessionData.step = 0;
  sessionData.initializationRequestMessageRcvTimeStamp = recvTimestamp;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog(
    {
      phase: "p1",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "validate",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  if (request.messageType != OdapMessageType.InitializationRequest) {
    throw new Error(
      `${fnTag}, wrong message type for TransferInitializationRequest`,
    );
  }

  const sourceClientSignature = new Uint8Array(
    Buffer.from(request.clientSignature, "hex"),
  );
  const sourceClientPubkey = new Uint8Array(
    Buffer.from(request.sourceGatewayPubkey, "hex"),
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
      `${fnTag}, TransferInitializationRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  if (!odap.supportedDltIDs.includes(request.sourceGatewayDltSystem)) {
    throw new Error(
      `${fnTag}, source gateway dlt system is not supported by this gateway`,
    );
  }

  const expiryDate: string = request.payloadProfile.assetProfile.expirationDate;
  const isDataExpired: boolean = new Date() >= new Date(expiryDate);
  if (isDataExpired) {
    throw new Error(`${fnTag}, asset has expired`);
  }

  storeSessionData(request, odap);

  await odap.storeOdapLog(
    {
      phase: "p1",
      step: sessionData.step.toString(),
      type: "done",
      operation: "validate",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  log.info(`TransferInitializationRequest passed all checks.`);
}

async function storeSessionData(
  request: TransferInitializationV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#storeDataAfterInitializationRequest`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  sessionData.step = 1;
  sessionData.sourceBasePath = request.sourceGatewayPath;
  sessionData.lastSequenceNumber = request.sequenceNumber;
  sessionData.loggingProfile = request.loggingProfile;
  sessionData.accessControlProfile = request.accessControlProfile;
  sessionData.applicationProfile = request.applicationProfile;
  sessionData.assetProfile = request.payloadProfile.assetProfile;
  sessionData.sourceGatewayPubkey = request.sourceGatewayPubkey;
  sessionData.sourceGatewayDltSystem = request.sourceGatewayDltSystem;
  sessionData.recipientGatewayPubkey = request.recipientGatewayPubkey;
  sessionData.recipientGatewayDltSystem = request.recipientGatewayDltSystem;

  sessionData.initializationRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureInitializationRequestMessage =
    request.clientSignature;

  sessionData.initializationRequestMessageProcessedTimeStamp = Date.now().toString();

  odap.sessions.set(request.sessionID, sessionData);
}
