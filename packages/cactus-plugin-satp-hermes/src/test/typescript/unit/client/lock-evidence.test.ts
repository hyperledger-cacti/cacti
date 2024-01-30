import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  SatpMessageType,
  PluginSATPGateway,
} from "../../../../main/typescript/plugin-satp-gateway";
import {
  LockEvidenceV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const LOCK_EVIDENCE_REQUEST_MESSAGE_HASH =
  "dummyLockEvidenceRequestMessageHash";

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;
let sequenceNumber: number;
let sessionID: string;
let step: number;

beforeEach(async () => {
  sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };
  recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
  };

  pluginSourceGateway = new FabricSATPGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSATPGateway(recipientGatewayConstructor);

  if (
    pluginSourceGateway.localRepository?.database == undefined ||
    pluginRecipientGateway.localRepository?.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();

  sequenceNumber = randomInt(100);
  sessionID = uuidV4();
  step = 1;

  const sessionData: SessionData = {
    id: sessionID,
    step: step,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    lockEvidenceRequestMessageHash: LOCK_EVIDENCE_REQUEST_MESSAGE_HASH,
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

test("valid lock evidence response", async () => {
  const lockEvidenceResponse: LockEvidenceV1Response = {
    messageType: SatpMessageType.LockEvidenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashLockEvidenceRequest: LOCK_EVIDENCE_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(lockEvidenceResponse)),
  );

  const messageHash = SHA256(JSON.stringify(lockEvidenceResponse)).toString();

  await pluginSourceGateway.clientHelper.checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.lockEvidenceResponseMessageHash).toBe(
    messageHash,
  );
  expect(retrievedSessionData.serverSignatureLockEvidenceResponseMessage).toBe(
    lockEvidenceResponse.signature,
  );
});

test("lock evidence response invalid because of wrong previous message hash", async () => {
  const lockEvidenceResponse: LockEvidenceV1Response = {
    messageType: SatpMessageType.LockEvidenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashLockEvidenceRequest: "wrongMessageHash",
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(lockEvidenceResponse)),
  );

  await pluginSourceGateway.clientHelper
    .checkValidLockEvidenceResponse(lockEvidenceResponse, pluginSourceGateway)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "previous message hash does not match the one that was sent",
      ),
    );
});

test("lock evidence response invalid because of wrong signature", async () => {
  const lockEvidenceResponse: LockEvidenceV1Response = {
    messageType: SatpMessageType.LockEvidenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashLockEvidenceRequest: LOCK_EVIDENCE_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await pluginSourceGateway.clientHelper
    .checkValidLockEvidenceResponse(lockEvidenceResponse, pluginSourceGateway)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});

test("timeout in lock evidence request because no server gateway is connected", async () => {
  const sessionData: SessionData = {
    id: sessionID,
    step: 1,
    maxRetries: MAX_RETRIES,
    maxTimeout: MAX_TIMEOUT,
    sourceBasePath: "",
    recipientBasePath: "http://wrongpath",
    lastSequenceNumber: 77,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    transferCommenceMessageResponseHash:
      "dummyTransferCommenceMessageResponseHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginSourceGateway.lockAsset(sessionID);

  await pluginSourceGateway.clientHelper
    .sendLockEvidenceRequest(sessionID, pluginSourceGateway, true)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => {
      expect(ex.message).toMatch("message failed.");
    });
});

afterEach(() => {
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
  pluginSourceGateway.remoteRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
});
