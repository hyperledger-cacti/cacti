import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  checkValidTransferCommenceResponse,
  sendTransferCommenceRequest,
} from "../../../../main/typescript/gateway/client/transfer-commence";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  AssetProfile,
  SessionData,
  TransferCommenceV1Response,
} from "../../../../main/typescript/public-api";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const COMMENCE_REQUEST_MESSAGE_HASH = "dummyCommenceRequestMessageHash";

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
  };
  recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
  };

  pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new PluginOdapGateway(recipientGatewayConstructor);

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
    transferCommenceMessageRequestHash: COMMENCE_REQUEST_MESSAGE_HASH,
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

test("valid transfer commence response", async () => {
  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommenceRequest: COMMENCE_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceResponse.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(transferCommenceResponse)),
  );

  const messageHash = SHA256(
    JSON.stringify(transferCommenceResponse),
  ).toString();

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.transferCommenceMessageResponseHash).toBe(
    messageHash,
  );
  expect(
    retrievedSessionData.serverSignatureTransferCommenceResponseMessage,
  ).toBe(transferCommenceResponse.signature);
});

test("transfer commence response invalid because of wrong previous message hash", async () => {
  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommenceRequest: "wrongMessageHash",
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceResponse.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(transferCommenceResponse)),
  );

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
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

test("transfer commence response invalid because of wrong signature", async () => {
  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommenceRequest: COMMENCE_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceResponse.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});

test("timeout in transfer commence request because no server gateway is connected", async () => {
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
    assetProfile: assetProfile,
    loggingProfile: "dummyLoggingProfile",
    sourceBasePath: "",
    recipientBasePath: "http://wrongpath",
    originatorPubkey: "http://wrongpath",
    beneficiaryPubkey: "http://wrongpath",
    accessControlProfile: "dummyAccessControlProfile",
    applicationProfile: "dummyApplicationProfile",
    lastSequenceNumber: 77,
    sourceGatewayDltSystem: "DLT1",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT2",
    initializationResponseMessageHash: "dummyInitializationResponseMessageHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await sendTransferCommenceRequest(sessionID, pluginSourceGateway, true)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => {
      expect(ex.message).toMatch("Timeout exceeded.");
    });
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
