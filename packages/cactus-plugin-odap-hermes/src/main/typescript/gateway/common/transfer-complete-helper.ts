import { OdapGateway } from "../odap-gateway";
import { SHA256 } from "crypto-js";
import secp256k1 from "secp256k1";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  TransferCompleteV1Request,
  TransferCompleteV1Response,
} from "../../generated/openapi/typescript-axios";
const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-transfer-complete-helper",
});
export async function TransferComplete(
  req: TransferCompleteV1Request,
  odap: OdapGateway,
): Promise<TransferCompleteV1Response> {
  log.info(
    `server gate way receive transfer complete request: ${JSON.stringify(req)}`,
  );
  await CheckValidTransferCompleteRequest(req, req.sessionID, odap);
  log.info("transfer is complete");
  return { ok: "true" };
}
async function CheckValidTransferCompleteRequest(
  req: TransferCompleteV1Request,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidTransferCompleteRequest()`;

  if (req.messageType != "urn:ietf:odap:msgtype:commit-transfer-complete-msg") {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, wrong message type for transfer complete`);
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

  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID non exist`);
  }

  const isCommmitFinalAckHash: boolean =
    sessionData.commitFinalAckHash !== undefined &&
    sessionData.commitFinalAckHash == req.hashCommitFinalAck;
  if (!isCommmitFinalAckHash) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, previous commit final ack hash not match`);
  }

  const isTransferCommenceHash: boolean =
    sessionData.commenceReqHash !== undefined &&
    sessionData.commenceReqHash == req.hashTransferCommence;
  if (!isTransferCommenceHash) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, previous transfer commence hash not match`);
  }
}
