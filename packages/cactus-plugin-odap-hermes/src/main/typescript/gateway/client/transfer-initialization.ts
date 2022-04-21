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
): Promise<void> {
  const fnTag = `${odap.className}#sendTransferInitializationRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.id == undefined ||
    sessionData.step == undefined ||
    sessionData.version == undefined ||
    sessionData.payloadProfile == undefined ||
    sessionData.loggingProfile == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.accessControlProfile == undefined ||
    sessionData.applicationProfile == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayDltSystem == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.recipientGatewayDltSystem == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  if (!odap.supportedDltIDs.includes(sessionData.recipientGatewayDltSystem)) {
    throw new Error(
      `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
    );
  }

  await odap.storeOdapLog(
    {
      phase: "p1",
      step: sessionData.step.toString(),
      type: "init",
      operation: "validate",
      nodes: `${odap.pubKey}->${sessionData.recipientGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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
    clientSignature: "",
    sourceGatewayPubkey: odap.pubKey,
    sourceGatewayDltSystem: sessionData.sourceGatewayDltSystem,
    recipientGatewayPubkey: sessionData.recipientGatewayPubkey,
    recipientGatewayDltSystem: sessionData.recipientGatewayDltSystem,
    sequenceNumber: sessionData.lastSequenceNumber,
    sourceGatewayPath: sessionData.sourceBasePath,
    // escrow type
    // expiry time (related to the escrow)
    // multiple claims allowed
    // multiple cancels allowed
    // permissions
  };

  const messageSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(initializationRequestMessage)),
  );

  initializationRequestMessage.clientSignature = messageSignature;

  sessionData.initializationRequestMessageHash = SHA256(
    JSON.stringify(initializationRequestMessage),
  ).toString();

  sessionData.clientSignatureInitializationRequestMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  log.info(`${fnTag}, sending TransferInitializationRequest...`);

  const response = await odap
    .getOdapAPI(sessionData.recipientBasePath)
    .phase1TransferInitiationRequestV1(initializationRequestMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, TransferInitializationRequest message failed`);
  }
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

  const transferInitiationResponseDataSignature = response.serverSignature;

  const sourceServerSignature = new Uint8Array(
    Buffer.from(transferInitiationResponseDataSignature, "hex"),
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
    throw new Error(
      `${fnTag}, TransferInitializationResponse message signature verification failed`,
    );
  }

  response.serverSignature = transferInitiationResponseDataSignature;

  storeSessionData(response, odap);

  log.info(`TransferInitializationResponse passed all checks.`);
}

async function storeSessionData(
  response: TransferInitializationV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#storeSessionData`;
  const sessionData = odap.sessions.get(response.sessionID);

  if (sessionData == undefined || sessionData.step == undefined) {
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  const serverIdentityPubkey = response.serverIdentityPubkey;

  sessionData.step++;

  sessionData.id = response.sessionID;

  sessionData.recipientGatewayPubkey = serverIdentityPubkey;

  sessionData.initializationResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.serverSignatureInitializationResponseMessage =
    response.serverSignature;

  sessionData.fabricAssetSize = "1";

  odap.sessions.set(sessionData.id, sessionData);
}
