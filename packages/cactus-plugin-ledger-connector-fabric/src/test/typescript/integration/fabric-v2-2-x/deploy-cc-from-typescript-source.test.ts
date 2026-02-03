import "jest-extended";
import { AddressInfo } from "net";
import http, { Server } from "http";
import fs from "fs-extra";
import path from "path";

import { v4 as uuidv4 } from "uuid";

import express from "express";
import bodyParser from "body-parser";

import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
  LoggerProvider,
  Logger,
} from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";

import {
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  FileBase64,
  PluginLedgerConnectorFabric,
} from "../../../../main/typescript/public-api";

import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";
import { Configuration } from "@hyperledger-cacti/cactus-core-api";
import { PeerCerts } from "@hyperledger-cacti/cactus-test-tooling/src/main/typescript/fabric/fabric-test-ledger-v1";

const testCase = "deploys Fabric 2.x contract from typescript source";
const logLevel: LogLevelDesc = "DEBUG";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "deploy-cc-from-typescript-source.test",
  level: logLevel,
});

describe("Deploy CC from typescript source test", () => {
  const channelId = "mychannel";
  const channelName = channelId;
  let ledger: FabricTestLedgerV1;
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
  let apiClient: FabricApi;
  const contractName = "basic-asset-transfer-2";
  const contractRelPath =
    "../../fixtures/go/basic-asset-transfer/chaincode-typescript";
  let server: Server;
  let peer0Org1Certs: PeerCerts;
  let peer0Org2Certs: PeerCerts;
  beforeAll(async () => {
    const pruning = pruneDockerContainersIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel,
    });
    await ledger.start({ omitPull: false });
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy(); // Check if connectionProfile is truthy
    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);
    const keychainInstanceId = uuidv4();
    const keychainEntryValue = JSON.stringify(userIdentity);
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });
    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    peer0Org1Certs = await ledger.getPeerOrgCertsAndConfig("org1", "peer0");
    peer0Org2Certs = await ledger.getPeerOrgCertsAndConfig("org2", "peer0");

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      pluginRegistry,
      logLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
      dockerNetworkName: ledger.getNetworkName(),
    };
    const plugin = new PluginLedgerConnectorFabric(pluginOptions);
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { port } = addressInfo;
    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
    const apiUrl = `http://127.0.0.1:${port}`;

    const config = new Configuration({ basePath: apiUrl });

    apiClient = new FabricApi(config);
  });
  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerContainersIfGithubAction({ logLevel });
    await Servers.shutdown(server);
  });
  test(`${testCase}`, async () => {
    const contractDir = path.join(__dirname, contractRelPath);
    // ├── package.json
    // ├── src
    // │   ├── assetTransfer.ts
    // │   ├── asset.ts
    // │   └── index.ts
    // ├── tsconfig.json
    // └── tslint.json
    const sourceFiles: FileBase64[] = [];
    {
      const filename = "./tslint.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./asset.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./assetTransfer.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    const filePath = path.join(
      __dirname,
      "../../../resources/fixtures/addOrgX/core.yaml",
    );
    const buffer = await fs.readFile(filePath);
    const coreFile = {
      body: buffer.toString("base64"),
      filename: "core.yaml",
    };

    const res = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      // constructorArgs: { Args: ["john", "99"] },
      sourceFiles,
      ccName: contractName,
      targetOrganizations: [
        {
          CORE_PEER_LOCALMSPID:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG: peer0Org1Certs.mspConfig,
          CORE_PEER_TLS_ROOTCERT: peer0Org1Certs.peerTlsCert,
          ORDERER_TLS_ROOTCERT: peer0Org1Certs.ordererTlsRootCert,
        },
        {
          CORE_PEER_LOCALMSPID:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG: peer0Org2Certs.mspConfig,
          CORE_PEER_TLS_ROOTCERT: peer0Org2Certs.peerTlsCert,
          ORDERER_TLS_ROOTCERT: peer0Org2Certs.ordererTlsRootCert,
        },
      ],
      caFile: peer0Org1Certs.ordererTlsRootCert,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      coreYamlFile: coreFile,
    });

    const { packageIds, lifecycle, success } = res.data;
    expect(res.status).toBe(200);
    expect(success).toBeTruthy();

    const {
      approveForMyOrgList,
      installList,
      queryInstalledList,
      commit,
      packaging,
      queryCommitted,
    } = lifecycle;
    expect(packageIds).toBeTruthy();
    expect(Array.isArray(packageIds)).toBeTruthy();
    expect(approveForMyOrgList).toBeTruthy();
    expect(Array.isArray(approveForMyOrgList)).toBeTruthy();
    expect(installList).toBeTruthy();
    expect(Array.isArray(installList)).toBeTruthy();
    expect(queryInstalledList).toBeTruthy();
    expect(Array.isArray(queryInstalledList)).toBeTruthy();
    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();

    const assetId = uuidv4();
    const assetOwner = uuidv4();

    // CreateAsset(id string, color string, size int, owner string, appraisedValue int)
    const createRes = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId, "Green", "19", assetOwner, "9999"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    expect(createRes).toBeTruthy();
    expect(createRes.status).toBeGreaterThan(199);
    expect(createRes.status).toBeLessThan(300);
    log.info(`BassicAssetTransfer.Create(): ${JSON.stringify(createRes.data)}`);

    const getRes = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId],
      methodName: "ReadAsset",
      invocationType: FabricContractInvocationType.Call,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    expect(getRes).toBeTruthy();
    expect(getRes.data).toBeTruthy();
    expect(getRes.data.functionOutput).toBeTruthy();
    expect(getRes.status).toBeGreaterThan(199);
    expect(getRes.status).toBeLessThan(300);

    log.info(`HelloWorld.get() ResponseBody: ${JSON.stringify(getRes.data)}`);
    const asset = JSON.parse(getRes.data.functionOutput);
    expect(asset).toBeTruthy();

    expect(asset.ID).toBeTruthy();
    expect(asset.ID).toEqual(assetId);

    // Note: the capital spelling on "Owner" is not a bug. The fabric-samples
    // repo has the spelling different from the golang chaincode as well.
    expect(asset.Owner).toBeTruthy();
    expect(asset.Owner).toEqual(assetOwner);
  });
});
