import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  LockEvidenceV1Request,
  LockEvidenceV1Response,
  TransferCommenceV1Request,
  TransferCommenceV1Response,
} from "../../generated/openapi/typescript-axios";
import { OdapGateway } from "../odap-gateway";
import { SHA256 } from "crypto-js";
import secp256k1 from "secp256k1";
const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-lock-evidence-helper",
});
export async function lockEvidenceTransferCommence(
  req: TransferCommenceV1Request,
  odap: OdapGateway,
): Promise<TransferCommenceV1Response> {
  const fnTag = `${odap.className}#lockEvidenceTransferCommence()`;
  log.info(
    `server gate way receive lock evidence transfer commence request: ${JSON.stringify(
      req,
    )}`,
  );
  const commenceReqHash = SHA256(JSON.stringify(req)).toString();
  await checkValidtransferCommenceRequest(req, req.sessionID, odap);

  const ack: TransferCommenceV1Response = {
    messageType: "urn:ietf:odap:msgtype:transfer-commenceack-msg",
    clientIdentityPubkey: req.clientIdentityPubkey,
    serverIdentityPubkey: req.serverIdentityPubkey,
    hashCommenceRequest: commenceReqHash,
    serverSignature: "",
  };
  const serverSignature = await odap.odapGatewaySign(JSON.stringify(ack));
  ack.serverSignature = odap.bufArray2HexStr(serverSignature);
  await storeDataAfterTransferCommence(req, ack, req.sessionID, odap);
  const sessionData = odap.sessions.get(req.sessionID);
  if (sessionData == undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID is not valid`);
  }
  sessionData.step = 0;
  await odap.odapLog(
    {
      phase: "transfer-commence",
      operation: "prepare-ack",
      step: sessionData.step.toString(),
      nodes: `${odap.pubKey}->${req.clientIdentityPubkey}`,
    },
    `${req.sessionID}-${sessionData.step.toString()}`,
  );
  sessionData.step++;
  odap.sessions.set(req.sessionID, sessionData);
  return ack;
}

async function checkValidtransferCommenceRequest(
  req: TransferCommenceV1Request,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidtransferCommenceRequest()`;
  if (req.messageType != "urn:ietf:odap:msgtype:transfer-commence-msg") {
    throw new Error(`${fnTag}, wrong message type for transfer commence`);
  }

  const clientSignature = new Uint8Array(
    Buffer.from(req.clientSignature, "hex"),
  );
  const clientPubkey = new Uint8Array(
    Buffer.from(req.clientIdentityPubkey, "hex"),
  );
  log.info(JSON.stringify(req));
  const reqForClientSignatureVerification = req;
  reqForClientSignatureVerification.clientSignature = "";
  if (
    !secp256k1.ecdsaVerify(
      clientSignature,
      Buffer.from(
        SHA256(JSON.stringify(reqForClientSignatureVerification)).toString(),
        "hex",
      ),
      clientPubkey,
    )
  ) {
    throw new Error(`${fnTag}, signature verify failed`);
  }

  if (!odap.supportedDltIDs.includes(req.senderDltSystem)) {
    throw new Error(
      `${fnTag}, sender dlt system is not supported in this gateway`,
    );
  }

  if (!odap.supportedDltIDs.includes(req.recipientDltSystem)) {
    throw new Error(
      `${fnTag}, recipient dlt system is not supported in this gateway`,
    );
  }

  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    throw new Error(`${fnTag}, sessionID non exist`);
  }

  const isPrevMsgHash: boolean =
    sessionData.initializationMsgHash !== undefined &&
    sessionData.initializationMsgHash == req.hashPrevMessage;
  if (!isPrevMsgHash) {
    throw new Error(`${fnTag}, previous message hash not match`);
  }

  if (sessionData.assetProfile === undefined) {
    throw new Error(`${fnTag}, assetProfile not sent from previous request`);
  }

  const assetProfileHash = SHA256(
    JSON.stringify(sessionData.assetProfile),
  ).toString();
  const isAssetProfileHashMatch = assetProfileHash === req.hashAssetProfile;
  if (!isAssetProfileHashMatch) {
    throw new Error(`${fnTag}, assetProfile hash not match`);
  }
}
async function storeDataAfterTransferCommence(
  msg: TransferCommenceV1Request,
  ack: TransferCommenceV1Response,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeDataAfterTransferCommence`;
  if (!odap.sessions.has(sessionID)) {
    throw new Error(`${fnTag}, sessionID not exist`);
  }

  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    throw new Error(`${fnTag}, session data undefined`);
  }

  sessionData.clientDltSystem = msg.senderDltSystem;
  sessionData.serverDltSystem = msg.recipientDltSystem;

  sessionData.clientSignatureForCommenceReq = msg.clientSignature;
  sessionData.serverSignatureForCommenceAck = ack.serverSignature;

  sessionData.originatorPubkey = msg.originatorPubkey;
  sessionData.beneficiaryPubkey = msg.beneficiaryPubkey;
  sessionData.serverIdentityPubkey = msg.serverIdentityPubkey;
  sessionData.clientIdentityPubkey = msg.clientIdentityPubkey;

  sessionData.commenceReqHash = ack.hashCommenceRequest;
  sessionData.commenceAckHash = SHA256(JSON.stringify(ack)).toString();

  odap.sessions.set(sessionID, sessionData);
}

export async function lockEvidence(
  req: LockEvidenceV1Request,
  odap: OdapGateway,
): Promise<LockEvidenceV1Response> {
  const fnTag = `${odap.className}#lockEvidence()`;
  log.info(
    `server gate way receive lock evidence request: ${JSON.stringify(req)}`,
  );
  const lockEvidenceReqHash = SHA256(JSON.stringify(req)).toString();
  await checkValidLockEvidenceRequest(req, req.sessionID, odap);

  const ack: LockEvidenceV1Response = {
    messageType: "urn:ietf:odap:msgtype:lock-evidence-req-msg",
    clientIdentityPubkey: req.clientIdentityPubkey,
    serverIdentityPubkey: req.serverIdentityPubkey,
    hashLockEvidenceRequest: lockEvidenceReqHash,
    serverSignature: "",
  };
  const serverSignature = await odap.odapGatewaySign(JSON.stringify(ack));
  ack.serverSignature = odap.bufArray2HexStr(serverSignature);
  await storeDataAfterLockEvidenceRequest(req, ack, req.sessionID, odap);
  const sessionData = odap.sessions.get(req.sessionID);
  if (sessionData == undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID is not valid`);
  }
  sessionData.step = 0;
  await odap.odapLog(
    {
      phase: "lock-evidence",
      operation: "prepare-ack",
      step: sessionData.step.toString(),
      nodes: `${odap.pubKey}->${req.clientIdentityPubkey}`,
    },
    `${req.sessionID}-${sessionData.step.toString()}`,
  );
  sessionData.step++;
  odap.sessions.set(req.sessionID, sessionData);
  return ack;
}
async function checkValidLockEvidenceRequest(
  req: LockEvidenceV1Request,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidLockEvidenceRequest()`;

  if (req.messageType != "urn:ietf:odap:msgtype:lock-evidence-req-msg") {
    await odap.Revert(sessionID);
    throw new Error(`${fnTag}, wrong message type for lock evidence`);
  }

  const clientSignature = new Uint8Array(
    Buffer.from(req.clientSignature, "hex"),
  );

  const clientPubkey = new Uint8Array(
    Buffer.from(req.clientIdentityPubkey, "hex"),
  );

  const reqForClientSignatureVerification = req;
  reqForClientSignatureVerification.clientSignature = "";
  if (
    !secp256k1.ecdsaVerify(
      clientSignature,
      Buffer.from(
        SHA256(JSON.stringify(reqForClientSignatureVerification)).toString(),
        `hex`,
      ),
      clientPubkey,
    )
  ) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, signature verify failed`);
  }

  const isLockEvidenceClaimValid = await checkValidLockEvidenceClaim(
    req.lockEvidenceClaim,
  );
  if (!isLockEvidenceClaimValid) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag} invalid of server identity pubkey`);
  }
  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID non exist`);
  }

  const isPrevAckHash: boolean =
    sessionData.commenceAckHash !== undefined &&
    sessionData.commenceAckHash == req.hashCommenceAckRequest;
  if (!isPrevAckHash) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, previous ack hash not match`);
  }
}

async function checkValidLockEvidenceClaim(
  lockEvidenceClaim: string,
): Promise<boolean> {
  return lockEvidenceClaim !== undefined;
}
async function storeDataAfterLockEvidenceRequest(
  req: LockEvidenceV1Request,
  ack: LockEvidenceV1Response,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeDataAfterLockEvidenceRequest`;
  if (!odap.sessions.has(sessionID)) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID not exist`);
  }

  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, session data undefined`);
  }

  sessionData.lockEvidenceClaim = req.lockEvidenceClaim;
  sessionData.clientSignatureForLockEvidence = req.clientSignature;
  sessionData.lockEvidenceAckHash = SHA256(JSON.stringify(ack)).toString();
  sessionData.serverSignatureForLockEvidence = ack.serverSignature;

  odap.sessions.set(sessionID, sessionData);
}
