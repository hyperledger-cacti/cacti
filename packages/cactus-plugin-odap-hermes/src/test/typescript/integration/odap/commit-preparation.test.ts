import { randomInt } from "crypto";
import {
  IPluginOdapGatewayConstructorOptions,
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  CommitPreparationV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyLockEvidenceResponseMessageHash: string;
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

  dummyLockEvidenceResponseMessageHash = SHA256(
    "lockEvidenceResponseMessageData",
  ).toString();

  sessionData = {
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    lockEvidenceResponseMessageHash: dummyLockEvidenceResponseMessageHash,
    step: 2,
  };

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("successful commit prepare flow", async () => {
  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(commitPrepareRequestMessage),
  ).toString();

  const response = await pluginRecipientGateway.commitPrepareReceived(
    commitPrepareRequestMessage,
  );

  const responseHash = SHA256(JSON.stringify(response)).toString();

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.commitPrepareRequestMessageHash).toBe(requestHash);
  expect(sessionInfo.commitPrepareResponseMessageHash).toBe(responseHash);

  expect(sessionInfo.clientSignatureCommitPreparationRequestMessage).toBe(
    commitPrepareRequestMessage.clientSignature,
  );
  expect(sessionInfo.serverSignatureCommitPreparationResponseMessage).toBe(
    response.serverSignature,
  );

  expect(response.messageType).toBe(OdapMessageType.CommitPreparationResponse);

  expect(response.clientIdentityPubkey).toBe(pluginSourceGateway.pubKey);
  expect(response.serverIdentityPubkey).toBe(pluginRecipientGateway.pubKey);
  expect(response.hashCommitPrep).toBe(requestHash);
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

test("commit prepare flow with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();

  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await pluginRecipientGateway
    .commitPrepareReceived(commitPrepareRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "session Id does not correspond to any open session",
      ),
    );
});

test("commit prepare flow with wrong message type", async () => {
  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await pluginRecipientGateway
    .commitPrepareReceived(commitPrepareRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "wrong message type for CommitPreparationRequest",
      ),
    );
});

test("commit prepare flow with wrong previous message hash", async () => {
  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: "wrongLockEvidenceResponseMessageHash",
    sequenceNumber: sequenceNumber,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await pluginRecipientGateway
    .commitPrepareReceived(commitPrepareRequestMessage)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("previous message hash does not match"),
    );
});
