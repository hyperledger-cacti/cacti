import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  SatpMessageType,
  PluginSATPGateway,
} from "../../../../main/typescript/plugin-satp-gateway";
import {
  TransferInitializationV1Request,
  AssetProfile,
  SessionData,
} from "../../../../main/typescript/public-api";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;
let expiryDate: string;
let assetProfile: AssetProfile;
let sequenceNumber: number;
let sessionID: string;

beforeEach(async () => {
  const sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };
  const recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
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

  expiryDate = new Date(2060, 11, 24).toString();
  assetProfile = { expirationDate: expiryDate };

  sequenceNumber = randomInt(100);
  sessionID = uuidV4();
});

test("valid transfer initiation request", async () => {
  const initializationRequestMessage: TransferInitializationV1Request = {
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    messageType: SatpMessageType.InitializationRequest,
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

  initializationRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
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
    messageType: SatpMessageType.InitializationRequest,
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

  initializationRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
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
    messageType: SatpMessageType.InitializationRequest,
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

  initializationRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
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
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
  pluginSourceGateway.remoteRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
});
