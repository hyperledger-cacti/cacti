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
import { checkValidCommitPreparationRequest } from "../../../../main/typescript/gateway/server/commit-preparation";

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

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  sessionData = {
    id: sessionID,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    lockEvidenceResponseMessageHash: dummyLockEvidenceResponseMessageHash,
    step: 2,
    lastSequenceNumber: sequenceNumber,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("valid commit prepare request", async () => {
  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(commitPrepareRequestMessage),
  ).toString();

  await checkValidCommitPreparationRequest(
    commitPrepareRequestMessage,
    pluginRecipientGateway,
  );

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.commitPrepareRequestMessageHash).toBe(requestHash);

  expect(sessionInfo.clientSignatureCommitPreparationRequestMessage).toBe(
    commitPrepareRequestMessage.clientSignature,
  );
});

test("commit prepare request with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();

  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await checkValidCommitPreparationRequest(
    commitPrepareRequestMessage,
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

test("commit prepare request with wrong message type", async () => {
  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await checkValidCommitPreparationRequest(
    commitPrepareRequestMessage,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "wrong message type for CommitPreparationRequest",
      ),
    );
});

test("commit prepare request with wrong previous message hash", async () => {
  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashLockEvidenceAck: "wrongLockEvidenceResponseMessageHash",
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await checkValidCommitPreparationRequest(
    commitPrepareRequestMessage,
    pluginRecipientGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("previous message hash does not match"),
    );
});
