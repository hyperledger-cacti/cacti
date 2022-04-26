import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { TransferCompleteV1Request } from "../../generated/openapi/typescript-axios";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "server-transfer-complete-helper",
});

export async function checkValidTransferCompleteRequest(
  request: TransferCompleteV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidTransferCompleteRequest()`;

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

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "exec",
    operation: "complete",
    data: JSON.stringify(sessionData),
  });

  if (request.messageType != OdapMessageType.TransferCompleteRequest) {
    throw new Error(`${fnTag}, wrong message type for TransferCompleteRequest`);
  }

  if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
    throw new Error(
      `${fnTag}, TransferCompleteRequest sequence number incorrect`,
    );
  }

  if (
    request.hashCommitFinalAck != sessionData.commitFinalResponseMessageHash
  ) {
    throw new Error(`${fnTag}, previous message hash not match`);
  }

  if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
    throw new Error(
      `${fnTag}, TransferCompleteRequest message signature verification failed`,
    );
  }

  storeSessionData(request, odap);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "done",
    operation: "complete",
    data: JSON.stringify(sessionData),
  });

  log.info(`TransferCompleteRequest passed all checks.`);
}

async function storeSessionData(
  request: TransferCompleteV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeSessionData`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.transferCompleteMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  sessionData.clientSignatureTransferCompleteMessage = request.signature;

  odap.sessions.set(request.sessionID, sessionData);
}
