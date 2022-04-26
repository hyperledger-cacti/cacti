import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import http, { Server } from "http";
import { create } from "ipfs-http-client";
import { SHA256 } from "crypto-js";
import {
  IPluginOdapGatewayConstructorOptions,
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import {
  CommitFinalV1Request,
  SessionData,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import {
  checkValidCommitFinalRequest,
  sendCommitFinalResponse,
} from "../../../../main/typescript/gateway/server/commit-final";
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

const COMMIT_FINAL_CLAIM = "dummyCommitFinalClaim";

let sourceGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let recipientGatewayConstructor: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let dummyCommitPreparationResponseMessageHash: string;
let sessionData: SessionData;
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
    instanceId: uuidv4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexClientConnection,
  };

  recipientGatewayConstructor = {
    name: "plugin-odap-gateway#recipientGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidv4(),
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

  await pluginSourceGateway.storeOdapProof({
    sessionID: sessionID,
    type: "proof",
    operation: "delete",
    data: COMMIT_FINAL_CLAIM,
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

afterEach(async () => {
  await pluginSourceGateway.database?.destroy();
  await pluginRecipientGateway.database?.destroy();
});

test("valid commit final request", async () => {
  const commitFinalRequestMessage: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: COMMIT_FINAL_CLAIM,
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
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
    messageType: OdapMessageType.CommitFinalRequest,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    signature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
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
    signature: "",
    hashCommitPrepareAck: dummyCommitPreparationResponseMessageHash,
    commitFinalClaim: "",
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
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
    signature: "",
    hashCommitPrepareAck: "dummyCommitPreparationResponseMessageHash",
    commitFinalClaim: COMMIT_FINAL_CLAIM,
    sequenceNumber: sequenceNumber + 1,
  };

  commitFinalRequestMessage.signature = PluginOdapGateway.bufArray2HexStr(
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

  await sendCommitFinalResponse(sessionID, pluginSourceGateway, true)
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
  await pluginSourceGateway.database?.destroy();
  await pluginRecipientGateway.database?.destroy();
});

afterEach(() => {
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
