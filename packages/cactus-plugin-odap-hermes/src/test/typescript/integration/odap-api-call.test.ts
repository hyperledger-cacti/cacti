import http, { Server } from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { create } from "ipfs-http-client";
import bodyParser from "body-parser";
import express from "express";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { DefaultApi as OdapApi } from "../../../main/typescript/public-api";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";

import { Configuration } from "@hyperledger/cactus-core-api";

import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import {
  PluginOdapGateway,
  IPluginOdapGatewayConstructorOptions,
} from "../../../main/typescript/gateway/plugin-odap-gateway";
import {
  AssetProfile,
  ClientV1Request,
} from "../../../main/typescript/public-api";
import { makeSessionDataChecks } from "../make-checks";
import { knexClientConnection, knexServerConnection } from "../knex.config";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

let ipfsApiHost: string;
let ipfsContainer: GoIpfsTestContainer;

const logLevel: LogLevelDesc = "TRACE";

let sourceGatewayServer: Server;
let recipientGatewayserver: Server;
let ipfsServer: Server;

let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;

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

test("runs ODAP between two gateways via openApi", async () => {
  const odapClientGatewayPluginOptions: IPluginOdapGatewayConstructorOptions = {
    name: "cactus-plugin#odapGateway",
    dltIDs: ["DLT2"],
    instanceId: uuidv4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexClientConnection,
  };

  const odapServerGatewayPluginOptions: IPluginOdapGatewayConstructorOptions = {
    name: "cactus-plugin#odapGateway",
    dltIDs: ["DLT1"],
    instanceId: uuidv4(),
    ipfsPath: ipfsApiHost,
    knexConfig: knexServerConnection,
  };

  pluginSourceGateway = new PluginOdapGateway(odapClientGatewayPluginOptions);
  pluginRecipientGateway = new PluginOdapGateway(
    odapServerGatewayPluginOptions,
  );

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

  let odapServerGatewayApiHost: string;

  {
    // Server Gateway configuration
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    recipientGatewayserver = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 3000,
      server: recipientGatewayserver,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    odapServerGatewayApiHost = `http://${address}:${port}`;

    await pluginRecipientGateway.getOrCreateWebServices();
    await pluginRecipientGateway.registerWebServices(expressApp);
  }
  {
    // Client Gateway configuration
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    sourceGatewayServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 2000,
      server: sourceGatewayServer,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    const odapClientGatewayApiHost = `http://${address}:${port}`;

    await pluginSourceGateway.getOrCreateWebServices();
    await pluginSourceGateway.registerWebServices(expressApp);

    const odapApiConfig = new Configuration({
      basePath: odapClientGatewayApiHost,
    });
    const apiClient = new OdapApi(odapApiConfig);

    const expiryDate = new Date(2060, 11, 24).toString();
    const assetProfile: AssetProfile = { expirationDate: expiryDate };

    const odapClientRequest: ClientV1Request = {
      clientGatewayConfiguration: {
        apiHost: odapClientGatewayApiHost,
      },
      serverGatewayConfiguration: {
        apiHost: odapServerGatewayApiHost,
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
    };
    const res = await apiClient.clientRequestV1(odapClientRequest);
    expect(res.status).toBe(200);
  }

  expect(pluginSourceGateway.sessions.size).toBe(1);
  expect(pluginRecipientGateway.sessions.size).toBe(1);

  const [sessionID] = pluginSourceGateway.sessions.keys();

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
