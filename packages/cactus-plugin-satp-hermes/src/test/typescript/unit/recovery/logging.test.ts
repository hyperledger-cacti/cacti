import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { v4 as uuidV4 } from "uuid";
import {
  ILocalLog,
  PluginSATPGateway,
} from "../../../../main/typescript/plugin-satp-gateway";

import { SessionData } from "../../../../main/typescript/public-api";
import { SHA256 } from "crypto-js";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import {
  FabricSATPGateway,
  IFabricSATPGatewayConstructorOptions,
} from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";

import {
  knexClientConnection,
  knexRemoteConnection,
  knexServerConnection,
} from "../../knex.config";

let sourceGatewayConstructor: IFabricSATPGatewayConstructorOptions;

let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;
let sessionID: string;
let step: number;
let type: string;
let type2: string;
let type3: string;
let type4: string;
let operation: string;
let satpLog: ILocalLog;
let satpLog2: ILocalLog;
let satpLog3: ILocalLog;
let satpLog4: ILocalLog;
let sessionData: SessionData;

beforeEach(async () => {
  sessionID = uuidv4();
  step = 3;
  type = "type1";
  operation = "operation1";

  sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexLocalConfig: knexClientConnection,
    knexRemoteConfig: knexRemoteConnection,
  };
  const recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexLocalConfig: knexServerConnection,
    knexRemoteConfig: knexRemoteConnection,
  };

  pluginSourceGateway = new FabricSATPGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSATPGateway(recipientGatewayConstructor);

  sessionData = {
    id: sessionID,
    step: step,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
  };

  satpLog = {
    sessionID: sessionID,
    type: type,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);

  if (
    pluginSourceGateway.localRepository?.database == undefined ||
    pluginRecipientGateway.localRepository?.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();
});

test("successful translation of log keys", async () => {
  expect(PluginSATPGateway.getSatpLogKey(sessionID, type, operation)).toBe(
    `${sessionID}-${type}-${operation}`,
  );
});

test("successful logging of proof to ipfs and sqlite", async () => {
  const claim = "claim";
  const satpLogKey = PluginSATPGateway.getSatpLogKey(
    sessionID,
    "proof",
    "lock",
  );

  await pluginSourceGateway.storeProof({
    sessionID,
    type: "proof",
    operation: "lock",
    data: claim,
  });

  const retrievedLogRemote =
    await pluginSourceGateway.getLogFromRemote(satpLogKey);
  const retrievedLogDB =
    await pluginSourceGateway.getLogFromDatabase(satpLogKey);

  if (retrievedLogDB == undefined || retrievedLogRemote == undefined) {
    throw new Error("Test Failed");
  }

  expect(retrievedLogRemote.key).toBe(satpLogKey);
  expect(retrievedLogDB.key).toBe(satpLogKey);
  expect(retrievedLogRemote.hash).toBe(SHA256(claim).toString());
  expect(
    pluginRecipientGateway.verifySignature(
      retrievedLogRemote,
      pluginSourceGateway.pubKey,
    ),
  ).toBe(true);

  expect(1).toBe(1);
});

test("successful logging to ipfs and sqlite", async () => {
  const satpLogKey = PluginSATPGateway.getSatpLogKey(
    sessionID,
    type,
    operation,
  );

  await pluginSourceGateway.storeLog(satpLog);

  const retrievedLogRemote =
    await pluginSourceGateway.getLogFromRemote(satpLogKey);
  const retrievedLogDB =
    await pluginSourceGateway.getLogFromDatabase(satpLogKey);

  if (
    retrievedLogRemote == undefined ||
    retrievedLogDB == undefined ||
    retrievedLogDB.data == undefined ||
    satpLog.data == undefined
  ) {
    throw new Error("Test failed");
  }

  expect(retrievedLogRemote.signerPubKey).toBe(pluginSourceGateway.pubKey);
  expect(retrievedLogRemote.hash).toBe(
    SHA256(
      JSON.stringify(satpLog, [
        "sessionID",
        "type",
        "key",
        "operation",
        "timestamp",
        "data",
      ]),
    ).toString(),
  );
  expect(retrievedLogRemote.key).toBe(satpLogKey);

  expect(retrievedLogDB.type).toBe(satpLog.type);
  expect(retrievedLogDB.operation).toBe(satpLog.operation);
  expect(retrievedLogDB.data).toBe(satpLog.data);

  expect(retrievedLogDB.timestamp).toBe(satpLog.timestamp);
  expect(retrievedLogDB.type).toBe(satpLog.type);
  expect(retrievedLogDB.operation).toBe(satpLog.operation);
  expect(retrievedLogDB.sessionID).toBe(satpLog.sessionID);
  expect(retrievedLogDB.key).toBe(satpLogKey);
});

test("successful retrieval of last log", async () => {
  type2 = type + "2";
  type3 = type + "3";

  satpLog2 = {
    sessionID: sessionID,
    type: type2,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  satpLog3 = {
    sessionID: sessionID,
    type: type3,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  await pluginSourceGateway.storeLog(satpLog2);
  await pluginSourceGateway.storeLog(satpLog3);

  const lastLog = await pluginSourceGateway.getLastLogFromDatabase(sessionID);

  if (
    lastLog == undefined ||
    satpLog3 == undefined ||
    lastLog.data == undefined ||
    satpLog3.data == undefined
  ) {
    throw new Error("Test failed");
  }

  expect(lastLog.type).toBe(satpLog3.type);
  expect(lastLog.operation).toBe(satpLog3.operation);
  expect(lastLog.data).toBe(satpLog3.data);

  expect(lastLog.timestamp).toBe(satpLog3.timestamp);
  expect(lastLog.type).toBe(satpLog3.type);
  expect(lastLog.operation).toBe(satpLog3.operation);
  expect(lastLog.sessionID).toBe(satpLog3.sessionID);
  expect(lastLog.key).toBe(
    PluginSATPGateway.getSatpLogKey(sessionID, type3, operation),
  );
});

test("successful retrieval of logs more recent than another log", async () => {
  type2 = type + "2";
  type3 = type + "3";

  satpLog2 = {
    sessionID: sessionID,
    type: type2,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  satpLog3 = {
    sessionID: sessionID,
    type: type3,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  await pluginSourceGateway.storeLog(satpLog2);

  const referenceTimestamp = Date.now().toString();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await pluginSourceGateway.storeLog(satpLog);
  await pluginSourceGateway.storeLog(satpLog3);

  const moreRecentLogs =
    await pluginSourceGateway.getLogsMoreRecentThanTimestamp(
      referenceTimestamp,
    );

  if (
    moreRecentLogs == undefined ||
    moreRecentLogs.length != 2 ||
    moreRecentLogs[0].data == undefined ||
    moreRecentLogs[1].data == undefined ||
    satpLog.data == undefined ||
    satpLog3.data == undefined
  ) {
    throw new Error("Test failed");
  }

  expect(moreRecentLogs[0].type).toBe(satpLog.type);
  expect(moreRecentLogs[0].operation).toBe(satpLog.operation);
  expect(moreRecentLogs[0].data).toBe(satpLog.data);

  expect(moreRecentLogs[0].timestamp).toBe(satpLog.timestamp);
  expect(moreRecentLogs[0].type).toBe(satpLog.type);
  expect(moreRecentLogs[0].operation).toBe(satpLog.operation);
  expect(moreRecentLogs[0].sessionID).toBe(satpLog.sessionID);
  expect(moreRecentLogs[0].key).toBe(
    PluginSATPGateway.getSatpLogKey(sessionID, type, operation),
  );

  expect(moreRecentLogs[1].type).toBe(satpLog3.type);
  expect(moreRecentLogs[1].operation).toBe(satpLog3.operation);
  expect(moreRecentLogs[1].data).toBe(satpLog3.data);

  expect(moreRecentLogs[1].timestamp).toBe(satpLog3.timestamp);
  expect(moreRecentLogs[1].type).toBe(satpLog3.type);
  expect(moreRecentLogs[1].operation).toBe(satpLog3.operation);
  expect(moreRecentLogs[1].sessionID).toBe(satpLog3.sessionID);
  expect(moreRecentLogs[1].key).toBe(
    PluginSATPGateway.getSatpLogKey(sessionID, type3, operation),
  );
});

test("successful retrieval of logs when there are no more recent logs", async () => {
  const moreRecentLogs =
    await pluginSourceGateway.getLogsMoreRecentThanTimestamp(
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

  satpLog2 = {
    sessionID: sessionID,
    type: type2,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  satpLog3 = {
    sessionID: sessionID,
    type: type3,
    operation: operation,
    data: JSON.stringify(sessionData),
  };

  satpLog4 = {
    sessionID: newSessionID,
    type: type4,
    operation: operation,
    data: JSON.stringify(data),
  };

  pluginSourceGateway.sessions.set(newSessionID, data);

  await pluginSourceGateway.storeLog(satpLog);
  await pluginSourceGateway.storeLog(satpLog3);
  await pluginSourceGateway.storeLog(satpLog2);
  await pluginSourceGateway.storeLog(satpLog4);

  // simulate the crash of one gateway
  pluginSourceGateway.localRepository?.destroy();
  const newPluginSourceGateway = new FabricSATPGateway(
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

  newPluginSourceGateway.localRepository?.destroy();
});

afterEach(async () => {
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
  pluginSourceGateway.remoteRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
});
