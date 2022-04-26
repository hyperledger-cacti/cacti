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
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { v4 as uuidV4 } from "uuid";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  IPluginOdapGatewayConstructorOptions,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import {
  OdapLocalLog,
  SessionData,
} from "../../../../main/typescript/public-api";
import { SHA256 } from "crypto-js";
import { knexClientConnection, knexServerConnection } from "../../knex.config";

const logLevel: LogLevelDesc = "TRACE";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;

let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let sessionID: string;
let step: number;
let type: string;
let type2: string;
let type3: string;
let type4: string;
let operation: string;
let odapLog: OdapLocalLog;
let odapLog2: OdapLocalLog;
let odapLog3: OdapLocalLog;
let odapLog4: OdapLocalLog;
let sessionData: SessionData;

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

  sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    knexConfig: knexClientConnection,
  };

  recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    knexConfig: knexServerConnection,
  };
});

beforeEach(async () => {
  sessionID = uuidv4();
  step = 3;
  type = "type1";
  operation = "operation1";

  pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new PluginOdapGateway(recipientGatewayConstructor);

  sessionData = {
    id: sessionID,
    step: step,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
  };

  odapLog = {
    sessionID: sessionID,
    type: type,
    operation: operation,
    data: JSON.stringify(sessionData),
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

test("successful translation of log keys", async () => {
  expect(PluginOdapGateway.getOdapLogKey(sessionID, type, operation)).toBe(
    `${sessionID}-${type}-${operation}`,
  );
});

test("successful logging of proof to ipfs and sqlite", async () => {
  const claim = "claim";
  const odapLogKey = PluginOdapGateway.getOdapLogKey(
    sessionID,
    "proof",
    "lock",
  );

  await pluginSourceGateway.storeOdapProof({
    sessionID,
    type: "proof",
    operation: "lock",
    data: claim,
  });

  const retrievedLogIPFS = await pluginSourceGateway.getLogFromIPFS(odapLogKey);
  const retrievedLogDB = await pluginSourceGateway.getLogFromDatabase(
    odapLogKey,
  );

  if (retrievedLogDB == undefined || retrievedLogIPFS == undefined) {
    throw new Error("Test Failed");
  }

  expect(retrievedLogIPFS.key).toBe(odapLogKey);
  expect(retrievedLogDB.key).toBe(odapLogKey);
  expect(retrievedLogIPFS.hash).toBe(SHA256(claim).toString());
  expect(
    pluginRecipientGateway.verifySignature(
      retrievedLogIPFS,
      pluginSourceGateway.pubKey,
    ),
  ).toBe(true);

  expect(1).toBe(1);
});

test("successful logging to ipfs and sqlite", async () => {
  const odapLogKey = PluginOdapGateway.getOdapLogKey(
    sessionID,
    type,
    operation,
  );

  await pluginSourceGateway.storeOdapLog(odapLog);

  const retrievedLogIPFS = await pluginSourceGateway.getLogFromIPFS(odapLogKey);
  const retrievedLogDB = await pluginSourceGateway.getLogFromDatabase(
    odapLogKey,
  );

  if (
    retrievedLogIPFS == undefined ||
    retrievedLogDB == undefined ||
    retrievedLogDB.data == undefined ||
    odapLog.data == undefined
  ) {
    throw new Error("Test failed");
  }

  expect(retrievedLogIPFS.signerPubKey).toBe(pluginSourceGateway.pubKey);
  expect(retrievedLogIPFS.hash).toBe(
    SHA256(
      JSON.stringify(odapLog, [
        "sessionID",
        "type",
        "key",
        "operation",
        "timestamp",
        "data",
      ]),
    ).toString(),
  );
  expect(retrievedLogIPFS.key).toBe(odapLogKey);

  expect(retrievedLogDB.type).toBe(odapLog.type);
  expect(retrievedLogDB.operation).toBe(odapLog.operation);
  expect(retrievedLogDB.data).toBe(odapLog.data);

  expect(retrievedLogDB.timestamp).toBe(odapLog.timestamp);
  expect(retrievedLogDB.type).toBe(odapLog.type);
  expect(retrievedLogDB.operation).toBe(odapLog.operation);
  expect(retrievedLogDB.sessionID).toBe(odapLog.sessionID);
  expect(retrievedLogDB.key).toBe(odapLogKey);
});

test("successful retrieval of last log", async () => {
  type2 = type + "2";
  type3 = type + "3";

  odapLog2 = {
    sessionID: sessionID,
    type: type2,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  odapLog3 = {
    sessionID: sessionID,
    type: type3,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  await pluginSourceGateway.storeOdapLog(odapLog2);
  await pluginSourceGateway.storeOdapLog(odapLog3);

  const lastLog = await pluginSourceGateway.getLastLogFromDatabase(sessionID);

  if (
    lastLog == undefined ||
    odapLog3 == undefined ||
    lastLog.data == undefined ||
    odapLog3.data == undefined
  ) {
    throw new Error("Test failed");
  }

  expect(lastLog.type).toBe(odapLog3.type);
  expect(lastLog.operation).toBe(odapLog3.operation);
  expect(lastLog.data).toBe(odapLog3.data);

  expect(lastLog.timestamp).toBe(odapLog3.timestamp);
  expect(lastLog.type).toBe(odapLog3.type);
  expect(lastLog.operation).toBe(odapLog3.operation);
  expect(lastLog.sessionID).toBe(odapLog3.sessionID);
  expect(lastLog.key).toBe(
    PluginOdapGateway.getOdapLogKey(sessionID, type3, operation),
  );
});

test("successful retrieval of logs more recent than another log", async () => {
  type2 = type + "2";
  type3 = type + "3";

  odapLog2 = {
    sessionID: sessionID,
    type: type2,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  odapLog3 = {
    sessionID: sessionID,
    type: type3,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  await pluginSourceGateway.storeOdapLog(odapLog2);

  const referenceTimestamp = Date.now().toString();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await pluginSourceGateway.storeOdapLog(odapLog);
  await pluginSourceGateway.storeOdapLog(odapLog3);

  const moreRecentLogs = await pluginSourceGateway.getLogsMoreRecentThanTimestamp(
    referenceTimestamp,
  );

  if (
    moreRecentLogs == undefined ||
    moreRecentLogs.length != 2 ||
    moreRecentLogs[0].data == undefined ||
    moreRecentLogs[1].data == undefined ||
    odapLog.data == undefined ||
    odapLog3.data == undefined
  ) {
    throw new Error("Test failed");
  }

  expect(moreRecentLogs[0].type).toBe(odapLog.type);
  expect(moreRecentLogs[0].operation).toBe(odapLog.operation);
  expect(moreRecentLogs[0].data).toBe(odapLog.data);

  expect(moreRecentLogs[0].timestamp).toBe(odapLog.timestamp);
  expect(moreRecentLogs[0].type).toBe(odapLog.type);
  expect(moreRecentLogs[0].operation).toBe(odapLog.operation);
  expect(moreRecentLogs[0].sessionID).toBe(odapLog.sessionID);
  expect(moreRecentLogs[0].key).toBe(
    PluginOdapGateway.getOdapLogKey(sessionID, type, operation),
  );

  expect(moreRecentLogs[1].type).toBe(odapLog3.type);
  expect(moreRecentLogs[1].operation).toBe(odapLog3.operation);
  expect(moreRecentLogs[1].data).toBe(odapLog3.data);

  expect(moreRecentLogs[1].timestamp).toBe(odapLog3.timestamp);
  expect(moreRecentLogs[1].type).toBe(odapLog3.type);
  expect(moreRecentLogs[1].operation).toBe(odapLog3.operation);
  expect(moreRecentLogs[1].sessionID).toBe(odapLog3.sessionID);
  expect(moreRecentLogs[1].key).toBe(
    PluginOdapGateway.getOdapLogKey(sessionID, type3, operation),
  );
});

test("successful retrieval of logs when there are no more recent logs", async () => {
  const moreRecentLogs = await pluginSourceGateway.getLogsMoreRecentThanTimestamp(
    Date.now().toString(),
  );

  expect(moreRecentLogs).not.toBeUndefined();
  expect(moreRecentLogs?.length).toBe(0);
});

test("successful recover of sessions after crash", async () => {
  const newSessionID = uuidv4();
  const newStep = 4;

  type2 = type + "2";
  type3 = type + "3";
  type4 = type + "4";

  const data = {
    id: newSessionID,
    step: newStep,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
  };

  odapLog2 = {
    sessionID: sessionID,
    type: type2,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  odapLog3 = {
    sessionID: sessionID,
    type: type3,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  odapLog4 = {
    sessionID: newSessionID,
    type: type4,
    operation: operation,
    data: JSON.stringify(data),
  };

  pluginSourceGateway.sessions.set(newSessionID, data);

  await pluginSourceGateway.storeOdapLog(odapLog);
  await pluginSourceGateway.storeOdapLog(odapLog3);
  await pluginSourceGateway.storeOdapLog(odapLog2);
  await pluginSourceGateway.storeOdapLog(odapLog4);

  // simulate the crash of one gateway
  pluginSourceGateway.database?.destroy();
  const newPluginSourceGateway = new PluginOdapGateway(
    sourceGatewayConstructor,
  );

  await newPluginSourceGateway.recoverOpenSessions(false);

  const sessions = newPluginSourceGateway.sessions.values();

  expect(newPluginSourceGateway.sessions.size).toBe(2);

  for (const session of sessions) {
    if (session.id == sessionID) {
      expect(session.step).toBe(step);
    } else if (session.id == newSessionID) {
      expect(session.step).toBe(newStep);
    } else {
      throw new Error("Test failed.");
    }

    expect(data.sourceGatewayPubkey).toBe(newPluginSourceGateway.pubKey);
    expect(data.recipientGatewayPubkey).toBe(pluginRecipientGateway.pubKey);
  }

  newPluginSourceGateway.database?.destroy();
});

afterAll(async () => {
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(ipfsServer);
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
