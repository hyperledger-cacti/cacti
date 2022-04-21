import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import { checkValidInitializationRequest } from "../../../../main/typescript/gateway/server/transfer-initialization";
import {
  TransferInitializationV1Request,
  AssetProfile,
} from "../../../../main/typescript/public-api";

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let expiryDate: string;
let assetProfile: AssetProfile;
let sequenceNumber: number;
let sessionID: string;

beforeAll(() => {
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
  expiryDate = new Date(2060, 11, 24).toString();
  assetProfile = { expirationDate: expiryDate };

  sequenceNumber = randomInt(100);
  sessionID = uuidV4();
});

test("valid transfer initiation request", async () => {
  const initializationRequestMessage: TransferInitializationV1Request = {
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
    clientSignature: "",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    sourceGatewayDltSystem: "DLT1",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT2",
    sequenceNumber: sequenceNumber,
  };

  initializationRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationRequestMessage),
    ),
  );

  const messageHash = SHA256(
    JSON.stringify(initializationRequestMessage),
  ).toString();

  await checkValidInitializationRequest(
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
    initializationRequestMessage.clientSignature,
  );
});

test("transfer initiation request invalid because of incompatible DLTs", async () => {
  const initializationRequestMessage: TransferInitializationV1Request = {
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
    clientSignature: "",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    sourceGatewayDltSystem: "DLT2",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT1",
    sequenceNumber: sequenceNumber,
  };

  initializationRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    await pluginSourceGateway.sign(
      JSON.stringify(initializationRequestMessage),
    ),
  );

  await checkValidInitializationRequest(
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
    clientSignature: "",
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    sourceGatewayDltSystem: "DLT1",
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    recipientGatewayDltSystem: "DLT2",
    sequenceNumber: sequenceNumber,
  };

  initializationRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(initializationRequestMessage)),
  );

  await checkValidInitializationRequest(
    initializationRequestMessage,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => expect(ex.message).toMatch("asset has expired"));
});
