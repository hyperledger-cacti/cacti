import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import { checkValidInitializationResponse } from "../../../../main/typescript/gateway/client/transfer-initialization";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  TransferInitializationV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";

const INITIALIZATION_REQUEST_MESSAGE_HASH =
  "dummyInitializationRequestMessageHash";

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let sequenceNumber: number;
let sessionID: string;
let step: number;

beforeEach(() => {
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
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  initializationResponseMessage.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(
      JSON.stringify(initializationResponseMessage),
    ),
  );

  const messageHash = SHA256(
    JSON.stringify(initializationResponseMessage),
  ).toString();

  await checkValidInitializationResponse(
    initializationResponseMessage,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.step).toBe(step + 1);
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
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  initializationResponseMessage.serverSignature = pluginSourceGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationResponseMessage),
    ),
  );

  await checkValidInitializationResponse(
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
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  initializationResponseMessage.serverSignature = pluginSourceGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationResponseMessage),
    ),
  );

  await checkValidInitializationResponse(
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
