import {
  IPluginOdapGatewayConstructorOptions,
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  CommitFinalV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";
import { randomInt } from "crypto";
import { checkValidCommitFinalRequest } from "../../../../main/typescript/gateway/server/commit-final";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyCommitPreparationResponseMessageHash: string;
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

  dummyCommitPreparationResponseMessageHash = SHA256(
    "commitPreparationResponseMessageData",
  ).toString();

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  sessionData = {
    id: sessionID,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    commitPrepareResponseMessageHash: dummyCommitPreparationResponseMessageHash,
    step: 2,
    lastSequenceNumber: sequenceNumber,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
  pluginRecipientGateway.sessions.set(sessionID, sessionData);
});

test("valid commit final request", async () => {
  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "dummyFinalClaim",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(commitFinalRequestMessage),
  ).toString();

  await checkValidCommitFinalRequest(
    commitFinalRequestMessage,
    pluginRecipientGateway,
  );

  const sessionInfo = pluginRecipientGateway.sessions.get(sessionID);

  if (sessionInfo == null) throw new Error("Test Failed");

  expect(sessionInfo.commitFinalClaim).toBe("dummyFinalClaim");

  expect(sessionInfo.commitFinalRequestMessageHash).toBe(requestHash);

  expect(sessionInfo.clientSignatureCommitFinalRequestMessage).toBe(
    commitFinalRequestMessage.clientSignature,
  );
});

test("commit final request with wrong sessionId", async () => {
  const wrongSessionId = uuidV4();

  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: wrongSessionId,
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  await checkValidCommitFinalRequest(
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
    messageType: OdapMessageType.CommitFinalResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  await checkValidCommitFinalRequest(
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
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientSignature: "",
    hashCommitPrepareAck: "dummyCommitPreparationResponseMessageHash",
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.clientSignature = pluginSourceGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(commitFinalRequestMessage)),
  );

  await checkValidCommitFinalRequest(
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
