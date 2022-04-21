import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import { checkValidCommitPreparationResponse } from "../../../../main/typescript/gateway/client/commit-preparation";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  CommitPreparationV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";

const COMMIT_PREPARATION_REQUEST_MESSAGE_HASH =
  "dummyCommitPreparationRequestMessageHash";

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
    commitPrepareRequestMessageHash: COMMIT_PREPARATION_REQUEST_MESSAGE_HASH,
    lastSequenceNumber: sequenceNumber,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
});

test("valid commit preparation response", async () => {
  const commitPreparationResponse: CommitPreparationV1Response = {
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommitPrep: COMMIT_PREPARATION_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  commitPreparationResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(
      JSON.stringify(commitPreparationResponse),
    ),
  );

  const messageHash = SHA256(
    JSON.stringify(commitPreparationResponse),
  ).toString();

  await checkValidCommitPreparationResponse(
    commitPreparationResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.step).toBe(step + 1);
  expect(retrievedSessionData.commitPrepareResponseMessageHash).toBe(
    messageHash,
  );
  expect(
    retrievedSessionData.serverSignatureCommitPreparationResponseMessage,
  ).toBe(commitPreparationResponse.serverSignature);
});

test("commit preparation response invalid because of wrong previous message hash", async () => {
  const commitPreparationResponse: CommitPreparationV1Response = {
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommitPrep: "wrongMessageHash",
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  commitPreparationResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(
      JSON.stringify(commitPreparationResponse),
    ),
  );

  await checkValidCommitPreparationResponse(
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
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommitPrep: COMMIT_PREPARATION_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  commitPreparationResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await checkValidCommitPreparationResponse(
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
