import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { SHA256 } from "crypto-js";
import {
  SatpMessageType,
  PluginSATPGateway,
  ILocalLog,
} from "../../../../main/typescript/plugin-satp-gateway";

import {
  CommitFinalV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";

import { BesuSATPGateway } from "../../../../main/typescript/core/besu-satp-gateway";
import { FabricSATPGateway } from "../../../../main/typescript/core/fabric-satp-gateway";
import { ServerGatewayHelper } from "../../../../main/typescript/core/server-helper";
import { ClientGatewayHelper } from "../../../../main/typescript/core/client-helper";
import { knexRemoteConnection } from "../../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const COMMIT_FINAL_CLAIM = "dummyCommitFinalClaim";

let pluginSourceGateway: PluginSATPGateway;
let pluginRecipientGateway: PluginSATPGateway;
let dummyCommitPreparationResponseMessageHash: string;
let sessionData: SessionData;
let sessionID: string;
let sequenceNumber: number;

beforeEach(async () => {
  const sourceGatewayConstructor = {
    name: "plugin-satp-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidv4(),
    clientHelper: new ClientGatewayHelper(),
    serverHelper: new ServerGatewayHelper(),
    knexRemoteConfig: knexRemoteConnection,
  };

  const recipientGatewayConstructor = {
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

  dummyCommitPreparationResponseMessageHash = SHA256(
    "commitPreparationResponseMessageData",
  ).toString();

  sessionID = uuidv4();
  sequenceNumber = randomInt(100);

  sessionData = {
    id: sessionID,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    commitPrepareResponseMessageHash: dummyCommitPreparationResponseMessageHash,
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
    operation: "delete",
    data: COMMIT_FINAL_CLAIM,
  } as ILocalLog);

  if (
    pluginSourceGateway.localRepository?.database == undefined ||
    pluginRecipientGateway.localRepository?.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.localRepository?.reset();
  await pluginRecipientGateway.localRepository?.reset();
});

test("valid commit final request", async () => {
  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: SatpMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: COMMIT_FINAL_CLAIM,
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(commitFinalRequestMessage),
  ).toString();

  await pluginRecipientGateway.serverHelper.checkValidCommitFinalRequest(
    commitFinalRequestMessage,
    pluginRecipientGateway,
  );

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.commitFinalClaim).toBe(COMMIT_FINAL_CLAIM);

  expect(sessionInfo.commitFinalRequestMessageHash).toBe(requestHash);

  expect(sessionInfo.clientSignatureCommitFinalRequestMessage).toBe(
    commitFinalRequestMessage.signature,
  );
});

test("commit final request with wrong sessionId", async () => {
  const wrongSessionId = uuidv4();

  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: wrongSessionId,
    messageType: SatpMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidCommitFinalRequest(
      commitFinalRequestMessage,
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

test("commit final request with wrong message type", async () => {
  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: SatpMessageType.CommitFinalResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidCommitFinalRequest(
      commitFinalRequestMessage,
      pluginRecipientGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("wrong message type for CommitFinalRequest"),
    );
});

test("commit final request with wrong previous message hash", async () => {
  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: SatpMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommitPrepareAck: "dummyCommitPreparationResponseMessageHash",
    commitFinalClaim: COMMIT_FINAL_CLAIM,
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginSATPGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  await pluginRecipientGateway.serverHelper
    .checkValidCommitFinalRequest(
      commitFinalRequestMessage,
      pluginRecipientGateway,
    )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("previous message hash does not match"),
    );
});

test("timeout in commit final response because no client gateway is connected", async () => {
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
    commitAcknowledgementClaim: "dummyCommitAcknowledgementClaim",
    commitFinalRequestMessageHash: "dummyCommitFinalRequestMessageHash",
    lastMessageReceivedTimestamp: new Date().toString(),
    rollbackProofs: [],
    rollbackActionsPerformed: [],
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await pluginRecipientGateway.serverHelper
    .sendCommitFinalResponse(sessionID, pluginSourceGateway, true)
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
