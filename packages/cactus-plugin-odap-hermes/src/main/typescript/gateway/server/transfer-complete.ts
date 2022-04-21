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

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "complete",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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
      `${fnTag}, TransferCompleteRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  storeSessionData(request, odap);

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "done",
      operation: "complete",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

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

  sessionData.clientSignatureTransferCompleteMessage = request.clientSignature;

  odap.sessions.set(request.sessionID, sessionData);
}
