import { randomInt } from "crypto";
import {
  IPluginOdapGatewayConstructorOptions,
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  TransferCommenceV1Request,
  AssetProfile,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyInitializationRequestMessageHash: string;
let expiryDate: string;
let assetProfile: AssetProfile;
let assetProfileHash: string;
let sessionData: SessionData;
let sessionID: string;
let sequenceNumber: number;

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

  dummyInitializationRequestMessageHash = SHA256(
    "initializationRequestMessageData",
  ).toString();

  expiryDate = new Date(2060, 11, 24).toString();
  assetProfile = { expirationDate: expiryDate };
  assetProfileHash = SHA256(JSON.stringify(assetProfile)).toString();
  sessionData = {
    initializationRequestMessageHash: dummyInitializationRequestMessageHash,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    sourceGatewayDltSystem: "DLT2",
    recipientGatewayDltSystem: "DLT1",
    assetProfile: assetProfile,
    step: 1,
  };

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("successful transfer commence flow", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "originatorDummyPubKey",
    beneficiaryPubkey: "beneficiaryDummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationRequestMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  const requestHash = SHA256(
    JSON.stringify(transferCommenceRequest),
  ).toString();

  const response = await pluginRecipientGateway.transferCommenceReceived(
    transferCommenceRequest,
  );

  const responseHash = SHA256(JSON.stringify(response)).toString();

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.transferCommenceMessageRequestHash).toBe(requestHash);
  expect(sessionInfo.transferCommenceMessageResponseHash).toBe(responseHash);

  expect(sessionInfo.clientSignatureTransferCommenceRequestMessage).toBe(
    transferCommenceRequest.clientSignature,
  );
  expect(sessionInfo.serverSignatureTransferCommenceResponseMessage).toBe(
    response.serverSignature,
  );

  expect(sessionInfo.originatorPubkey).toBe("originatorDummyPubKey");
  expect(sessionInfo.beneficiaryPubkey).toBe("beneficiaryDummyPubKey");

  expect(response.messageType).toBe(OdapMessageType.TransferCommenceResponse);
  expect(response.clientIdentityPubkey).toBe(pluginSourceGateway.pubKey);
  expect(response.serverIdentityPubkey).toBe(pluginRecipientGateway.pubKey);
  expect(response.hashCommenceRequest).toBe(requestHash);
  expect(response.sequenceNumber).toBe(sequenceNumber);

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

test("transfer commence flow with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationRequestMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await pluginRecipientGateway
    .transferCommenceReceived(transferCommenceRequest)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "session Id does not correspond to any open session",
      ),
    );
});

test("transfer commence flow with wrong message type", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceResponse,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationRequestMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await pluginRecipientGateway
    .transferCommenceReceived(transferCommenceRequest)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "wrong message type for TransferCommenceRequest",
      ),
    );
});

test("transfer commence flow with wrong signature", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationRequestMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify("wrongData")),
  );

  await pluginRecipientGateway
    .transferCommenceReceived(transferCommenceRequest)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "TransferCommenceRequest message signature verification failed",
      ),
    );
});

test("transfer commence flow with wrong previous message hash", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: "wrongPrevMessageHash",
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await pluginRecipientGateway
    .transferCommenceReceived(transferCommenceRequest)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("previous message hash not match"),
    );
});

test("transfer commence flow with wrong asset profile hash", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationRequestMessageHash,
    hashAssetProfile: "wrongAssetProfileHash",
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await pluginRecipientGateway
    .transferCommenceReceived(transferCommenceRequest)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("assetProfile hash not match"),
    );
});
