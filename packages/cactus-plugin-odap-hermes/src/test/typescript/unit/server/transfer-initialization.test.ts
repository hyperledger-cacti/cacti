import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  TransferInitializationV1Request,
  AssetProfile,
  SessionData,
} from "../../../../main/typescript/public-api";
import { BesuOdapGateway } from "../../../../main/typescript/gateway/besu-odap-gateway";
import { FabricOdapGateway } from "../../../../main/typescript/gateway/fabric-odap-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/gateway/server/server-helper";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let expiryDate: string;
let assetProfile: AssetProfile;
let sequenceNumber: number;
let sessionID: string;

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

  expiryDate = new Date(2060, 11, 24).toString();
  assetProfile = { expirationDate: expiryDate };

  sequenceNumber = randomInt(100);
  sessionID = uuidV4();
});

test("valid transfer initiation request", async () => {
  const initializationRequestMessage: TransferInitializationV1Request = {
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    messageType: OdapMessageType.InitializationRequest,
    sessionID: sessionID,
    version: "0.0.0",
    loggingProfile: "dummyLoggingProfile",
    accessControlProfile: "dummyAccessControlProfile",
    applicationProfile: "dummyApplicationProfile",
    payloadProfile: {
      assetProfile: assetProfile,
      capabilities: "",
    },
    signature: "",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    sourceGatewayDltSystem: "DLT1",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT2",
    sequenceNumber: sequenceNumber,
    recipientBasePath: "",
    sourceBasePath: "",
    backupGatewaysAllowed: [],
    recipientLedgerAssetID: "",
    sourceLedgerAssetID: "",
  };

  initializationRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationRequestMessage),
    ),
  );

  const messageHash = SHA256(
    JSON.stringify(initializationRequestMessage),
  ).toString();

  await pluginRecipientGateway.serverHelper.checkValidInitializationRequest(
    initializationRequestMessage,
    pluginRecipientGateway,
  );

  const sessionData = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionData == undefined) throw new Error("Test failed");

  expect(sessionData.step).not.toBe(0);
  expect(sessionData.lastSequenceNumber).toBe(sequenceNumber);
  expect(sessionData.loggingProfile).toBe("dummyLoggingProfile");
  expect(sessionData.accessControlProfile).toBe("dummyAccessControlProfile");
  expect(sessionData.applicationProfile).toBe("dummyApplicationProfile");
  expect(JSON.stringify(sessionData.assetProfile)).toBe(
    JSON.stringify(assetProfile),
  );
  expect(sessionData.sourceGatewayPubkey).toBe(pluginSourceGateway.pubKey);
  expect(sessionData.recipientGatewayPubkey).toBe(
    pluginRecipientGateway.pubKey,
  );
  expect(sessionData.sourceGatewayDltSystem).toBe("DLT1");
  expect(sessionData.recipientGatewayDltSystem).toBe("DLT2");

  expect(sessionData.initializationRequestMessageHash).toBe(messageHash);

  expect(sessionData.clientSignatureInitializationRequestMessage).toBe(
    initializationRequestMessage.signature,
  );
});

test("transfer initiation request invalid because of incompatible DLTs", async () => {
  const initializationRequestMessage: TransferInitializationV1Request = {
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    messageType: OdapMessageType.InitializationRequest,
    sessionID: sessionID,
    version: "0.0.0",
    loggingProfile: "dummy",
    accessControlProfile: "dummy",
    applicationProfile: "dummy",
    payloadProfile: {
      assetProfile: assetProfile,
      capabilities: "",
    },
    signature: "",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    sourceGatewayDltSystem: "DLT2",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT1",
    sequenceNumber: sequenceNumber,
    recipientBasePath: "",
    sourceBasePath: "",
    backupGatewaysAllowed: [],
    recipientLedgerAssetID: "",
    sourceLedgerAssetID: "",
  };

  initializationRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationRequestMessage),
    ),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidInitializationRequest(
      initializationRequestMessage,
      pluginRecipientGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "source gateway dlt system is not supported by this gateway",
      ),
    );
});

test("transfer initiation request invalid because of asset expired", async () => {
  expiryDate = new Date(2020, 11, 24).toString();
  assetProfile = { expirationDate: expiryDate };

  const initializationRequestMessage: TransferInitializationV1Request = {
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    messageType: OdapMessageType.InitializationRequest,
    sessionID: sessionID,
    version: "0.0.0",
    loggingProfile: "dummy",
    accessControlProfile: "dummy",
    applicationProfile: "dummy",
    payloadProfile: {
      assetProfile: assetProfile,
      capabilities: "",
    },
    signature: "",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    sourceGatewayDltSystem: "DLT1",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT2",
    sequenceNumber: sequenceNumber,
    recipientBasePath: "",
    sourceBasePath: "",
    backupGatewaysAllowed: [],
    recipientLedgerAssetID: "",
    sourceLedgerAssetID: "",
  };

  initializationRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(initializationRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidInitializationRequest(
      initializationRequestMessage,
      pluginRecipientGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => expect(ex.message).toMatch("asset has expired"));
});

test("timeout in commit final response because no client gateway is connected", async () => {
  const sessionData: SessionData = {
    id: sessionID,
    step: 1,
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    sourceBasePath: "http://wrongpath",
    recipientBasePath: "",
    lastSequenceNumber: 77,
    initializationRequestMessageHash:
      "dummyInitializationRequestMessageProcessedTimeStamp",
    initializationRequestMessageRcvTimeStamp:
      "dummyInitializationRequestMessageProcessedTimeStamp",
    initializationRequestMessageProcessedTimeStamp:
      "dummyInitializationRequestMessageProcessedTimeStamp",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginRecipientGateway.serverHelper
    .sendTransferInitializationResponse(sessionID, pluginSourceGateway, true)
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
