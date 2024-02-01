import {
  IPluginSatpGatewayConstructorOptions,
  OdapMessageType,
  PluginSatpGateway,
} from "../../../../main/typescript/gateway/plugin-satp-gateway";
import {
  SessionData,
  TransferCompleteV1Request,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";
import { randomInt } from "crypto";
import { BesuSatpGateway } from "../../../../main/typescript/gateway/besu-satp-gateway";
import { FabricSatpGateway } from "../../../../main/typescript/gateway/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../../main/typescript/gateway/server/server-helper";

let sourceGatewayConstructor: IPluginSatpGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginSatpGatewayConstructorOptions;
let pluginSourceGateway: PluginSatpGateway;
let pluginRecipientGateway: PluginSatpGateway;
let dummyCommitFinalResponseMessageHash: string;
let dummyTransferCommenceResponseMessageHash: string;
let sessionData: SessionData;
let sessionID: string;
let sequenceNumber: number;

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

  pluginSourceGateway = new FabricSatpGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new BesuSatpGateway(recipientGatewayConstructor);

  if (
    pluginSourceGateway.database == undefined ||
    pluginRecipientGateway.database == undefined
  ) {
    throw new Error("Database is not correctly initialized");
  }

  await pluginSourceGateway.database.migrate.rollback();
  await pluginSourceGateway.database.migrate.latest();
  await pluginRecipientGateway.database.migrate.rollback();
  await pluginRecipientGateway.database.migrate.latest();

  dummyCommitFinalResponseMessageHash = SHA256(
    "commitFinalResponseMessageData",
  ).toString();

  dummyTransferCommenceResponseMessageHash = SHA256(
    "transferCommenceResponseMessageData",
  ).toString();

  sessionID = uuidV4();
  sequenceNumber = randomInt(100);

  sessionData = {
    id: sessionID,
    sourceGatewayPubkey: pluginSourceGateway.pubKey,
    recipientGatewayPubkey: pluginRecipientGateway.pubKey,
    commitFinalResponseMessageHash: dummyCommitFinalResponseMessageHash,
    transferCommenceMessageRequestHash:
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
});

test("dummy test for transfer complete flow", async () => {
  const transferCompleteRequestMessage: TransferCompleteV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.TransferCompleteRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashTransferCommence: dummyTransferCommenceResponseMessageHash,
    hashCommitFinalAck: dummyCommitFinalResponseMessageHash,
    sequenceNumber: sequenceNumber + 1,
  };

  transferCompleteRequestMessage.signature = PluginSatpGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(transferCompleteRequestMessage)),
  );

  pluginRecipientGateway.serverHelper
    .checkValidTransferCompleteRequest(
      transferCompleteRequestMessage,
      pluginRecipientGateway,
    )
    .catch(() => {
      throw new Error("Test failed");
    });
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
