import {
  TransferInitializationV1Request,
  TransferInitializationV1Response,
  SessionData,
} from "../../generated/openapi/typescript-axios";
import secp256k1 from "secp256k1";
import { v4 as uuidV4 } from "uuid";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { OdapGateway } from "../odap-gateway";
import { SHA256 } from "crypto-js";
import { time } from "console";
const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-initiate-transfer-helper",
});
export async function initiateTransfer(
  req: TransferInitializationV1Request,
  odap: OdapGateway,
): Promise<TransferInitializationV1Response> {
  log.info(
    `server gate way receive initiate transfer request: ${JSON.stringify(req)}`,
  );
  const sessionID = uuidV4();
  const sessionData: SessionData = {};
  sessionData.step = 0;
  await odap.odapLog(
    {
      phase: "initiateTransfer",
      operation: "init",
      step: sessionData.step.toString(),
      nodes: `${req.sourceGatewayPubkey}->${odap.pubKey}`,
    },
    `${sessionID}-${sessionData.step.toString()}`,
  );
  sessionData.step++;
  odap.sessions.set(sessionID, sessionData);
  const recvTimestamp: string = time.toString();
  const InitializationRequestMessageHash = SHA256(
    JSON.stringify(req),
  ).toString();
  await checkValidInitializationRequest(req, odap);

  const processedTimestamp: string = time.toString();

  const ack: TransferInitializationV1Response = {
    sessionID: sessionID,
    initialRequestMessageHash: InitializationRequestMessageHash,
    timeStamp: recvTimestamp,
    processedTimeStamp: processedTimestamp,
    serverIdentityPubkey: odap.pubKey,
  };
  await storeDataAfterInitializationRequest(req, ack, sessionID, odap);
  return ack;
}

export async function checkValidInitializationRequest(
  req: TransferInitializationV1Request,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidInitializationRequest()`;
  const strSignature = req.initializationRequestMessageSignature;
  const sourceSignature = new Uint8Array(Buffer.from(strSignature, "hex"));
  const sourcePubkey = new Uint8Array(
    Buffer.from(req.sourceGatewayPubkey, "hex"),
  );

  req.initializationRequestMessageSignature = "";
  if (
    !secp256k1.ecdsaVerify(
      sourceSignature,
      Buffer.from(SHA256(JSON.stringify(req)).toString(), "hex"),
      sourcePubkey,
    )
  ) {
    throw new Error(`${fnTag}, signature verify failed`);
  }
  req.initializationRequestMessageSignature = strSignature;
  if (!odap.supportedDltIDs.includes(req.sourceGateWayDltSystem)) {
    throw new Error(
      `${fnTag}, source gate way dlt system is not supported in this gateway`,
    );
  }

  if (!odap.supportedDltIDs.includes(req.recipientGateWayDltSystem)) {
    throw new Error(
      `${fnTag}, recipient gate way dlt system is not supported in this gateway`,
    );
  }
  const expiryDate: string = req.payloadProfile.assetProfile.expirationDate;
  const isDataExpire: boolean = Date.now().toString() >= expiryDate;
  if (isDataExpire) {
    throw new Error(`${fnTag}, asset has expired`);
  }
}
export async function storeDataAfterInitializationRequest(
  msg: TransferInitializationV1Request,
  ack: TransferInitializationV1Response,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const sessionData = odap.sessions.get(sessionID);
  const fnTag = `${odap.className}#storeDataAfterInitializationRequest`;
  if (sessionData == undefined) {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, session data is undefined`);
  }
  sessionData.initializationMsgHash = SHA256(JSON.stringify(msg)).toString();

  sessionData.initializationRequestMsgSignature =
    msg.initializationRequestMessageSignature;
  sessionData.sourceGateWayPubkey = msg.sourceGatewayPubkey;
  sessionData.sourceGateWayDltSystem = msg.sourceGateWayDltSystem;
  sessionData.recipientGateWayPubkey = msg.recipientGateWayPubkey;
  sessionData.recipientGateWayDltSystem = msg.recipientGateWayDltSystem;
  sessionData.applicationProfile = msg.applicationProfile;
  sessionData.accessControlProfile = msg.accessControlProfile;
  sessionData.loggingProfile = msg.loggingProfile;
  sessionData.assetProfile = msg.payloadProfile.assetProfile;
  sessionData.initialMsgRcvTimeStamp = ack.timeStamp;
  sessionData.initialMsgProcessedTimeStamp = ack.processedTimeStamp;
  odap.sessions.set(sessionID, sessionData);
}
