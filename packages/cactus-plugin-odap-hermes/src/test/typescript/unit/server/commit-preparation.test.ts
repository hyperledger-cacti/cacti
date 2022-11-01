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
import { BesuOdapGateway } from "../../../../main/typescript/gateway/besu-odap-gateway";
import { FabricOdapGateway } from "../../../../main/typescript/gateway/fabric-odap-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/gateway/server/server-helper";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyLockEvidenceResponseMessageHash: string;
let sessionData: SessionData;
let sessionID: string;
let sequenceNumber: number;

beforeEach(async () => {
  sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };
  recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };

  pluginSourceGateway = new FabricOdapGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuOdapGateway(recipientGatewayConstructor);

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
    maxTimeout: 0,
    maxRetries: 0,
    rollbackProofs: [],
    sourceBasePath: "",
    recipientBasePath: "",
    rollbackActionsPerformed: [],
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
    signature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(commitPrepareRequestMessage),
  ).toString();

  await pluginRecipientGateway.serverHelper.checkValidCommitPreparationRequest(
    commitPrepareRequestMessage,
    pluginRecipientGateway,
  );

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.commitPrepareRequestMessageHash).toBe(requestHash);

  expect(sessionInfo.clientSignatureCommitPreparationRequestMessage).toBe(
    commitPrepareRequestMessage.signature,
  );
});

test("commit prepare request with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();

  const commitPrepareRequestMessage: CommitPreparationV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.CommitPreparationRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidCommitPreparationRequest(
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
    signature: "",
    hashLockEvidenceAck: dummyLockEvidenceResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidCommitPreparationRequest(
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
    signature: "",
    hashLockEvidenceAck: "wrongLockEvidenceResponseMessageHash",
    sequenceNumber: sequenceNumber + 1,
  };

  commitPrepareRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitPrepareRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidCommitPreparationRequest(
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

test("timeout in commit preparation response because no client gateway is connected", async () => {
  const sessionData: SessionData = {
    id: sessionID,
    step: 1,
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    sourceBasePath: "http://wrongpath",
    recipientBasePath: "",
    lastSequenceNumber: 77,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    commitPrepareRequestMessageHash: "dummyCommitPrepareRequestMessageHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginRecipientGateway.serverHelper
    .sendCommitPreparationResponse(sessionID, pluginSourceGateway, true)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => {
      expect(ex.message).toMatch("message failed.");
    });
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
