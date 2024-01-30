import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { v4 as uuidV4 } from "uuid";
import { PluginSATPGateway } from "../../../../main/typescript/plugin-satp-gateway";

import {
  RecoverUpdateAckV1Message,
  SessionData,
} from "../../../../main/typescript/public-api";
import { randomInt } from "crypto";
import { checkValidRecoverUpdateAckMessage } from "../../../../main/typescript/recovery/recover-update-ack";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";

import {
  knexClientConnection,
  knexRemoteConnection,
  knexServerConnection,
} from "../../knex.config";

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

test("valid recover update ack message from client", async () => {
  const recoverUpdateAckMessage: RecoverUpdateAckV1Message = {
    sessionID: sessionID,
    signature: "",
    success: true,
    changedEntriesHash: [],
  };

  recoverUpdateAckMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(recoverUpdateAckMessage)),
  );

  await checkValidRecoverUpdateAckMessage(
    recoverUpdateAckMessage,
    pluginRecipientGateway,
  );
});

test("valid recover update ack message from server", async () => {
  const recoverUpdateAckMessage: RecoverUpdateAckV1Message = {
    sessionID: sessionID,
    signature: "",
    success: true,
    changedEntriesHash: [],
  };

  recoverUpdateAckMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginRecipientGateway.sign(JSON.stringify(recoverUpdateAckMessage)),
  );

  await checkValidRecoverUpdateAckMessage(
    recoverUpdateAckMessage,
    pluginSourceGateway,
  ).catch(() => {
    throw new Error("Test failed");
  });
});

afterEach(() => {
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
  pluginSourceGateway.remoteRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
});
