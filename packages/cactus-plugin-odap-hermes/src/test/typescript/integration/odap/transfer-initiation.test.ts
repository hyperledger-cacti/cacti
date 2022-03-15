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
} from "../../../../main/typescript/public-api";

test("successful transfer initiation flow", async () => {
  const sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
  };
  const recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
  };

  const pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  const pluginRecipientGateway = new PluginOdapGateway(
    recipientGatewayConstructor,
  );
  const expiryDate = new Date(2060, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };
  const sequenceNumber = randomInt(100);

  const initializationRequestMessage: TransferInitializationV1Request = {
    messageType: OdapMessageType.InitializationRequest,
    sessionID: uuidV4(),
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

  const response = await pluginRecipientGateway.initiateTransferReceived(
    initializationRequestMessage,
  );

  const responseHash = SHA256(JSON.stringify(response)).toString();

  expect(parseInt(response.sessionID)).not.toBeUndefined();

  const sessionData = pluginRecipientGateway.sessions.get(response.sessionID);

  expect(sessionData).not.toBeUndefined();

  expect(sessionData?.loggingProfile).toBe("dummyLoggingProfile");
  expect(sessionData?.accessControlProfile).toBe("dummyAccessControlProfile");
  expect(sessionData?.applicationProfile).toBe("dummyApplicationProfile");
  expect(sessionData?.sourceGatewayPubkey).toBe(pluginSourceGateway.pubKey);
  expect(sessionData?.recipientGatewayPubkey).toBe(
    pluginRecipientGateway.pubKey,
  );
  expect(sessionData?.sourceGatewayDltSystem).toBe("DLT1");
  expect(sessionData?.recipientGatewayDltSystem).toBe("DLT2");

  expect(sessionData?.initializationRequestMessageHash).toBe(messageHash);
  expect(sessionData?.initializationResponseMessageHash).toBe(responseHash);

  expect(sessionData?.clientSignatureInitializationRequestMessage).toBe(
    initializationRequestMessage.clientSignature,
  );
  expect(sessionData?.serverSignatureInitializationResponseMessage).toBe(
    response.serverSignature,
  );

  expect(response.sequenceNumber).toBe(sequenceNumber);

  expect(response.messageType).toBe(OdapMessageType.InitializationResponse);

  expect(response.initialRequestMessageHash).toBe(messageHash);
  expect(parseInt(response.processedTimeStamp)).toBeGreaterThan(
    parseInt(response.timeStamp),
  );

  const sourceClientSignature = new Uint8Array(
    Buffer.from(response.serverSignature, "hex"),
  );

  const sourceClientPubkey = new Uint8Array(
    Buffer.from(response.serverIdentityPubkey, "hex"),
  );

  response.serverSignature = "";

  expect(
    pluginSourceGateway.verifySignature(
      JSON.stringify(response),
      sourceClientSignature,
      sourceClientPubkey,
    ),
  ).toBe(true);
});

test("transfer initiation flow fails because of incompatible DLTs", async () => {
  const sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
  };
  const recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
  };

  const pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  const pluginRecipientGateway = new PluginOdapGateway(
    recipientGatewayConstructor,
  );
  const expiryDate = new Date(2060, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };
  const sequenceNumber = randomInt(100);

  const initializationRequestMessage: TransferInitializationV1Request = {
    messageType: OdapMessageType.InitializationRequest,
    sessionID: uuidV4(),
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
    await pluginSourceGateway.sign(
      JSON.stringify(initializationRequestMessage),
    ),
  );

  await pluginRecipientGateway
    .initiateTransferReceived(initializationRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "source gateway dlt system is not supported by this gateway",
      ),
    );
});

test("transfer initiation flow fails because of asset expired", async () => {
  const sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
  };
  const recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
  };

  const pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  const pluginRecipientGateway = new PluginOdapGateway(
    recipientGatewayConstructor,
  );
  const expiryDate = new Date(2020, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };
  const sequenceNumber = randomInt(100);

  const initializationRequestMessage: TransferInitializationV1Request = {
    messageType: OdapMessageType.InitializationRequest,
    sessionID: uuidV4(),
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

  await pluginRecipientGateway
    .initiateTransferReceived(initializationRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => expect(ex.message).toMatch("asset has expired"));
});
