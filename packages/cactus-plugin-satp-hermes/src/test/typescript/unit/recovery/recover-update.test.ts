import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { v4 as uuidV4 } from "uuid";
import { PluginSATPGateway } from "../../../../main/typescript/plugin-satp-gateway";

import {
  RecoverUpdateV1Message,
  RecoverV1Message,
  SessionData,
} from "../../../../main/typescript/public-api";
import { randomInt } from "crypto";
import {
  checkValidRecoverUpdateMessage,
  sendRecoverUpdateMessage,
} from "../../../../main/typescript/recovery/recover-update";

import { checkValidRecoverMessage } from "../../../../main/typescript/recovery/recover";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";

import {
  knexClientConnection,
  knexRemoteConnection,
  knexServerConnection,
} from "../../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;
let sessionID: string;
let sessionData: SessionData;

let sequenceNumber: number;

beforeEach(async () => {
  const sourceGatewayConstructor = {
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
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexLocalConfig: knexServerConnection,
    knexRemoteConfig: knexRemoteConnection,
  };

  pluginSourceGateway = new FabricSATPGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSATPGateway(recipientGatewayConstructor);

  if (
    pluginSourceGateway.localRepository?.database == undefined ||
    pluginRecipientGateway.localRepository?.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();

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

test("valid recover update message from server", async () => {
  const recoverUpdateMessage: RecoverUpdateV1Message = {
    sessionID: sessionID,
    recoveredLogs: [],
    signature: "",
  };

  recoverUpdateMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginRecipientGateway.sign(JSON.stringify(recoverUpdateMessage)),
  );

  await checkValidRecoverUpdateMessage(
    recoverUpdateMessage,
    pluginSourceGateway,
  ).catch(() => {
    throw new Error("Test failed");
  });
});

test("check valid build of recover update message", async () => {
  const sessionData1: SessionData = {
    id: sessionID,
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    sourceBasePath: "",
    recipientBasePath: "",
    lastSequenceNumber: 1,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData1);

  const sessionData2 = {
    id: sessionID,
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    sourceBasePath: "",
    recipientBasePath: "",
    lastSequenceNumber: 2,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
  };

  pluginRecipientGateway.sessions.set(sessionID, sessionData2);

  const firstTimestamp = Date.now().toString();
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await pluginSourceGateway.storeLog({
    sessionID: sessionID,
    type: "init",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  await pluginRecipientGateway.storeLog({
    sessionID: sessionID,
    type: "exec",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  await pluginRecipientGateway.storeLog({
    sessionID: sessionID,
    type: "done",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  await pluginRecipientGateway.storeLog({
    sessionID: sessionID,
    type: "ack",
    operation: "validate",
    data: JSON.stringify(sessionData),
  });

  const recoverMessage: RecoverV1Message = {
    sessionID: sessionID,
    odapPhase: "1",
    sequenceNumber: sequenceNumber,
    lastLogEntryTimestamp: firstTimestamp,
    signature: "",
    isBackup: false,
    newBasePath: "",
  };

  recoverMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(recoverMessage)),
  );

  await checkValidRecoverMessage(recoverMessage, pluginRecipientGateway);

  const recoverUpdateMessage: RecoverUpdateV1Message | void =
    await sendRecoverUpdateMessage(sessionID, pluginRecipientGateway, false);

  if (recoverUpdateMessage == void 0) {
    throw new Error("Test Failed");
  }

  console.log(recoverUpdateMessage.recoveredLogs);
  expect(recoverUpdateMessage.recoveredLogs.length).toBe(3);

  await checkValidRecoverUpdateMessage(
    recoverUpdateMessage,
    pluginSourceGateway,
  );

  expect(pluginSourceGateway.sessions.size).toBe(1);

  const [sessionId] = pluginSourceGateway.sessions.keys();

  expect(pluginRecipientGateway.sessions.get(sessionId)).toBe(sessionData2);
});

afterEach(() => {
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
  pluginSourceGateway.remoteRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
});
