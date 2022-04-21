import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import { v4 as uuidV4 } from "uuid";
import { checkValidTransferCommenceResponse } from "../../../../main/typescript/gateway/client/transfer-commence";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  SessionData,
  TransferCommenceV1Response,
} from "../../../../main/typescript/public-api";

const COMMENCE_REQUEST_MESSAGE_HASH = "dummyCommenceRequestMessageHash";

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
    transferCommenceMessageRequestHash: COMMENCE_REQUEST_MESSAGE_HASH,
    lastSequenceNumber: sequenceNumber,
  };

  pluginSourceGateway.sessions.set(sessionID, sessionData);
});

test("valid transfer commence response", async () => {
  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommenceRequest: COMMENCE_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(transferCommenceResponse)),
  );

  const messageHash = SHA256(
    JSON.stringify(transferCommenceResponse),
  ).toString();

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  );

  const retrievedSessionData = pluginSourceGateway.sessions.get(sessionID);

  if (retrievedSessionData == undefined) throw new Error("Test Failed.");

  expect(retrievedSessionData.id).toBe(sessionID);
  expect(retrievedSessionData.step).toBe(step + 1);
  expect(retrievedSessionData.transferCommenceMessageResponseHash).toBe(
    messageHash,
  );
  expect(
    retrievedSessionData.serverSignatureTransferCommenceResponseMessage,
  ).toBe(transferCommenceResponse.serverSignature);
});

test("transfer commence response invalid because of wrong previous message hash", async () => {
  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommenceRequest: "wrongMessageHash",
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(transferCommenceResponse)),
  );

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
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

test("transfer commence response invalid because of wrong signature", async () => {
  const transferCommenceResponse: TransferCommenceV1Response = {
    messageType: OdapMessageType.TransferCommenceResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    hashCommenceRequest: COMMENCE_REQUEST_MESSAGE_HASH,
    serverSignature: "",
    sequenceNumber: sequenceNumber,
  };

  transferCommenceResponse.serverSignature = pluginRecipientGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign("somethingWrong"),
  );

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  )
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) =>
      expect(ex.message).toMatch("message signature verification failed"),
    );
});
