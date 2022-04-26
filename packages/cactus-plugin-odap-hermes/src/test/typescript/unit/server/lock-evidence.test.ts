import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import http, { Server } from "http";
import { create } from "ipfs-http-client";
import {
  IPluginOdapGatewayConstructorOptions,
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import {
  LockEvidenceV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";
import {
  checkValidLockEvidenceRequest,
  sendLockEvidenceResponse,
} from "../../../../main/typescript/gateway/server/lock-evidence";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import express from "express";
import { AddressInfo } from "net";
import { knexClientConnection, knexServerConnection } from "../../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const logLevel: LogLevelDesc = "TRACE";

const LOCK_EVIDENCE_CLAIM = "dummyLockEvidenceClaim";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyTransferCommenceResponseMessageHash: string;
let sessionData: SessionData;
let lockExpiryDate: string;
let sessionID: string;
let sequenceNumber: number;

let ipfsContainer: GoIpfsTestContainer;
let ipfsServer: Server;
let ipfsApiHost: string;

beforeAll(async () => {
  ipfsContainer = new GoIpfsTestContainer({ logLevel });
  expect(ipfsContainer).not.toBeUndefined();

  const container = await ipfsContainer.start();
  expect(container).not.toBeUndefined();

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  ipfsServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server: ipfsServer,
  };

  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  ipfsApiHost = `http://${address}:${port}`;

  const config = new Configuration({ basePath: ipfsApiHost });
  const apiClient = new ObjectStoreIpfsApi(config);

  expect(apiClient).not.toBeUndefined();

  const ipfsApiUrl = await ipfsContainer.getApiUrl();

  const ipfsClientOrOptions = create({
    url: ipfsApiUrl,
  });

  const instanceId = uuidv4();
  const pluginIpfs = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId,
    ipfsClientOrOptions,
  });

  await pluginIpfs.getOrCreateWebServices();
  await pluginIpfs.registerWebServices(expressApp);
});

beforeEach(async () => {
  sourceGatewayConstructor = {
    name: "plugin-odap-gateway#sourceGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexClientConnection,
  };
  recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidV4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexServerConnection,
  };

  pluginSourceGateway = new PluginOdapGateway(sourceGatewayConstructor);
  pluginRecipientGateway = new PluginOdapGateway(recipientGatewayConstructor);

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
    transferCommenceMessageResponseHash: dummyTransferCommenceResponseMessageHash,
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

  await pluginSourceGateway.storeOdapProof({
    sessionID: sessionID,
    type: "proof",
    operation: "lock",
    data: LOCK_EVIDENCE_CLAIM,
  });

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
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});

test("valid lock evidence request", async () => {
  const lockEvidenceRequestMessage: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: LOCK_EVIDENCE_CLAIM,
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  const requestHash = SHA256(
    JSON.stringify(lockEvidenceRequestMessage),
  ).toString();

  await checkValidLockEvidenceRequest(
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
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await checkValidLockEvidenceRequest(
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
    messageType: OdapMessageType.LockEvidenceResponse,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await checkValidLockEvidenceRequest(
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
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: "wrongPrevMessageHash",
    lockEvidenceClaim: lockExpiryDate.toString(),
    lockEvidenceExpiration: new Date(2060, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await checkValidLockEvidenceRequest(
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
    messageType: OdapMessageType.LockEvidenceRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommenceAckRequest: dummyTransferCommenceResponseMessageHash,
    lockEvidenceClaim: "",
    lockEvidenceExpiration: new Date(2020, 11, 24).toString(),
    sequenceNumber: sequenceNumber + 1,
  };

  lockEvidenceRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
    pluginSourceGateway.sign(JSON.stringify(lockEvidenceRequestMessage)),
  );

  await checkValidLockEvidenceRequest(
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

  pluginSourceGateway.sessions.set(sessionID, sessionData);

  await sendLockEvidenceResponse(sessionID, pluginSourceGateway, true)
    .then(() => {
      throw new Error("Test Failed");
    })
    .catch((ex: Error) => {
      expect(ex.message).toMatch("Timeout exceeded.");
    });
});

afterAll(async () => {
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(ipfsServer);
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
