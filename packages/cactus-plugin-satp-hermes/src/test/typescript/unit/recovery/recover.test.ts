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
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { v4 as uuidV4 } from "uuid";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  IPluginSatpGatewayConstructorOptions,
  PluginSatpGateway,
} from "../../../../main/typescript/gateway/plugin-satp-gateway";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";

import { RecoverV1Message } from "../../../../main/typescript/public-api";
import { randomInt } from "crypto";
import { checkValidRecoverMessage } from "../../../../main/typescript/gateway/recovery/recover";

import { BesuSatpGateway } from "../../../../main/typescript/gateway/besu-satp-gateway";
import { FabricSatpGateway } from "../../../../main/typescript/gateway/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/gateway/server/server-helper";

import { knexClientConnection, knexServerConnection } from "../../knex.config";

const logLevel: LogLevelDesc = "TRACE";

let sourceGatewayConstructor: IPluginSatpGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginSatpGatewayConstructorOptions;

let pluginSourceGateway: PluginSatpGateway;
let pluginRecipientGateway: PluginSatpGateway;
let sessionID: string;

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

  sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexConfig: knexClientConnection,
  };
  recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexConfig: knexServerConnection,
  };
});

beforeEach(async () => {
  sessionID = uuidv4();
  sequenceNumber = randomInt(100);

  pluginSourceGateway = new FabricSatpGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSatpGateway(recipientGatewayConstructor);

  const sessionData = {
    lastSequenceNumber: sequenceNumber,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    step: 0,
    maxTimeout: 0,
    maxRetries: 0,
    rollbackProofs: [],
    sourceBasePath: "",
    recipientBasePath: "",
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);

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
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});

test("valid recover message request from client", async () => {
  const recoverMessage: RecoverV1Message = {
    sessionID: sessionID,
    odapPhase: "1",
    sequenceNumber: sequenceNumber,
    lastLogEntryTimestamp: "sometimestamp",
    signature: "",
    isBackup: false,
    newBasePath: "",
  };

  recoverMessage.signature = PluginSatpGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(recoverMessage)),
  );

  await checkValidRecoverMessage(recoverMessage, pluginRecipientGateway);
});

test("valid recover message request from server", async () => {
  const recoverMessage: RecoverV1Message = {
    sessionID: sessionID,
    odapPhase: "1",
    sequenceNumber: sequenceNumber,
    lastLogEntryTimestamp: "sometimestamp",
    signature: "",
    isBackup: false,
    newBasePath: "",
  };

  recoverMessage.signature = PluginSatpGateway.bufArray2HexStr(
    pluginRecipientGateway.sign(JSON.stringify(recoverMessage)),
  );

  await checkValidRecoverMessage(recoverMessage, pluginSourceGateway).catch(
    () => {
      throw new Error("Test failed");
    },
  );
});

test("recover message request from client with wrong signature", async () => {
  const recoverMessage: RecoverV1Message = {
    sessionID: sessionID,
    odapPhase: "1",
    sequenceNumber: sequenceNumber,
    lastLogEntryTimestamp: "sometimestamp",
    signature: "",
    isBackup: false,
    newBasePath: "",
  };

  recoverMessage.signature = PluginSatpGateway.bufArray2HexStr(
    pluginRecipientGateway.sign(JSON.stringify("wrongRecoverMessage")),
  );

  await checkValidRecoverMessage(recoverMessage, pluginSourceGateway)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});

afterAll(async () => {
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(ipfsServer);
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
