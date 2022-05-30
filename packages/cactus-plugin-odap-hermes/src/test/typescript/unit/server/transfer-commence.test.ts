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
import { checkValidtransferCommenceRequest } from "../../../../main/typescript/gateway/server/transfer-commence";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyInitializationResponseMessageHash: string;
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

  dummyInitializationResponseMessageHash = SHA256(
    "initializationResponseMessageData",
  ).toString();

  expiryDate = new Date(2060, 11, 24).toString();
  assetProfile = { expirationDate: expiryDate };
  assetProfileHash = SHA256(JSON.stringify(assetProfile)).toString();

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  sessionData = {
    id: sessionID,
    initializationResponseMessageHash: dummyInitializationResponseMessageHash,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    sourceGatewayDltSystem: "DLT2",
    recipientGatewayDltSystem: "DLT1",
    assetProfile: assetProfile,
    step: 1,
    lastSequenceNumber: sequenceNumber,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("valid transfer commence request", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "originatorDummyPubKey",
    beneficiaryPubkey: "beneficiaryDummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationResponseMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber + 1,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  const requestHash = SHA256(
    JSON.stringify(transferCommenceRequest),
  ).toString();

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  );

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.transferCommenceMessageRequestHash).toBe(requestHash);
  expect(sessionInfo.clientSignatureTransferCommenceRequestMessage).toBe(
    transferCommenceRequest.clientSignature,
  );
  expect(sessionInfo.serverSignatureTransferCommenceResponseMessage).not.toBe(
    "",
  );
  expect(sessionInfo.originatorPubkey).toBe("originatorDummyPubKey");
  expect(sessionInfo.beneficiaryPubkey).toBe("beneficiaryDummyPubKey");
});

test("transfer commence request with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationResponseMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber + 1,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "session Id does not correspond to any open session",
      ),
    );
});

test("transfer commence request with wrong message type", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceResponse,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationResponseMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber + 1,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "wrong message type for TransferCommenceRequest",
      ),
    );
});

test("transfer commence request with wrong signature", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationResponseMessageHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber + 1,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify("wrongData")),
  );

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "TransferCommenceRequest message signature verification failed",
      ),
    );
});

test("transfer commence request with wrong previous message hash", async () => {
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
    sequenceNumber: sequenceNumber + 1,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
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

test("transfer commence request with wrong asset profile hash", async () => {
  const transferCommenceRequest: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCommenceRequest,
    originatorPubkey: "dummyPubKey",
    beneficiaryPubkey: "dummyPubKey",
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    hashPrevMessage: dummyInitializationResponseMessageHash,
    hashAssetProfile: "wrongAssetProfileHash",
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
    sequenceNumber: sequenceNumber + 1,
  };

  transferCommenceRequest.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCommenceRequest)),
  );

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("assetProfile hash not match"),
    );
});
