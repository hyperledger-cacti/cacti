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
  remote: boolean,
): Promise<void | TransferCompleteV1Request> {
  const fnTag = `${odap.className}#sendTransferCompleteRequest()`;

  const sessionData = odap.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.step == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.lastSequenceNumber == undefined ||
    sessionData.sourceGatewayPubkey == undefined ||
    sessionData.recipientGatewayPubkey == undefined ||
    sessionData.commitFinalResponseMessageHash == undefined ||
    sessionData.transferCommenceMessageRequestHash == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const transferCompleteRequestMessage: TransferCompleteV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCompleteRequest,
    clientIdentityPubkey: sessionData.sourceGatewayPubkey,
    serverIdentityPubkey: sessionData.recipientGatewayPubkey,
    hashCommitFinalAck: sessionData.commitFinalResponseMessageHash,
    hashTransferCommence: sessionData.transferCommenceMessageRequestHash,
    signature: "",
    sequenceNumber: ++sessionData.lastSequenceNumber,
  };

  const messageSignature = PluginOdapGateway.bufArray2HexStr(
    odap.sign(JSON.stringify(transferCompleteRequestMessage)),
  );

  transferCompleteRequestMessage.signature = messageSignature;

  sessionData.transferCompleteMessageHash = SHA256(
    JSON.stringify(transferCompleteRequestMessage),
  ).toString();

  sessionData.clientSignatureTransferCompleteMessage = messageSignature;

  odap.sessions.set(sessionID, sessionData);

  await odap.storeOdapLog({
    sessionID: sessionID,
    type: "init",
    operation: "complete",
    data: JSON.stringify(sessionData),
  });

  log.info(`${fnTag}, sending TransferCompleteRequest...`);

  if (!remote) {
    return transferCompleteRequestMessage;
  }

  await odap.makeRequest(
    sessionID,
    PluginOdapGateway.getOdapAPI(
      sessionData.recipientBasePath,
    ).phase3TransferCompleteRequestV1(transferCompleteRequestMessage),
    "TransferCompleteRequest",
  );
}
