import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import {
  IPluginSatpGatewayConstructorOptions,
  SatpMessageType,
  PluginSATPGateway,
} from "../../../../main/typescript/plugin-satp-gateway";
import {
  CommitPreparationV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const COMMIT_PREPARATION_REQUEST_MESSAGE_HASH =
  "dummyCommitPreparationRequestMessageHash";

let sourceGatewayConstructor: IPluginSatpGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginSatpGatewayConstructorOptions;
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

  expect(pluginSourceGateway.localRepository?.database).not.toBeUndefined();
  expect(pluginRecipientGateway.localRepository?.database).not.toBeUndefined();

  expect(pluginSourceGateway.remoteRepository?.database).not.toBeUndefined();
  expect(pluginRecipientGateway.remoteRepository?.database).not.toBeUndefined();

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();

  await pluginSourceGateway.remoteRepository?.reset();
  await pluginRecipientGateway.remoteRepository?.reset();

  sequenceNumber = randomInt(100);
  sessionID = uuidV4();
  step = 1;

  const sessionData: SessionData = {
    id: sessionID,
    step: step,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    commitPrepareRequestMessageHash: COMMIT_PREPARATION_REQUEST_MESSAGE_HASH,
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

test("valid commit preparation response", async () => {
  const commitPreparationResponse: CommitPreparationV1Response = {
    messageType: SatpMessageType.CommitPreparationResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommitPrep: COMMIT_PREPARATION_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitPreparationResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(
      JSON.stringify(commitPreparationResponse),
    ),
  );

  const messageHash = SHA256(
    JSON.stringify(commitPreparationResponse),
  ).toString();

  await pluginSourceGateway.clientHelper.checkValidCommitPreparationResponse(
    commitPreparationResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.commitPrepareResponseMessageHash).toBe(
    messageHash,
  );
  expect(
    retrievedSessionData.serverSignatureCommitPreparationResponseMessage,
  ).toBe(commitPreparationResponse.signature);
});

test("commit preparation response invalid because of wrong previous message hash", async () => {
  const commitPreparationResponse: CommitPreparationV1Response = {
    messageType: SatpMessageType.CommitPreparationResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommitPrep: "wrongMessageHash",
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitPreparationResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(
      JSON.stringify(commitPreparationResponse),
    ),
  );

  await pluginSourceGateway.clientHelper
    .checkValidCommitPreparationResponse(
      commitPreparationResponse,
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

test("commit preparation response invalid because of wrong signature", async () => {
  const commitPreparationResponse: CommitPreparationV1Response = {
    messageType: SatpMessageType.CommitPreparationResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommitPrep: COMMIT_PREPARATION_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitPreparationResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await pluginSourceGateway.clientHelper
    .checkValidCommitPreparationResponse(
      commitPreparationResponse,
      pluginSourceGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});

test("timeout in commit preparation request because no server gateway is connected", async () => {
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
    lockEvidenceResponseMessageHash: "dummyLockEvidenceResponseMessageHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginSourceGateway.clientHelper
    .sendCommitPreparationRequest(sessionID, pluginSourceGateway, true)
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