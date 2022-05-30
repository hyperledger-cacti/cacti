import { TransferCompleteV1Request } from "../../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "client-transfer-complete-helper",
});

export async function sendTransferCompleteRequest(
  sessionID: string,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#sendTransferCompleteRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.commitFinalResponseMessageHash == undefined ||
    sessionData.transferCommenceMessageRequestHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "init",
      operation: "complete",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  const transferCompleteRequestMessage: TransferCompleteV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCompleteRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashCommitFinalAck: sessionData.commitFinalResponseMessageHash,
    hashTransferCommence: sessionData.transferCommenceMessageRequestHash,
    clientSignature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = odap.bufArray2HexStr(
    odap.sign(JSON.stringify(transferCompleteRequestMessage)),
  );

  transferCompleteRequestMessage.clientSignature = messageSignature;

  sessionData.transferCompleteMessageHash = SHA256(
    JSON.stringify(transferCompleteRequestMessage),
  ).toString();

  sessionData.clientSignatureTransferCompleteMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  log.info(`${fnTag}, sending TransferCompleteRequest...`);

  const response = await odap
    .getOdapAPI(sessionData.recipientBasePath)
    .phase3TransferCompleteRequestV1(transferCompleteRequestMessage);

  if (response.status != 200) {
    throw new Error(`${fnTag}, TransferCompleteRequest message failed`);
  }
}
