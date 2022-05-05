import http, { Server } from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { create } from "ipfs-http-client";
import bodyParser from "body-parser";
import express from "express";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { v4 as uuidV4 } from "uuid";
import { Configuration } from "@hyperledger/cactus-core-api";
import { PluginOdapGateway } from "../../../main/typescript/gateway/plugin-odap-gateway";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import {
  AssetProfile,
  ClientV1Request,
} from "../../../main/typescript/public-api";
import {
  checkValidInitializationResponse,
  sendTransferInitializationRequest,
} from "../../../main/typescript/gateway/client/transfer-initialization";
import {
  checkValidInitializationRequest,
  sendTransferInitializationResponse,
} from "../../../main/typescript/gateway/server/transfer-initialization";
import {
  checkValidTransferCommenceResponse,
  sendTransferCommenceRequest,
} from "../../../main/typescript/gateway/client/transfer-commence";
import {
  checkValidtransferCommenceRequest,
  sendTransferCommenceResponse,
} from "../../../main/typescript/gateway/server/transfer-commence";
import {
  checkValidLockEvidenceResponse,
  sendLockEvidenceRequest,
} from "../../../main/typescript/gateway/client/lock-evidence";
import {
  checkValidLockEvidenceRequest,
  sendLockEvidenceResponse,
} from "../../../main/typescript/gateway/server/lock-evidence";
import {
  checkValidCommitPreparationResponse,
  sendCommitPreparationRequest,
} from "../../../main/typescript/gateway/client/commit-preparation";
import {
  checkValidCommitPreparationRequest,
  sendCommitPreparationResponse,
} from "../../../main/typescript/gateway/server/commit-preparation";
import {
  checkValidCommitFinalResponse,
  sendCommitFinalRequest,
} from "../../../main/typescript/gateway/client/commit-final";
import {
  checkValidCommitFinalRequest,
  sendCommitFinalResponse,
} from "../../../main/typescript/gateway/server/commit-final";
import { sendTransferCompleteRequest } from "../../../main/typescript/gateway/client/transfer-complete";
import { checkValidTransferCompleteRequest } from "../../../main/typescript/gateway/server/transfer-complete";
import { makeSessionDataChecks } from "../make-checks";
import { knexClientConnection, knexServerConnection } from "../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const logLevel: LogLevelDesc = "TRACE";

let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;

let ipfsContainer: GoIpfsTestContainer;
let ipfsServer: Server;
let ipfsApiHost: string;

beforeAll(async () => {
  ipfsContainer = new GoIpfsTestContainer({ logLevel });
  expect(ipfsContainer).not.toBeUndefined();

  const container = await ipfsContainer.start();
  expect(container).not.toBeUndefined();

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  ipfsServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server: ipfsServer,
  };

  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  ipfsApiHost = `http://${address}:${port}`;

  const config = new Configuration({ basePath: ipfsApiHost });
  const apiClient = new ObjectStoreIpfsApi(config);

  expect(apiClient).not.toBeUndefined();

  const ipfsApiUrl = await ipfsContainer.getApiUrl();

  const ipfsClientOrOptions = create({
    url: ipfsApiUrl,
  });

  const instanceId = uuidv4();
  const pluginIpfs = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId,
    ipfsClientOrOptions,
  });

  await pluginIpfs.getOrCreateWebServices();
  await pluginIpfs.registerWebServices(expressApp);
});

test("successful run ODAP instance", async () => {
  const sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexClientConnection,
  };
  const recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexServerConnection,
  };

  pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new PluginOdapGateway(recipientGatewayConstructor);

  expect(pluginSourceGateway.database).not.toBeUndefined();
  expect(pluginRecipientGateway.database).not.toBeUndefined();

  await pluginSourceGateway.database?.migrate.rollback();
  await pluginSourceGateway.database?.migrate.latest();
  await pluginRecipientGateway.database?.migrate.rollback();
  await pluginRecipientGateway.database?.migrate.latest();

  const dummyPath = { apiHost: "dummyPath" };

  const expiryDate = new Date(2060, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };

  const odapClientRequest: ClientV1Request = {
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
  };

  const sessionID = pluginSourceGateway.configureOdapSession(odapClientRequest);

  const transferInitializationRequest = await sendTransferInitializationRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (transferInitializationRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidInitializationRequest(
    transferInitializationRequest,
    pluginRecipientGateway,
  );

  const transferInitializationResponse = await sendTransferInitializationResponse(
    transferInitializationRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (transferInitializationResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidInitializationResponse(
    transferInitializationResponse,
    pluginSourceGateway,
  );

  const transferCommenceRequest = await sendTransferCommenceRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (transferCommenceRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  );

  const transferCommenceResponse = await sendTransferCommenceResponse(
    transferCommenceRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (transferCommenceResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.lockFabricAsset(sessionID);

  const lockEvidenceRequest = await sendLockEvidenceRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (lockEvidenceRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidLockEvidenceRequest(
    lockEvidenceRequest,
    pluginRecipientGateway,
  );

  const lockEvidenceResponse = await sendLockEvidenceResponse(
    lockEvidenceRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (lockEvidenceResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
  );

  const commitPreparationRequest = await sendCommitPreparationRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (commitPreparationRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidCommitPreparationRequest(
    commitPreparationRequest,
    pluginRecipientGateway,
  );

  const commitPreparationResponse = await sendCommitPreparationResponse(
    lockEvidenceRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (commitPreparationResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidCommitPreparationResponse(
    commitPreparationResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.deleteFabricAsset(sessionID);

  const commitFinalRequest = await sendCommitFinalRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (commitFinalRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidCommitFinalRequest(
    commitFinalRequest,
    pluginRecipientGateway,
  );

  await pluginRecipientGateway.createBesuAsset(sessionID);

  const commitFinalResponse = await sendCommitFinalResponse(
    lockEvidenceRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (commitFinalResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway);

  const transferCompleteRequest = await sendTransferCompleteRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (transferCompleteRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidTransferCompleteRequest(
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
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(ipfsServer);
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
