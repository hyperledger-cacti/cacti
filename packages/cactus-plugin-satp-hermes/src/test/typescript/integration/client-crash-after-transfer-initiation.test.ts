import http, { Server } from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
import bodyParser from "body-parser";
import express, { Express } from "express";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import {
  IListenOptions,
  LogLevelDesc,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  IPluginSatpGatewayConstructorOptions,
  PluginSatpGateway,
} from "../../../main/typescript/gateway/plugin-satp-gateway";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import {
  AssetProfile,
  ClientV1Request,
} from "../../../main/typescript/public-api";
import { makeSessionDataChecks } from "../make-checks";

import { BesuSatpGateway } from "../../../main/typescript/gateway/besu-satp-gateway";
import { FabricSatpGateway } from "../../../main/typescript/gateway/fabric-satp-gateway";
import { ServerGatewayHelper } from "../../../main/typescript/gateway/server/server-helper";
import { ClientGatewayHelper } from "../../../main/typescript/gateway/client/client-helper";

import { knexClientConnection, knexServerConnection } from "../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const FABRIC_ASSET_ID = uuidv4();
const BESU_ASSET_ID = uuidv4();

const logLevel: LogLevelDesc = "INFO";

let serverGatewayPluginOptions: IPluginSatpGatewayConstructorOptions;
let clientGatewayPluginOptions: IPluginSatpGatewayConstructorOptions;

let pluginSourceGateway: PluginSatpGateway;
let pluginRecipientGateway: PluginSatpGateway;

let ipfsContainer: GoIpfsTestContainer;
let ipfsApiHost: string;
let ipfsServer: Server;

let sourceGatewayServer: Server;
let recipientGatewayserver: Server;

let serverGatewayApiHost: string;
let clientGatewayApiHost: string;

let clientRequest: ClientV1Request;

let serverExpressApp: Express;
let serverListenOptions: IListenOptions;

let clientExpressApp: Express;
let clientListenOptions: IListenOptions;

beforeAll(async () => {
  {
    // Define IPFS connection
    ipfsContainer = new GoIpfsTestContainer({ logLevel });
    expect(ipfsContainer).not.toBeUndefined();

    const container = await ipfsContainer.start();
    expect(container).not.toBeUndefined();

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    ipfsServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: ipfsServer,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    ipfsApiHost = `http://${address}:${port}`;

    const config = new Configuration({ basePath: ipfsApiHost });
    const ipfsApi = new ObjectStoreIpfsApi(config);

    expect(ipfsApi).not.toBeUndefined();

    const ipfsApiUrl = await ipfsContainer.getApiUrl();

    const kuboRpcModule = await import("kubo-rpc-client");
    const ipfsClientOrOptions = kuboRpcModule.create({
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
  }
  {
    // Server Gateway configuration
    serverGatewayPluginOptions = {
      name: "cactus-plugin#satpGateway",
      dltIDs: ["DLT1"],
      instanceId: uuidv4(),
      ipfsPath: ipfsApiHost,
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      clientHelper: new ClientGatewayHelper(),
      serverHelper: new ServerGatewayHelper(),
      knexConfig: knexServerConnection,
    };

    serverExpressApp = express();
    serverExpressApp.use(bodyParser.json({ limit: "250mb" }));
    recipientGatewayserver = http.createServer(serverExpressApp);
    serverListenOptions = {
      hostname: "127.0.0.1",
      port: 3000,
      server: recipientGatewayserver,
    };

    const addressInfo = (await Servers.listen(
      serverListenOptions,
    )) as AddressInfo;

    const { address, port } = addressInfo;
    serverGatewayApiHost = `http://${address}:${port}`;

    pluginRecipientGateway = new BesuSatpGateway(
      serverGatewayPluginOptions,
    );

    expect(pluginRecipientGateway.database).not.toBeUndefined();

    await pluginRecipientGateway.database?.migrate.rollback();
    await pluginRecipientGateway.database?.migrate.latest();

    await pluginRecipientGateway.registerWebServices(serverExpressApp);
  }
  {
    // Client Gateway configuration
    clientGatewayPluginOptions = {
      name: "cactus-plugin#satpGateway",
      dltIDs: ["DLT2"],
      instanceId: uuidv4(),
      ipfsPath: ipfsApiHost,
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      clientHelper: new ClientGatewayHelper(),
      serverHelper: new ServerGatewayHelper(),
      knexConfig: knexClientConnection,
    };

    clientExpressApp = express();
    clientExpressApp.use(bodyParser.json({ limit: "250mb" }));
    sourceGatewayServer = http.createServer(clientExpressApp);
    clientListenOptions = {
      hostname: "127.0.0.1",
      port: 2000,
      server: sourceGatewayServer,
    };

    const addressInfo = (await Servers.listen(
      clientListenOptions,
    )) as AddressInfo;

    const { address, port } = addressInfo;
    clientGatewayApiHost = `http://${address}:${port}`;

    pluginSourceGateway = new FabricSatpGateway(clientGatewayPluginOptions);

    if (pluginSourceGateway.database == undefined) {
      throw new Error("Database is not correctly initialized");
    }

    await pluginSourceGateway.database.migrate.rollback();
    await pluginSourceGateway.database.migrate.latest();

    await pluginSourceGateway.registerWebServices(clientExpressApp);

    const expiryDate = new Date(2060, 11, 24).toString();
    const assetProfile: AssetProfile = { expirationDate: expiryDate };

    clientRequest = {
      clientGatewayConfiguration: {
        apiHost: clientGatewayApiHost,
      },
      serverGatewayConfiguration: {
        apiHost: serverGatewayApiHost,
      },
      version: "0.0.0",
      loggingProfile: "dummyLoggingProfile",
      accessControlProfile: "dummyAccessControlProfile",
      applicationProfile: "dummyApplicationProfile",
      payloadProfile: {
        assetProfile: assetProfile,
        capabilities: "",
      },
      assetProfile: assetProfile,
      assetControlProfile: "dummyAssetControlProfile",
      beneficiaryPubkey: "dummyPubKey",
      clientDltSystem: "DLT1",
      originatorPubkey: "dummyPubKey",
      recipientGatewayDltSystem: "DLT2",
      recipientGatewayPubkey: pluginRecipientGateway.pubKey,
      serverDltSystem: "DLT2",
      sourceGatewayDltSystem: "DLT1",
      clientIdentityPubkey: "",
      serverIdentityPubkey: "",
      maxRetries: MAX_RETRIES,
      maxTimeout: MAX_TIMEOUT,
      sourceLedgerAssetID: FABRIC_ASSET_ID,
      recipientLedgerAssetID: BESU_ASSET_ID,
    };
  }
});

beforeEach(async () => {
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

test("successful run ODAP after client gateway crashed after after receiving transfer initiation response", async () => {
  const sessionID = pluginSourceGateway.configureOdapSession(clientRequest);

  const transferInitializationRequest =
    await pluginSourceGateway.clientHelper.sendTransferInitializationRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (transferInitializationRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidInitializationRequest(
    transferInitializationRequest,
    pluginRecipientGateway,
  );

  const transferInitializationResponse =
    await pluginRecipientGateway.serverHelper.sendTransferInitializationResponse(
      transferInitializationRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (transferInitializationResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidInitializationResponse(
    transferInitializationResponse,
    pluginSourceGateway,
  );

  // now we simulate the crash of the client gateway
  pluginSourceGateway.database?.destroy();
  await Servers.shutdown(sourceGatewayServer);

  clientExpressApp = express();
  clientExpressApp.use(bodyParser.json({ limit: "250mb" }));
  sourceGatewayServer = http.createServer(clientExpressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 2000,
    server: sourceGatewayServer,
  };

  await Servers.listen(listenOptions);

  pluginSourceGateway = new FabricSatpGateway(clientGatewayPluginOptions);
  await pluginSourceGateway.registerWebServices(clientExpressApp);

  // client gateway self-healed and is back online
  await pluginSourceGateway.recoverOpenSessions(true);

  await makeSessionDataChecks(
    pluginSourceGateway,
    pluginRecipientGateway,
    sessionID,
  );
});

afterAll(async () => {
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(ipfsServer);
  await Servers.shutdown(sourceGatewayServer);
  await Servers.shutdown(recipientGatewayserver);
  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();
});
