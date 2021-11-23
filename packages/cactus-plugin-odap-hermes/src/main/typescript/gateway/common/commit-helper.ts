import { OdapGateway } from "../odap-gateway";
import { SHA256 } from "crypto-js";
import secp256k1 from "secp256k1";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  CommitFinalV1Request,
  CommitFinalV1Response,
  CommitPreparationV1Request,
  CommitPreparationV1Response,
} from "../../generated/openapi/typescript-axios";
import {
  EthContractInvocationType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-lock-evidence-helper",
});
export async function CommitPrepare(
  req: CommitPreparationV1Request,
  odap: OdapGateway,
): Promise<CommitPreparationV1Response> {
  const fnTag = `${odap.className}#CommitPrepare()`;
  log.info(
    `server gate way receive commit prepare request: ${JSON.stringify(req)}`,
  );
  const hashCommitPrepare = SHA256(JSON.stringify(req)).toString();
  await checkValidCommitPreparationRequest(req, req.sessionID, odap);

  const ack: CommitPreparationV1Response = {
    messageType: "urn:ietf:odap:msgtype:commit-prepare-ack-msg",
    clientIdentityPubkey: req.clientIdentityPubkey,
    serverIdentityPubkey: req.serverIdentityPubkey,
    hashCommitPrep: hashCommitPrepare,
    serverSignature: "",
  };
  ack.serverSignature = await odap.sign(JSON.stringify(ack), odap.privKey);
  storeDataAfterCommitPreparationRequest(req, ack, req.sessionID, odap);
  const sessionData = odap.sessions.get(req.sessionID);
  if (sessionData == undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID is not valid`);
  }
  sessionData.step = 0;
  await odap.odapLog(
    {
      phase: "commit-prepare",
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
async function checkValidCommitPreparationRequest(
  req: CommitPreparationV1Request,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitPreparationRequest()`;

  if (req.messageType != "urn:ietf:odap:msgtype:commit-prepare-msg") {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, wrong message type for commit prepare`);
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

  const isPrevAckHash: boolean =
    sessionData.lockEvidenceAckHash !== undefined &&
    sessionData.lockEvidenceAckHash == req.hashLockEvidenceAck;
  if (!isPrevAckHash) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, previous ack hash not match`);
  }
}
async function storeDataAfterCommitPreparationRequest(
  req: CommitPreparationV1Request,
  ack: CommitPreparationV1Response,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeDataAfterCommitPreparationRequest`;
  if (!odap.sessions.has(sessionID)) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID not exist`);
  }

  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, session data undefined`);
  }

  sessionData.commitPrepareReqHash = ack.hashCommitPrep;
  sessionData.commitPrepareAckHash = SHA256(JSON.stringify(ack)).toString();
  sessionData.clientSignatureForCommitPreparation = req.clientSignature;
  sessionData.serverSignatureForCommitPreparation = ack.serverSignature;
  odap.sessions.set(sessionID, sessionData);
}
export async function CommitFinal(
  req: CommitFinalV1Request,
  odap: OdapGateway,
): Promise<CommitFinalV1Response> {
  log.info(
    `server gate way receive commit final request: ${JSON.stringify(req)}`,
  );
  const fnTag = `${odap.className}#commitFinal()`;
  const hashCommitFinal = SHA256(JSON.stringify(req)).toString();
  await checkValidCommitFinalRequest(req, req.sessionID, odap);
  let besuCreateAssetProof = "";
  if (odap.besuApi != undefined) {
    const besuCreateRes = await odap.besuApi.invokeContractV1({
      contractName: odap.besuContractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      gas: 1000000,
      params: [odap.besuAssetID, 100], //the second is size, may need to pass this from client?
      signingCredential: odap.besuWeb3SigningCredential,
      keychainId: odap.besuKeychainId,
    } as BesuInvokeContractV1Request);
    if (besuCreateRes.status != 200) {
      await odap.Revert(req.sessionID);
      throw new Error(`${fnTag}, besu create asset error`);
    }
    const besuCreateResDataJson = JSON.parse(
      JSON.stringify(besuCreateRes.data),
    );
    if (besuCreateResDataJson.out == undefined) {
      throw new Error(`${fnTag}, besu res data out undefined`);
    }
    if (besuCreateResDataJson.out.transactionReceipt == undefined) {
      throw new Error(`${fnTag}, undefined besu transact receipt`);
    }
    const besuCreateAssetReceipt = besuCreateResDataJson.out.transactionReceipt;
    besuCreateAssetProof = JSON.stringify(besuCreateAssetReceipt);
    const besuCreateProofID = `${req.sessionID}-proof-of-create`;
    await odap.publishOdapProof(
      besuCreateProofID,
      JSON.stringify(besuCreateAssetReceipt),
    );
    const sessionData = odap.sessions.get(req.sessionID);
    if (sessionData == undefined) {
      await odap.Revert(req.sessionID);
      throw new Error(`${fnTag}, session data undefined`);
    }
    sessionData.isBesuAssetCreated = true;
  }
  const ack: CommitFinalV1Response = {
    messageType: "urn:ietf:odap:msgtype:commit-final-msg",
    serverIdentityPubkey: req.serverIdentityPubkey,
    commitAcknowledgementClaim: besuCreateAssetProof,
    hashCommitFinal: hashCommitFinal,
    serverSignature: "",
  };

  ack.serverSignature = await odap.sign(JSON.stringify(ack), odap.privKey);
  storeDataAfterCommitFinalRequest(req, ack, req.sessionID, odap);
  const sessionData = odap.sessions.get(req.sessionID);
  if (sessionData == undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID is not valid`);
  }
  sessionData.step = 0;
  await odap.odapLog(
    {
      phase: "commit-final",
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
async function checkValidCommitFinalRequest(
  req: CommitFinalV1Request,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#checkValidCommitFinalRequest()`;

  if (req.messageType != "urn:ietf:odap:msgtype:commit-final-msg") {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, wrong message type for commit final`);
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

  const isPrevAckHash: boolean =
    sessionData.commitPrepareAckHash !== undefined &&
    sessionData.commitPrepareAckHash == req.hashCommitPrepareAck;
  if (!isPrevAckHash) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, previous ack hash not match`);
  }
}
async function storeDataAfterCommitFinalRequest(
  req: CommitFinalV1Request,
  ack: CommitFinalV1Response,
  sessionID: string,
  odap: OdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeDataAfterCommitFinalRequest`;
  if (!odap.sessions.has(sessionID)) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, sessionID not exist`);
  }

  const sessionData = odap.sessions.get(sessionID);
  if (sessionData === undefined) {
    await odap.Revert(req.sessionID);
    throw new Error(`${fnTag}, session data undefined`);
  }
  sessionData.commitFinalClaim = req.commitFinalClaim;
  sessionData.commitAckClaim = ack.commitAcknowledgementClaim;
  sessionData.clientSignatureForCommitFinal = req.clientSignature;
  sessionData.serverSignatureForCommitFinal = ack.serverSignature;
  sessionData.commitFinalReqHash = ack.hashCommitFinal;
  sessionData.commitFinalAckHash = SHA256(JSON.stringify(ack)).toString();
  odap.sessions.set(sessionID, sessionData);
}
