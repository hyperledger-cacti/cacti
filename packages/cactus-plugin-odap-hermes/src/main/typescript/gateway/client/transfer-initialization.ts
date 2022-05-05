import {
  TransferInitializationV1Request,
  TransferInitializationV1Response,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "client-transfer-initialization-helper",
});

export async function sendTransferInitializationRequest(
  sessionID: string,
  odap: PluginOdapGateway,
  remote: boolean,
): Promise<void | TransferInitializationV1Request> {
  const fnTag = `${odap.className}#sendTransferInitializationRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.id == undefined ||
    sessionData.step == undefined ||
    sessionData.version == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.payloadProfile == undefined ||
    sessionData.loggingProfile == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.accessControlProfile == undefined ||
    sessionData.applicationProfile == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayDltSystem == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.recipientGatewayDltSystem == undefined ||
    sessionData.allowedSourceBackupGateways == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  if (!odap.supportedDltIDs.includes(sessionData.recipientGatewayDltSystem)) {
    throw new Error(
      `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
    );
  }

  const initializationRequestMessage: TransferInitializationV1Request = {
    messageType: OdapMessageType.InitializationRequest,
    sessionID: sessionData.id,
    version: sessionData.version,
    // developer urn
    // credential profile
    payloadProfile: sessionData.payloadProfile,
    applicationProfile: sessionData.applicationProfile,
    loggingProfile: sessionData.loggingProfile,
    accessControlProfile: sessionData.accessControlProfile,
    signature: "",
    sourceGatewayPubkey: odap.pubKey,
    sourceGatewayDltSystem: sessionData.sourceGatewayDltSystem,
    recipientGatewayPubkey: sessionData.recipientGatewayPubkey,
    recipientGatewayDltSystem: sessionData.recipientGatewayDltSystem,
    sequenceNumber: sessionData.lastSequenceNumber,
    sourceGatewayPath: sessionData.sourceBasePath,
    recipientBasePath: sessionData.recipientBasePath,
    // escrow type
    // expiry time (related to the escrow)
    // multiple claims allowed
    // multiple cancels allowed
    // permissions
    maxRetries: sessionData.maxRetries,
    maxTimeout: sessionData.maxTimeout,
    backupGatewaysAllowed: sessionData.allowedSourceBackupGateways,
  };

  const messageSignature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(initializationRequestMessage)),
  );

  initializationRequestMessage.signature = messageSignature;

  sessionData.initializationRequestMessageHash = SHA256(
    JSON.stringify(initializationRequestMessage),
  ).toString();

  sessionData.clientSignatureInitializationRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "init",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending TransferInitializationRequest...`);

  if (!remote) {
    return initializationRequestMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.recipientBasePath,
    ).phase1TransferInitiationRequestV1(initializationRequestMessage),
    "TransferInitializationRequest",
  );
}

export async function checkValidInitializationResponse(
  response: TransferInitializationV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidInitializationResponse`;

  const sessionID = response.sessionID;
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  if (response.messageType != OdapMessageType.InitializationResponse) {
    throw new Error(
      `${fnTag}, wrong message type for TransferInitializationResponse`,
    );
  }

  if (response.sequenceNumber != sessionData.lastSequenceNumber) {
    throw new Error(
      `${fnTag}, TransferInitializationResponse sequence number incorrect`,
    );
  }

  if (
    response.initialRequestMessageHash !=
    sessionData.initializationRequestMessageHash
  ) {
    throw new Error(
      `${fnTag}, TransferInitializationResponse previous message hash does not match the one that was sent`,
    );
  }

  if (response.serverIdentityPubkey != sessionData.recipientGatewayPubkey) {
    throw new Error(
      `${fnTag}, TransferInitializationResponse serverIdentity public key does not match the one that was sent`,
    );
  }

  if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
    throw new Error(
      `${fnTag}, TransferInitializationResponse message signature verification failed`,
    );
  }

  storeSessionData(response, odap);

  log.info(`TransferInitializationResponse passed all checks.`);
}

function storeSessionData(
  response: TransferInitializationV1Response,
  odap: PluginOdapGateway,
): void {
  const fnTag = `${odap.className}#storeSessionData`;
  const sessionData = odap.sessions.get(response.sessionID);

  if (sessionData == undefined || sessionData.step == undefined) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  const serverIdentityPubkey = response.serverIdentityPubkey;

  sessionData.id = response.sessionID;

  sessionData.recipientGatewayPubkey = serverIdentityPubkey;

  sessionData.initializationResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureInitializationResponseMessage = response.signature;

  sessionData.allowedRecipientBackupGateways = response.backupGatewaysAllowed;
  sessionData.fabricAssetSize = "1";

  sessionData.step = 3;

  odap.sessions.set(sessionData.id, sessionData);
}
