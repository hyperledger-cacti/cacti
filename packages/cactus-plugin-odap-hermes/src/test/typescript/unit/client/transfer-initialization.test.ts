import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  TransferInitializationV1Response,
  SessionData,
  AssetProfile,
} from "../../../../main/typescript/public-api";
import { BesuOdapGateway } from "../../../../main/typescript/gateway/besu-odap-gateway";
import { FabricOdapGateway } from "../../../../main/typescript/gateway/fabric-odap-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/gateway/server/server-helper";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const INITIALIZATION_REQUEST_MESSAGE_HASH =
  "dummyInitializationRequestMessageHash";

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let sequenceNumber: number;
let sessionID: string;
let step: number;

beforeEach(async () => {
  sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };
  recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };

  pluginSourceGateway = new FabricOdapGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuOdapGateway(recipientGatewayConstructor);

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

  sequenceNumber = randomInt(100);
  sessionID = uuidV4();
  step = 1;

  const sessionData: SessionData = {
    id: sessionID,
    step: step,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    initializationRequestMessageHash: INITIALIZATION_REQUEST_MESSAGE_HASH,
    lastSequenceNumber: sequenceNumber,
    maxTimeout: 0,
    maxRetries: 0,
    rollbackProofs: [],
    sourceBasePath: "",
    recipientBasePath: "",
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
});

test("valid transfer initiation response", async () => {
  const initializationResponseMessage: TransferInitializationV1Response = {
    messageType: OdapMessageType.InitializationResponse,
    sessionID: sessionID,
    initialRequestMessageHash: INITIALIZATION_REQUEST_MESSAGE_HASH,
    timeStamp: Date.now().toString(),
    processedTimeStamp: Date.now().toString(),
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    sequenceNumber: sequenceNumber,
    backupGatewaysAllowed: [],
  };

  initializationResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(
      JSON.stringify(initializationResponseMessage),
    ),
  );

  const messageHash = SHA256(
    JSON.stringify(initializationResponseMessage),
  ).toString();

  await pluginSourceGateway.clientHelper.checkValidInitializationResponse(
    initializationResponseMessage,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.recipientGatewayPubkey).toBe(
    pluginRecipientGateway.pubKey,
  );
  expect(retrievedSessionData.initializationRequestMessageHash).toBe(
    INITIALIZATION_REQUEST_MESSAGE_HASH,
  );
  expect(retrievedSessionData.initializationResponseMessageHash).toBe(
    messageHash,
  );
  expect(
    retrievedSessionData.serverSignatureInitializationResponseMessage,
  ).not.toBe("");
});

test("transfer initiation response invalid because of wrong previous message hash", async () => {
  const initializationResponseMessage: TransferInitializationV1Response = {
    messageType: OdapMessageType.InitializationResponse,
    sessionID: sessionID,
    initialRequestMessageHash: "wrongMessageHash",
    timeStamp: Date.now().toString(),
    processedTimeStamp: Date.now().toString(),
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    sequenceNumber: sequenceNumber,
    backupGatewaysAllowed: [],
  };

  initializationResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationResponseMessage),
    ),
  );

  await pluginSourceGateway.clientHelper
    .checkValidInitializationResponse(
      initializationResponseMessage,
      pluginSourceGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "previous message hash does not match the one that was sent",
      ),
    );
});

test("transfer initiation response invalid because it does not match transfer initialization request sessionID", async () => {
  const initializationResponseMessage: TransferInitializationV1Response = {
    messageType: OdapMessageType.InitializationResponse,
    sessionID: uuidV4(),
    initialRequestMessageHash: "wrongMessageHash",
    timeStamp: Date.now().toString(),
    processedTimeStamp: Date.now().toString(),
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    sequenceNumber: sequenceNumber,
    backupGatewaysAllowed: [],
  };

  initializationResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationResponseMessage),
    ),
  );

  await pluginSourceGateway.clientHelper
    .checkValidInitializationResponse(
      initializationResponseMessage,
      pluginSourceGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("session data is undefined"),
    );
});

test("timeout in transfer initiation request because no server gateway is connected", async () => {
  const expiryDate = new Date(2060, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };

  const sessionData: SessionData = {
    id: sessionID,
    step: 1,
    version: "0.0.0",
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    payloadProfile: {
      assetProfile: assetProfile,
      capabilities: "",
    },
    loggingProfile: "dummyLoggingProfile",
    sourceBasePath: "",
    recipientBasePath: "http://wrongpath",
    accessControlProfile: "dummyAccessControlProfile",
    applicationProfile: "dummyApplicationProfile",
    lastSequenceNumber: 77,
    sourceGatewayDltSystem: "DLT1",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT2",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
    allowedSourceBackupGateways: [],
    recipientLedgerAssetID: "",
    sourceLedgerAssetID: "",
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginSourceGateway.clientHelper
    .sendTransferInitializationRequest(sessionID, pluginSourceGateway, true)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => {
      expect(ex.message).toMatch("message failed.");
    });
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
