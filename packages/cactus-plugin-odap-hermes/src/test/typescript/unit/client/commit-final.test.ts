import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import { checkValidCommitFinalResponse } from "../../../../main/typescript/gateway/client/commit-final";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  CommitFinalV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";

const COMMIT_FINAL_REQUEST_MESSAGE_HASH = "dummyCommitFinalRequestMessageHash";
const COMMIT_ACK_CLAIM = "dummyCommitAckClaim";

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
    commitFinalRequestMessageHash: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    lastSequenceNumber: sequenceNumber,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
});

test("valid commit final response", async () => {
  const commitFinalResponse: CommitFinalV1Response = {
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(commitFinalResponse)),
  );

  const messageHash = SHA256(JSON.stringify(commitFinalResponse)).toString();

  await checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway);

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.step).toBe(step + 1);
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
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: "wrongMessageHash",
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(commitFinalResponse)),
  );

  await checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway)
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
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});
