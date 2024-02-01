import http, { Server } from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
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
import { PluginSatpGateway } from "../../../../main/typescript/gateway/plugin-satp-gateway";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";

import {
  RecoverSuccessV1Message,
  SessionData,
} from "../../../../main/typescript/public-api";
import { randomInt } from "crypto";
import { checkValidRecoverSuccessMessage } from "../../../../main/typescript/gateway/recovery/recover-success";
import { BesuSatpGateway } from "../../../../main/typescript/gateway/besu-satp-gateway";
import { FabricSatpGateway } from "../../../../main/typescript/gateway/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/gateway/server/server-helper";

import { knexClientConnection, knexServerConnection } from "../../knex.config";

const logLevel: LogLevelDesc = "TRACE";

let pluginSourceGateway: PluginSatpGateway;
let pluginRecipientGateway: PluginSatpGateway;
let sessionID: string;
let sessionData: SessionData;

let ipfsContainer: GoIpfsTestContainer;
let ipfsServer: Server;
let ipfsApiHost: string;

let sequenceNumber: number;

beforeAll(async () => {
  ipfsContainer = new GoIpfsTestContainer({ logLevel });
  expect(ipfsContainer).not.toBeUndefined();

  const container = await ipfsContainer.start();
  expect(container).not.toBeUndefined();

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  ipfsServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
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
  // t.comment(`Go IPFS Test Container API URL: ${ipfsApiUrl}`);

  const kuboRpcModule = await import("kubo-rpc-client");
  const ipfsClientOrOptions = kuboRpcModule.create({
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

beforeEach(async () => {
  const sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexConfig: knexClientConnection,
  };
  const recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexConfig: knexServerConnection,
  };

  pluginSourceGateway = new FabricSatpGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSatpGateway(recipientGatewayConstructor);

  if (
    pluginSourceGateway.database == undefined ||
    pluginRecipientGateway.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.database.migrate.rollback();
  await pluginSourceGateway.database.migrate.latest();
  await pluginRecipientGateway.database.migrate.rollback();
  await pluginRecipientGateway.database.migrate.latest();

  sessionID = uuidv4();
  sequenceNumber = randomInt(100);

  sessionData = {
    lastSequenceNumber: sequenceNumber,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("valid recover success message from client", async () => {
  const recoverSuccessMessage: RecoverSuccessV1Message = {
    sessionID: sessionID,
    signature: "",
    success: true,
  };

  recoverSuccessMessage.signature = PluginSatpGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(recoverSuccessMessage)),
  );

  await checkValidRecoverSuccessMessage(
    recoverSuccessMessage,
    pluginRecipientGateway,
  );
});

test("valid recover success message from server", async () => {
  const recoverSuccessMessage: RecoverSuccessV1Message = {
    sessionID: sessionID,
    signature: "",
    success: true,
  };

  recoverSuccessMessage.signature = PluginSatpGateway.bufArray2HexStr(
    pluginRecipientGateway.sign(JSON.stringify(recoverSuccessMessage)),
  );

  await checkValidRecoverSuccessMessage(
    recoverSuccessMessage,
    pluginSourceGateway,
  ).catch(() => {
    throw new Error("Test failed");
  });
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});

afterAll(async () => {
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(ipfsServer);
});
