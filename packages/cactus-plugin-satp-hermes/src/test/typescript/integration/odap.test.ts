import "jest-extended";
import { v4 as uuidV4 } from "uuid";
import { PluginSATPGateway } from "../../../main/typescript/plugin-satp-gateway";

import {
  AssetProfile,
  ClientV1Request,
} from "../../../main/typescript/public-api";
import { makeSessionDataChecks } from "../make-checks";

import { BesuSATPGateway } from "../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../main/typescript/core/server-helper";
import { knexRemoteConnection } from "../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;

test("successful run ODAP instance", async () => {
  console.log(knexRemoteConnection)
  const sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexRemoteConfig: knexRemoteConnection,
  };
  const recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexRemoteConfig: knexRemoteConnection,
  };

  pluginSourceGateway = new FabricSATPGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSATPGateway(recipientGatewayConstructor);

  expect(pluginSourceGateway.localRepository?.database).not.toBeUndefined();
  expect(pluginRecipientGateway.localRepository?.database).not.toBeUndefined();

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();

  const dummyPath = { apiHost: "dummyPath" };

  const expiryDate = new Date(2060, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };

  const clientRequest: ClientV1Request = {
    clientGatewayConfiguration: dummyPath,
    serverGatewayConfiguration: dummyPath,
    version: "0.0.0",
    loggingProfile: "dummyLoggingProfile",
    accessControlProfile: "dummyAccessControlProfile",
    applicationProfile: "dummyApplicationProfile",
    payloadProfile: {
      assetProfile: assetProfile,
      capabilities: "",
    },
    assetProfile: assetProfile,
    assetControlProfile: "dummyAssetControlProfile",
    beneficiaryPubkey: "dummyPubKey",
    clientDltSystem: "DLT1",
    originatorPubkey: "dummyPubKey",
    recipientGatewayDltSystem: "DLT2",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    serverDltSystem: "DLT2",
    sourceGatewayDltSystem: "DLT1",
    clientIdentityPubkey: "",
    serverIdentityPubkey: "",
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    sourceLedgerAssetID: uuidV4(),
    recipientLedgerAssetID: uuidV4(),
  };

  const sessionID = pluginSourceGateway.configureOdapSession(clientRequest);

  const transferInitializationRequest =
    await pluginSourceGateway.clientHelper.sendTransferInitializationRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (transferInitializationRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidInitializationRequest(
    transferInitializationRequest,
    pluginRecipientGateway,
  );

  const transferInitializationResponse =
    await pluginRecipientGateway.serverHelper.sendTransferInitializationResponse(
      transferInitializationRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (transferInitializationResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidInitializationResponse(
    transferInitializationResponse,
    pluginSourceGateway,
  );

  const transferCommenceRequest =
    await pluginSourceGateway.clientHelper.sendTransferCommenceRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (transferCommenceRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  );

  const transferCommenceResponse =
    await pluginRecipientGateway.serverHelper.sendTransferCommenceResponse(
      transferCommenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (transferCommenceResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.lockAsset(sessionID);

  const lockEvidenceRequest =
    await pluginSourceGateway.clientHelper.sendLockEvidenceRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (lockEvidenceRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidLockEvidenceRequest(
    lockEvidenceRequest,
    pluginRecipientGateway,
  );

  const lockEvidenceResponse =
    await pluginRecipientGateway.serverHelper.sendLockEvidenceResponse(
      lockEvidenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (lockEvidenceResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
  );

  const commitPreparationRequest =
    await pluginSourceGateway.clientHelper.sendCommitPreparationRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (commitPreparationRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidCommitPreparationRequest(
    commitPreparationRequest,
    pluginRecipientGateway,
  );

  const commitPreparationResponse =
    await pluginRecipientGateway.serverHelper.sendCommitPreparationResponse(
      lockEvidenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (commitPreparationResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidCommitPreparationResponse(
    commitPreparationResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.deleteAsset(sessionID);

  const commitFinalRequest =
    await pluginSourceGateway.clientHelper.sendCommitFinalRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (commitFinalRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidCommitFinalRequest(
    commitFinalRequest,
    pluginRecipientGateway,
  );

  await pluginRecipientGateway.createAsset(sessionID);

  const commitFinalResponse =
    await pluginRecipientGateway.serverHelper.sendCommitFinalResponse(
      lockEvidenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (commitFinalResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidCommitFinalResponse(
    commitFinalResponse,
    pluginSourceGateway,
  );

  const transferCompleteRequest =
    await pluginSourceGateway.clientHelper.sendTransferCompleteRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (transferCompleteRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidTransferCompleteRequest(
    transferCompleteRequest,
    pluginRecipientGateway,
  );

  expect(pluginSourceGateway.sessions.size).toBe(1);
  expect(pluginRecipientGateway.sessions.size).toBe(1);

  const [sessionId] = pluginSourceGateway.sessions.keys();

  await makeSessionDataChecks(
    pluginSourceGateway,
    pluginRecipientGateway,
    sessionId,
  );
});

afterAll(async () => {
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
  pluginSourceGateway.remoteRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
});
