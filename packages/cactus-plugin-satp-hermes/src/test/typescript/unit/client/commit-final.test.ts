import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidv4 } from "uuid";
import {
  SatpMessageType,
  PluginSATPGateway,
} from "../../../../main/typescript/plugin-satp-gateway";
import {
  CommitFinalV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";

import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { knexRemoteConnection } from "../../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const COMMIT_FINAL_REQUEST_MESSAGE_HASH = "dummyCommitFinalRequestMessageHash";
const COMMIT_ACK_CLAIM = "dummyCommitAckClaim";

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
    instanceId: uuidv4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexRemoteConfig: knexRemoteConnection,
  };
  recipientGatewayConstructor = {
    name: "plugin-satp-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidv4(),
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

  sequenceNumber = randomInt(100);
  sessionID = uuidv4();
  step = 1;

  const sessionData: SessionData = {
    id: sessionID,
    step: step,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    commitFinalRequestMessageHash: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    lastSequenceNumber: sequenceNumber,
    maxTimeout: 0,
    maxRetries: 0,
    rollbackProofs: [],
    sourceBasePath: "",
    recipientBasePath: "",
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginRecipientGateway.storeProof({
    sessionID: sessionID,
    type: "proof",
    operation: "create",
    data: COMMIT_ACK_CLAIM,
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

afterEach(async () => {
  await pluginSourceGateway.localRepository?.destroy();
  await pluginRecipientGateway.localRepository?.destroy();
});

test("valid commit final response", async () => {
  const commitFinalResponse: CommitFinalV1Response = {
    messageType: SatpMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(commitFinalResponse)),
  );

  const messageHash = SHA256(JSON.stringify(commitFinalResponse)).toString();

  await pluginSourceGateway.clientHelper.checkValidCommitFinalResponse(
    commitFinalResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.commitAcknowledgementClaim).toBe(
    COMMIT_ACK_CLAIM,
  );
  expect(retrievedSessionData.commitFinalRequestMessageHash).toBe(
    COMMIT_FINAL_REQUEST_MESSAGE_HASH,
  );
  expect(retrievedSessionData.commitFinalResponseMessageHash).toBe(messageHash);
});

test("commit final response invalid because of wrong previous message hash", async () => {
  const commitFinalResponse: CommitFinalV1Response = {
    messageType: SatpMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: "wrongMessageHash",
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(commitFinalResponse)),
  );

  await pluginSourceGateway.clientHelper
    .checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch(
        "previous message hash does not match the one that was sent",
      ),
    );
});

test("commit final response invalid because of wrong signature", async () => {
  const commitFinalResponse: CommitFinalV1Response = {
    messageType: SatpMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.signature = PluginSATPGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await pluginSourceGateway.clientHelper
    .checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});

test("timeout in commit final request because no server gateway is connected", async () => {
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
    commitFinalClaim: "dummyCommitFinalClaim",
    commitPrepareResponseMessageHash: "dummyCommitPrepareResponseMessageHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginSourceGateway.clientHelper
    .sendCommitFinalRequest(sessionID, pluginSourceGateway, true)
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
