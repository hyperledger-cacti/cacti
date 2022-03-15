import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";
import { SHA256 } from "crypto-js";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  CommitFinalV1Request,
  CommitFinalV1Response,
} from "../../generated/openapi/typescript-axios";
import {
  EthContractInvocationType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-lock-evidence-helper",
});

export async function commitFinal(
  request: CommitFinalV1Request,
  odap: PluginOdapGateway,
): Promise<CommitFinalV1Response> {
  const fnTag = `${odap.className}#commitFinal()`;
  log.info(
    `server gateway receives CommitFinalRequestMessage: ${JSON.stringify(
      request,
    )}`,
  );

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData == undefined || sessionData.step == undefined) {
    await odap.Revert(request.sessionID);
    throw new Error(
      `${fnTag}, session Id does not correspond to any open session`,
    );
  }

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "exec",
      operation: "commit-final",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );

  // Calculate the hash here to avoid changing the object and the hash
  const commitFinalRequestMessageHash = SHA256(
    JSON.stringify(request),
  ).toString();

  log.info(
    `CommitFinalRequestMessage hash is: ${commitFinalRequestMessageHash}`,
  );

  const besuCreateAssetProof = await checkValidCommitFinalRequest(
    request,
    odap,
  );

  const commitFinalResponseMessage: CommitFinalV1Response = {
    messageType: OdapMessageType.CommitFinalResponse,
    clientIdentityPubkey: request.clientIdentityPubkey,
    serverIdentityPubkey: request.serverIdentityPubkey,
    commitAcknowledgementClaim: besuCreateAssetProof,
    hashCommitFinal: commitFinalRequestMessageHash,
    serverSignature: "",
    sequenceNumber: request.sequenceNumber,
  };

  commitFinalResponseMessage.serverSignature = odap.bufArray2HexStr(
    await odap.sign(JSON.stringify(commitFinalResponseMessage)),
  );

  storeSessionData(request, commitFinalResponseMessage, odap);

  await odap.storeOdapLog(
    {
      phase: "p3",
      step: sessionData.step.toString(),
      type: "ack",
      operation: "commit-prepare",
      nodes: `${odap.pubKey}`,
    },
    `${sessionData.id}-${sessionData.step.toString()}`,
  );
  sessionData.step++;

  return commitFinalResponseMessage;
}

async function checkValidCommitFinalRequest(
  request: CommitFinalV1Request,
  odap: PluginOdapGateway,
): Promise<string> {
  const fnTag = `${odap.className}#checkValidCommitFinalRequest()`;

  if (request.messageType != OdapMessageType.CommitFinalRequest) {
    await odap.Revert(request.sessionID);
    throw new Error(`${fnTag}, wrong message type for CommitFinalRequest`);
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
    await odap.Revert(request.sessionID);
    throw new Error(
      `${fnTag}, CommitFinalRequest message signature verification failed`,
    );
  }
  request.clientSignature = signature;

  const sessionData = odap.sessions.get(request.sessionID);
  if (sessionData === undefined) {
    throw new Error(`${fnTag}, sessionID non exist`);
  }

  // We need to check somewhere if this phase is completed within the asset-lock duration.
  if (
    sessionData.commitPrepareResponseMessageHash != request.hashCommitPrepareAck
  ) {
    await odap.Revert(request.sessionID);
    throw new Error(`${fnTag}, previous message hash does not match`);
  }

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
      await odap.Revert(request.sessionID);
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
    const besuCreateProofID = `${request.sessionID}-proof-of-create`;

    await odap.publishOdapProof(
      besuCreateProofID,
      JSON.stringify(besuCreateAssetReceipt),
    );

    sessionData.isBesuAssetCreated = true;
  }

  odap.sessions.set(request.sessionID, sessionData);

  return besuCreateAssetProof;
}
async function storeSessionData(
  request: CommitFinalV1Request,
  response: CommitFinalV1Response,
  odap: PluginOdapGateway,
): Promise<void> {
  const fnTag = `${odap.className}#()storeDataAfterCommitFinalRequest`;
  const sessionData = odap.sessions.get(request.sessionID);

  if (sessionData == undefined) {
    throw new Error(`${fnTag}, session data is undefined`);
  }

  sessionData.commitFinalClaim = request.commitFinalClaim;

  sessionData.commitAcknowledgementClaim = response.commitAcknowledgementClaim;

  sessionData.clientSignatureCommitFinalRequestMessage =
    request.clientSignature;
  sessionData.serverSignatureCommitFinalResponseMessage =
    response.serverSignature;

  sessionData.commitFinalRequestMessageHash = response.hashCommitFinal;
  sessionData.commitFinalResponseMessageHash = SHA256(
    JSON.stringify(response),
  ).toString();

  odap.sessions.set(request.sessionID, sessionData);
}
