import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  TransferCompleteV1Request,
  TransferCompleteV1Response,
} from "../../generated/openapi/typescript-axios";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-transfer-complete-helper",
});

export async function transferComplete(
  request: TransferCompleteV1Request,
  odap: PluginOdapGateway,
): Promise<TransferCompleteV1Response> {
  const fnTag = `${odap.className}#transferComplete()`;
  log.info(
    `server gateway receives TransferCommenceMessage: ${JSON.stringify(
      request,
    )}`,
  );

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData === undefined || sessionData.step == undefined) {
    throw new Error(
      `${fnTag}, session Id does not correspond to any open session`,
    );
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "transfer-complete",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  // Calculate the hash here to avoid changing the object and the hash
  const transferCompleteMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  log.info(`TransferCommenceRequest hash is: ${transferCompleteMessageHash}`);

  await checkValidTransferCompleteRequest(request, odap);

  log.info("Transfer complete.");

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "transfer-complete",
      nodes: `${odap.pubKey}->${request.clientIdentityPubkey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  return { ok: "true" };
}

async function checkValidTransferCompleteRequest(
  request: TransferCompleteV1Request,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidTransferCompleteRequest()`;

  if (request.messageType != OdapMessageType.TransferCompleteRequest) {
    throw new Error(`${fnTag}, wrong message type for TransferCompleteRequest`);
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

  if (
    sessionData.commitFinalResponseMessageHash != request.hashCommitFinalAck
  ) {
    throw new Error(`${fnTag}, previous message hash not match`);
  }

  if (
    sessionData.transferCommenceMessageRequestHash !=
    request.hashTransferCommence
  ) {
    throw new Error(
      `${fnTag}, previous TransferCommenceRequest hash not match`,
    );
  }
}
