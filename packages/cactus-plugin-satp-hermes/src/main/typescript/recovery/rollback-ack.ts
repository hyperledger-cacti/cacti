import { RollbackAckV1Message } from "../generated/openapi/typescript-axios";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { PluginSATPGateway } from "../plugin-satp-gateway";
// import { SHA256 } from "crypto-js";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "rollback-ack-helper",
});

export async function sendRollbackAckMessage(
  sessionID: string,
  gateway: PluginSATPGateway,
  remote: boolean,
): Promise<void | RollbackAckV1Message> {
  const fnTag = `${gateway.className}#sendRollbackAckMessage()`;

  const sessionData = gateway.sessions.get(sessionID);

  if (
    sessionData == undefined ||
    sessionData.maxTimeout == undefined ||
    sessionData.maxRetries == undefined ||
    sessionData.rollbackProofs == undefined ||
    sessionData.sourceBasePath == undefined ||
    sessionData.recipientBasePath == undefined ||
    sessionData.rollbackActionsPerformed == undefined
  ) {
    throw new Error(`${fnTag}, session data is not correctly initialized`);
  }

  const rollbackAckMessage: RollbackAckV1Message = {
    sessionID: sessionID,
    success: true,
    signature: "",
  };

  const signature = PluginSATPGateway.bufArray2HexStr(
    gateway.sign(JSON.stringify(rollbackAckMessage)),
  );

  rollbackAckMessage.signature = signature;

  log.info(`${fnTag}, sending Rollback Ack message...`);

  if (!remote) {
    return rollbackAckMessage;
  }

  await gateway.makeRequest(
    sessionID,
    PluginSATPGateway.getSatpAPI(
      gateway.isClientGateway(sessionID)
        ? sessionData.recipientBasePath
        : sessionData.sourceBasePath,
    ).rollbackAckV1Message(rollbackAckMessage),
    "RollbackAck",
  );
}

export async function checkValidRollbackAckMessage(
  response: RollbackAckV1Message,
  gateway: PluginSATPGateway,
): Promise<void> {
  const fnTag = `${gateway.className}#checkValidRollbackAckMessage`;

  const sessionID = response.sessionID;
  const sessionData = gateway.sessions.get(sessionID);
  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  const pubKey = gateway.isClientGateway(response.sessionID)
    ? sessionData.recipientGatewayPubkey
    : sessionData.sourceGatewayPubkey;

  if (pubKey == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  // if (response.messageType != SatpMessageType.CommitFinalResponse) {
  //   throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
  // }

  if (!gateway.verifySignature(response, pubKey)) {
    throw new Error(
      `${fnTag}, RollbackAckMessage message signature verification failed`,
    );
  }

  log.info(`RollbackAckMessage passed all checks.`);
}
