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

/**
 * Use this to debug issues with the fabric node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */
const testCase = "Run ODAP through OpenAPI";

describe(testCase, () => {
  let ipfsApiHost: string;
  let ipfsContainer: GoIpfsTestContainer;

  const logLevel: LogLevelDesc = "TRACE";

  let sourceGatewayServer: Server;
  let recipientGatewayserver: Server;
  let ipfsServer: Server;

  let clientOdapGateway: PluginOdapGateway;
  let serverOdapGateway: PluginOdapGateway;

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
    // t.comment(`Go IPFS Test Container API URL: ${ipfsApiUrl}`);

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

    //const packageName = pluginIpfs.getPackageName();

    const receivedInstanceId = pluginIpfs.getInstanceId();

    expect(receivedInstanceId).toBe(instanceId);
  });

  test("runs ODAP between two gateways via openApi", async () => {
    const odapClientGatewayPluginID = uuidv4();
    const odapServerGatewayInstanceID = uuidv4();

    const odapClientGatewayPluginOptions: IPluginOdapGatewayConstructorOptions = {
      name: "cactus-plugin#odapGateway",
      dltIDs: ["DLT2"],
      instanceId: odapClientGatewayPluginID,
      ipfsPath: ipfsApiHost,
    };

    const odapServerGatewayPluginOptions: IPluginOdapGatewayConstructorOptions = {
      name: "cactus-plugin#odapGateway",
      dltIDs: ["DLT1"],
      instanceId: odapServerGatewayInstanceID,
      ipfsPath: ipfsApiHost,
    };

    clientOdapGateway = new PluginOdapGateway(odapClientGatewayPluginOptions);
    serverOdapGateway = new PluginOdapGateway(odapServerGatewayPluginOptions);

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

      await serverOdapGateway.getOrCreateWebServices();
      await serverOdapGateway.registerWebServices(expressApp);
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

      await clientOdapGateway.getOrCreateWebServices();
      await clientOdapGateway.registerWebServices(expressApp);

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
        recipientGatewayPubkey: serverOdapGateway.pubKey,
        serverDltSystem: "DLT2",
        sourceGatewayDltSystem: "DLT1",
        clientIdentityPubkey: "",
        serverIdentityPubkey: "",
      };
      const res = await apiClient.clientRequestV1(odapClientRequest);
      expect(res.status).toBe(200);
    }

    expect(clientOdapGateway.sessions.size).toBe(1);
    expect(serverOdapGateway.sessions.size).toBe(1);

    const [sessionId] = clientOdapGateway.sessions.keys();

    const clientSessionData = clientOdapGateway.sessions.get(sessionId);
    const serverSessionData = serverOdapGateway.sessions.get(sessionId);

    if (clientSessionData == undefined || serverSessionData == undefined) {
      throw new Error("Test Failed");
    }

    expect(clientSessionData.id).toBe(serverSessionData.id);
    expect(clientSessionData.id).toBe(sessionId);

    expect(clientSessionData.loggingProfile).toBe(
      serverSessionData.loggingProfile,
    );

    expect(clientSessionData.accessControlProfile).toBe(
      serverSessionData.accessControlProfile,
    );

    expect(clientSessionData.applicationProfile).toBe(
      serverSessionData.applicationProfile,
    );

    expect(JSON.stringify(clientSessionData.assetProfile)).toBe(
      JSON.stringify(serverSessionData.assetProfile),
    );

    expect(clientSessionData.originatorPubkey).toBe(
      serverSessionData.originatorPubkey,
    );

    expect(clientSessionData.beneficiaryPubkey).toBe(
      serverSessionData.beneficiaryPubkey,
    );

    expect(clientSessionData.sourceGatewayPubkey).toBe(
      serverSessionData.sourceGatewayPubkey,
    );

    expect(clientSessionData.sourceGatewayDltSystem).toBe(
      serverSessionData.sourceGatewayDltSystem,
    );

    expect(clientSessionData.recipientGatewayPubkey).toBe(
      serverSessionData.recipientGatewayPubkey,
    );

    expect(clientSessionData.recipientGatewayDltSystem).toBe(
      serverSessionData.recipientGatewayDltSystem,
    );

    expect(clientSessionData.initializationRequestMessageHash).toBe(
      serverSessionData.initializationRequestMessageHash,
    );

    expect(clientSessionData.initializationResponseMessageHash).toBe(
      serverSessionData.initializationResponseMessageHash,
    );

    expect(clientSessionData.clientSignatureInitializationRequestMessage).toBe(
      serverSessionData.clientSignatureInitializationRequestMessage,
    );

    expect(clientSessionData.serverSignatureInitializationResponseMessage).toBe(
      serverSessionData.serverSignatureInitializationResponseMessage,
    );

    expect(clientSessionData.transferCommenceMessageRequestHash).toBe(
      serverSessionData.transferCommenceMessageRequestHash,
    );

    expect(clientSessionData.transferCommenceMessageResponseHash).toBe(
      serverSessionData.transferCommenceMessageResponseHash,
    );

    expect(
      clientSessionData.clientSignatureTransferCommenceRequestMessage,
    ).toBe(serverSessionData.clientSignatureTransferCommenceRequestMessage);

    expect(
      clientSessionData.serverSignatureTransferCommenceResponseMessage,
    ).toBe(serverSessionData.serverSignatureTransferCommenceResponseMessage);

    expect(clientSessionData.lockEvidenceRequestMessageHash).toBe(
      serverSessionData.lockEvidenceRequestMessageHash,
    );

    expect(clientSessionData.lockEvidenceResponseMessageHash).toBe(
      serverSessionData.lockEvidenceResponseMessageHash,
    );

    expect(clientSessionData.clientSignatureLockEvidenceRequestMessage).toBe(
      serverSessionData.clientSignatureLockEvidenceRequestMessage,
    );

    expect(clientSessionData.serverSignatureLockEvidenceResponseMessage).toBe(
      serverSessionData.serverSignatureLockEvidenceResponseMessage,
    );

    expect(clientSessionData.lockEvidenceClaim).toBe(
      serverSessionData.lockEvidenceClaim,
    );

    expect(clientSessionData.commitPrepareRequestMessageHash).toBe(
      serverSessionData.commitPrepareRequestMessageHash,
    );

    expect(clientSessionData.commitPrepareResponseMessageHash).toBe(
      serverSessionData.commitPrepareResponseMessageHash,
    );

    expect(
      clientSessionData.clientSignatureCommitPreparationRequestMessage,
    ).toBe(serverSessionData.clientSignatureCommitPreparationRequestMessage);

    expect(
      clientSessionData.serverSignatureCommitPreparationResponseMessage,
    ).toBe(serverSessionData.serverSignatureCommitPreparationResponseMessage);

    expect(clientSessionData.commitFinalRequestMessageHash).toBe(
      serverSessionData.commitFinalRequestMessageHash,
    );

    expect(clientSessionData.commitPrepareRequestMessageHash).toBe(
      serverSessionData.commitPrepareRequestMessageHash,
    );

    expect(clientSessionData.commitFinalResponseMessageHash).toBe(
      serverSessionData.commitFinalResponseMessageHash,
    );

    expect(clientSessionData.commitFinalClaim).toBe(
      serverSessionData.commitFinalClaim,
    );

    expect(clientSessionData.commitFinalClaimFormat).toBe(
      serverSessionData.commitFinalClaimFormat,
    );

    expect(clientSessionData.commitAcknowledgementClaim).toBe(
      serverSessionData.commitAcknowledgementClaim,
    );

    expect(clientSessionData.commitAcknowledgementClaimFormat).toBe(
      serverSessionData.commitAcknowledgementClaimFormat,
    );

    expect(clientSessionData.clientSignatureCommitFinalRequestMessage).toBe(
      serverSessionData.clientSignatureCommitFinalRequestMessage,
    );

    expect(clientSessionData.serverSignatureCommitFinalResponseMessage).toBe(
      serverSessionData.serverSignatureCommitFinalResponseMessage,
    );

    expect(clientSessionData.transferCompleteMessageHash).toBe(
      serverSessionData.transferCompleteMessageHash,
    );

    expect(clientSessionData.clientSignatureTransferCompleteMessage).toBe(
      serverSessionData.clientSignatureTransferCompleteMessage,
    );
  });

  afterAll(async () => {
    await ipfsContainer.stop();
    await ipfsContainer.destroy();
    await Servers.shutdown(ipfsServer);
    await Servers.shutdown(sourceGatewayServer);
    await Servers.shutdown(recipientGatewayserver);
  });
});
