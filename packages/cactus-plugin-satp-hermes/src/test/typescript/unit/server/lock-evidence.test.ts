import { randomInt } from "crypto";
import {
  SatpMessageType,
  PluginSATPGateway,
} from "../../../../main/typescript/plugin-satp-gateway";
import {
  LockEvidenceV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";
import { knexRemoteConnection } from "../../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const LOCK_EVIDENCE_CLAIM = "dummyLockEvidenceClaim";

let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;
let dummyTransferCommenceResponseMessageHash: string;
let sessionData: SessionData;
let lockExpiryDate: string;
let sessionID: string;
let sequenceNumber: number;

beforeEach(async () => {
  const sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexRemoteConfig: knexRemoteConnection,
  };
  const recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexRemoteConfig: knexRemoteConnection,
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

  dummyTransferCommenceResponseMessageHash = SHA256(
    "transferCommenceResponseMessageData",
  ).toString();

  lockExpiryDate = new Date().setDate(new Date().getDate() + 1).toString();

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  sessionData = {
    id: sessionID,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    transferCommenceMessageResponseHash:
      dummyTransferCommenceResponseMessageHash,
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

  await pluginSourceGateway.storeProof({
    sessionID: sessionID,
    type: "proof",
    operation: "lock",
    data: LOCK_EVIDENCE_CLAIM,
  });

  if (
    pluginSourceGateway.localRepository?.database == undefined ||
    pluginRecipientGateway.localRepository?.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();
});

afterEach(() => {
  pluginSourceGateway.localRepository?.destroy();
  pluginRecipientGateway.localRepository?.destroy();
});

test("valid lock evidence request", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: SatpMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: LOCK_EVIDENCE_CLAIM,
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(lockEvidenceRequestMessage),
  ).toString();

  await pluginRecipientGateway.serverHelper.checkValidLockEvidenceRequest(
    lockEvidenceRequestMessage,
    pluginRecipientGateway,
  );

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.lockEvidenceRequestMessageHash).toBe(requestHash);
  expect(sessionInfo.lockEvidenceResponseMessageHash).not.toBe("");

  expect(sessionInfo.clientSignatureLockEvidenceRequestMessage).toBe(
    lockEvidenceRequestMessage.signature,
  );
});

test("lock evidence request with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();

  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: wrongSessionId,
    messageType: SatpMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidLockEvidenceRequest(
      lockEvidenceRequestMessage,
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

test("lock evidence request with wrong message type", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: SatpMessageType.LockEvidenceResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidLockEvidenceRequest(
      lockEvidenceRequestMessage,
      pluginRecipientGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("wrong message type for LockEvidenceRequest"),
    );
});

test("lock evidence request with wrong previous message hash", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: SatpMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: "wrongPrevMessageHash",
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidLockEvidenceRequest(
      lockEvidenceRequestMessage,
      pluginRecipientGateway,
    )
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
    messageType: SatpMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: "",
    lockEvidenceExpiration: new Date(2020, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidLockEvidenceRequest(
      lockEvidenceRequestMessage,
      pluginRecipientGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("invalid or expired lock evidence claim"),
    );
});

test("timeout in lock evidence response because no client gateway is connected", async () => {
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
    lockEvidenceClaim: "dummyLockEvidenceClaim",
    lockEvidenceRequestMessageHash: "dummyLockEvidenceRequestMessageHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginRecipientGateway.sessions.set(sessionID, sessionData);

  await pluginRecipientGateway.serverHelper
    .sendLockEvidenceResponse(sessionID, pluginRecipientGateway, true)
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
