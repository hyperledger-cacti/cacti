import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import { checkValidLockEvidenceResponse } from "../../../../main/typescript/gateway/client/lock-evidence";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  LockEvidenceV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";

const LOCK_EVIDENCE_REQUEST_MESSAGE_HASH =
  "dummyLockEvidenceRequestMessageHash";

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let sequenceNumber: number;
let sessionID: string;
let step: number;

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
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
});

test("valid lock evidence response", async () => {
  const lockEvidenceResponse: LockEvidenceV1Response = {
    messageType: OdapMessageType.LockEvidenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashLockEvidenceRequest: LOCK_EVIDENCE_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(lockEvidenceResponse)),
  );

  const messageHash = SHA256(JSON.stringify(lockEvidenceResponse)).toString();

  await checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.step).toBe(step + 1);
  expect(retrievedSessionData.lockEvidenceResponseMessageHash).toBe(
    messageHash,
  );
  expect(retrievedSessionData.serverSignatureLockEvidenceResponseMessage).toBe(
    lockEvidenceResponse.serverSignature,
  );
});

test("lock evidence response invalid because of wrong previous message hash", async () => {
  const lockEvidenceResponse: LockEvidenceV1Response = {
    messageType: OdapMessageType.LockEvidenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashLockEvidenceRequest: "wrongMessageHash",
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(lockEvidenceResponse)),
  );

  await checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
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

test("lock evidence response invalid because of wrong signature", async () => {
  const lockEvidenceResponse: LockEvidenceV1Response = {
    messageType: OdapMessageType.LockEvidenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashLockEvidenceRequest: LOCK_EVIDENCE_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  lockEvidenceResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});
