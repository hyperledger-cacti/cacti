import { randomInt } from "crypto";
import {
  IPluginOdapGatewayConstructorOptions,
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  LockEvidenceV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyTransferCommenceResponseMessageHash: string;
let sessionData: SessionData;
let lockExpiryDate: string;
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

  dummyTransferCommenceResponseMessageHash = SHA256(
    "transferCommenceResponseMessageData",
  ).toString();

  sessionData = {
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    transferCommenceMessageResponseHash: dummyTransferCommenceResponseMessageHash,
    step: 2,
  };

  lockExpiryDate = new Date().setDate(new Date().getDate() + 1).toString();

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("successful lock evidence flow", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(lockEvidenceRequestMessage),
  ).toString();

  const response = await pluginRecipientGateway.lockEvidenceReceived(
    lockEvidenceRequestMessage,
  );

  const responseHash = SHA256(JSON.stringify(response)).toString();

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.lockEvidenceRequestMessageHash).toBe(requestHash);
  expect(sessionInfo.lockEvidenceResponseMessageHash).toBe(responseHash);

  expect(sessionInfo.clientSignatureLockEvidenceRequestMessage).toBe(
    lockEvidenceRequestMessage.clientSignature,
  );
  expect(sessionInfo.serverSignatureLockEvidenceResponseMessage).toBe(
    response.serverSignature,
  );

  expect(response.messageType).toBe(OdapMessageType.LockEvidenceResponse);

  expect(response.clientIdentityPubkey).toBe(pluginSourceGateway.pubKey);
  expect(response.serverIdentityPubkey).toBe(pluginRecipientGateway.pubKey);
  expect(response.hashLockEvidenceRequest).toBe(requestHash);
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

test("lock evidence flow with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();

  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway
    .lockEvidenceReceived(lockEvidenceRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "session Id does not correspond to any open session",
      ),
    );
});

test("lock evidence flow with wrong message type", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway
    .lockEvidenceReceived(lockEvidenceRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("wrong message type for LockEvidenceRequest"),
    );
});

test("lock evidence flow with wrong previous message hash", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommenceAckRequest: "wrongPrevMessageHash",
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway
    .lockEvidenceReceived(lockEvidenceRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("previous message hash does not match"),
    );
});

test("transfer commence flow with invalid claim", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: "",
    lockEvidenceExpiration: new Date(2020, 11, 24).toString(),
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway
    .lockEvidenceReceived(lockEvidenceRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("invalid or expired lock evidence claim"),
    );
});
