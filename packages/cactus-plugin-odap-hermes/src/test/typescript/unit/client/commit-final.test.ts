import { randomInt } from "crypto";
import { SHA256 } from "crypto-js";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import http, { Server } from "http";
import { create } from "ipfs-http-client";
import {
  checkValidCommitFinalResponse,
  sendCommitFinalRequest,
} from "../../../../main/typescript/gateway/client/commit-final";
import {
  OdapMessageType,
  PluginOdapGateway,
} from "../../../../main/typescript/gateway/plugin-odap-gateway";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import {
  CommitFinalV1Response,
  SessionData,
} from "../../../../main/typescript/public-api";
import {
  LogLevelDesc,
  IListenOptions,
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

const COMMIT_FINAL_REQUEST_MESSAGE_HASH = "dummyCommitFinalRequestMessageHash";
const COMMIT_ACK_CLAIM = "dummyCommitAckClaim";

let sourceGatewayConstructor;
let recipientGatewayConstructor;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;
let sequenceNumber: number;
let sessionID: string;
let step: number;

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

  await pluginRecipientGateway.storeOdapProof({
    sessionID: sessionID,
    type: "proof",
    operation: "create",
    data: COMMIT_ACK_CLAIM,
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

test("valid commit final response", async () => {
  const commitFinalResponse: CommitFinalV1Response = {
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: COMMIT_FINAL_REQUEST_MESSAGE_HASH,
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.signature = PluginOdapGateway.bufArray2HexStr(
    await pluginRecipientGateway.sign(JSON.stringify(commitFinalResponse)),
  );

  const messageHash = SHA256(JSON.stringify(commitFinalResponse)).toString();

  await checkValidCommitFinalResponse(commitFinalResponse, pluginSourceGateway);

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
    messageType: OdapMessageType.CommitFinalResponse,
    sessionID: sessionID,
    serverIdentityPubkey: pluginRecipientGateway.pubKey,
    clientIdentityPubkey: pluginSourceGateway.pubKey,
    commitAcknowledgementClaim: COMMIT_ACK_CLAIM,
    hashCommitFinal: "wrongMessageHash",
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.signature = PluginOdapGateway.bufArray2HexStr(
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
    signature: "",
    sequenceNumber: sequenceNumber,
  };

  commitFinalResponse.signature = PluginOdapGateway.bufArray2HexStr(
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

  await sendCommitFinalRequest(sessionID, pluginSourceGateway, true)
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
