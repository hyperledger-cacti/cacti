import {
  TransferInitializationV1Request,
  TransferInitializationV1Response,
  SessionData,
} from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-initiate-transfer-helper",
});

export async function initiateTransfer(
  request: TransferInitializationV1Request,
  odap: PluginOdapGateway,
): Promise<TransferInitializationV1Response> {
  log.info(
    `server gateway receives TransferInitializationRequest: ${JSON.stringify(
      request,
    )}`,
  );

  const recvTimestamp: string = Date.now().toString();

  log.info(
    `TransferInitializationRequest message received at: ${recvTimestamp}`,
  );

  const sessionID = request.sessionID;
  const sessionData: SessionData = {};

  sessionData.id = sessionID;
  sessionData.step = 0;

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

  // Calculate the hash here to avoid changing the object and the hash
  const initializationRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  log.info(
    `TransferInitializationRequest hash is: ${initializationRequestMessageHash}`,
  );

  await checkValidInitializationRequest(request, odap);

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

  const processedTimestamp: string = Date.now().toString();

  log.info(
    `TransferInitializationResponse being built at: ${processedTimestamp}`,
  );

  const transferInitializationResponse: TransferInitializationV1Response = {
    messageType: OdapMessageType.InitializationResponse,
    sessionID: sessionID,
    initialRequestMessageHash: initializationRequestMessageHash,
    timeStamp: recvTimestamp,
    processedTimeStamp: processedTimestamp,
    serverIdentityPubkey: odap.pubKey,
    sequenceNumber: request.sequenceNumber,
    serverSignature: "",
  };

  transferInitializationResponse.serverSignature = odap.bufArray2HexStr(
    await odap.sign(JSON.stringify(transferInitializationResponse)),
  );

  await storeSessionData(
    request,
    transferInitializationResponse,
    sessionID,
    odap,
  );

  await odap.storeOdapLog(
    {
      phase: "p1",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "validate",
      nodes: `${odap.pubKey}->${request.sourceGatewayPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  sessionData.step++;

  return transferInitializationResponse;
}

function checkValidInitializationRequest(
  request: TransferInitializationV1Request,
  odap: PluginOdapGateway,
): void {
  const fnTag = `${odap.className}#checkValidInitializationRequest()`;

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
}

async function storeSessionData(
  request: TransferInitializationV1Request,
  response: TransferInitializationV1Response,
  sessionID: string,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#storeDataAfterInitializationRequest`;
  const sessionData = odap.sessions.get(sessionID);

  if (sessionData == undefined) {
    await odap.Revert(sessionID);
    throw new Error(
      `${fnTag}, reverting transfer because session data is undefined`,
    );
  }

  sessionData.step = 1;
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

  sessionData.initializationResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  sessionData.initializationRequestMessageRcvTimeStamp = response.timeStamp;

  sessionData.initializationRequestMessageProcessedTimeStamp =
    response.processedTimeStamp;

  sessionData.clientSignatureInitializationRequestMessage =
    request.clientSignature;

  sessionData.serverSignatureInitializationResponseMessage =
    response.serverSignature;

  odap.sessions.set(sessionID, sessionData);
}
