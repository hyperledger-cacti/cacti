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
  remote: boolean,
): Promise<void | TransferInitializationV1Response> {
  const fnTag = `${odap.className}#sendTransferInitiationResponse()`;

  const sessionData = odap.sessions.get(sessionID);
  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
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
    signature: "",
    backupGatewaysAllowed: odap.backupGatewaysAllowed,
  };

  transferInitializationResponse.signature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(transferInitializationResponse)),
  );

  sessionData.initializationResponseMessageHash = SHA256(
    JSON.stringify(transferInitializationResponse),
  ).toString();

  sessionData.serverSignatureInitializationResponseMessage =
    transferInitializationResponse.signature;

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "ack",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  odap.sessions.set(sessionID, sessionData);

  // Log init???

  log.info(`${fnTag}, sending TransferInitializationResponse...`);

  if (!remote) {
    return transferInitializationResponse;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.sourceBasePath,
    ).phase1TransferInitiationResponseV1(transferInitializationResponse),
    "TransferInitializationResponse",
  );
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
  sessionData.step = 2;
  sessionData.initializationRequestMessageRcvTimeStamp = recvTimestamp;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "exec",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  if (request.messageType != OdapMessageType.InitializationRequest) {
    throw new Error(
      `${fnTag}, wrong message type for TransferInitializationRequest`,
    );
  }

  if (!odap.verifySignature(request, request.sourceGatewayPubkey)) {
    throw new Error(
      `${fnTag}, TransferInitializationRequest message signature verification failed`,
    );
  }

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

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "done",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

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

  sessionData.version = request.version;
  sessionData.maxRetries = request.maxRetries;
  sessionData.maxTimeout = request.maxTimeout;

  sessionData.allowedSourceBackupGateways = request.backupGatewaysAllowed;
  sessionData.allowedRecipientBackupGateways = odap.backupGatewaysAllowed;

  sessionData.sourceBasePath = request.sourceGatewayPath;
  sessionData.recipientBasePath = request.recipientBasePath;
  sessionData.lastSequenceNumber = request.sequenceNumber;
  sessionData.loggingProfile = request.loggingProfile;
  sessionData.accessControlProfile = request.accessControlProfile;
  sessionData.payloadProfile = request.payloadProfile;
  sessionData.applicationProfile = request.applicationProfile;
  sessionData.assetProfile = request.payloadProfile.assetProfile;
  sessionData.sourceGatewayPubkey = request.sourceGatewayPubkey;
  sessionData.sourceGatewayDltSystem = request.sourceGatewayDltSystem;
  sessionData.recipientGatewayPubkey = request.recipientGatewayPubkey;
  sessionData.recipientGatewayDltSystem = request.recipientGatewayDltSystem;
  sessionData.rollbackActionsPerformed = [];
  sessionData.rollbackProofs = [];
  sessionData.lastMessageReceivedTimestamp = new Date().toString();

  sessionData.initializationRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureInitializationRequestMessage = request.signature;

  sessionData.initializationRequestMessageProcessedTimeStamp = Date.now().toString();

  odap.sessions.set(request.sessionID, sessionData);
}
