import { AddressInfo } from "node:net";
import http from "node:http";
import path from "node:path";

import "jest-extended";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { DiscoveryOptions, ContractEvent } from "fabric-network";
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
} from "@hyperledger/cactus-test-tooling";

import {
  IListenOptions,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Configuration } from "@hyperledger/cactus-core-api";

import {
  DefaultEventHandlerStrategy,
  FileBase64,
  PluginLedgerConnectorFabric,
} from "../../../../main/typescript/public-api";

import {
  DefaultApi as FabricApi,
  ChainCodeProgrammingLanguage,
  FabricContractInvocationType,
} from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { GatewayOptions } from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { CreateListenerRequest } from "../../../../main/typescript/common/utils";
import { PeerCerts } from "@hyperledger/cactus-test-tooling/src/main/typescript/fabric/fabric-test-ledger-v1";

// For development on local fabric network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = false;
const leaveLedgerRunning = false;

describe("PluginLedgerConnectorFabric", () => {
  const logLevel: LogLevelDesc = "INFO";
  const log: Logger = LoggerProvider.getOrCreate({
    label: "fabric-lock-asset",
    level: logLevel,
  });

  let ledger: FabricTestLedgerV1;
  let apiClient: FabricApi;
  let keychainId: string;
  let keychainEntryKey: string;
  let server: http.Server;
  let gatewayOptions: GatewayOptions;
  let plugin: PluginLedgerConnectorFabric;

  let peer0Org1Certs: PeerCerts;
  let peer0Org2Certs: PeerCerts;

  beforeAll(async () => {
    const pruning = pruneDockerContainersIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
  });

  beforeAll(async () => {
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel,
      useRunningLedger,
    });

    await ledger.start({ omitPull: false });

    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();

    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];

    const [userIdentity] = await ledger.enrollUserV2({
      enrollmentID: uuidv4(),
      organization: "org1",
      wallet: adminWallet,
    });

    const keychainInstanceId = uuidv4();
    keychainId = uuidv4();
    keychainEntryKey = "user2";
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

    gatewayOptions = {
      identity: keychainEntryKey,
      wallet: {
        keychain: {
          keychainId,
          keychainRef: keychainEntryKey,
        },
      },
    };

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

    plugin = new PluginLedgerConnectorFabric(pluginOptions);

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
    apiClient = new FabricApi(
      new Configuration({ basePath: `http://127.0.0.1:${port}` }),
    );

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
  });

  afterAll(async () => {
    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    //await pruneDockerContainersIfGithubAction({ logLevel });
    await Servers.shutdown(server);
  });

  it("setup log subscriber, issue tx, and capture event emitted", async () => {
    const channelName = "mychannel";
    const contractName = "basic-asset-transfer";
    const deployedContractName = `${contractName}-${(Math.random() + 1).toString(36).substring(7)}`;

    const channelId = "mychannel";

    const contractRelPath = "../../fixtures/go/lock-asset/chaincode-typescript";
    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── assetTransfer.ts
    // │   ├── asset.ts
    // │   └── index.ts
    // ├── tsconfig.json
    const sourceFiles: FileBase64[] = [];
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
      sourceFiles,
      ccName: deployedContractName,
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

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    const {
      packageIds,
      lifecycle: {
        approveForMyOrgList,
        installList,
        queryInstalledList,
        commit,
        packaging,
        queryCommitted,
      },
    } = res.data;

    expect(packageIds).toBeTruthy();
    expect(Array.isArray(packageIds)).toBe(true);
    expect(approveForMyOrgList).toBeTruthy();
    expect(Array.isArray(approveForMyOrgList)).toBe(true);
    expect(installList).toBeTruthy();
    expect(Array.isArray(installList)).toBe(true);
    expect(queryInstalledList).toBeTruthy();
    expect(Array.isArray(queryInstalledList)).toBe(true);
    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();

    const assetId = uuidv4();

    let event_emitted = false;

    const { listener, removeListener } = await plugin.createFabricListener(
      {
        channelName,
        contractName: deployedContractName,
        gatewayOptions,
      } as CreateListenerRequest,
      async (event: ContractEvent) => {
        log.info("Event received by listener");

        event_emitted = true;

        if (event) {
          expect(event).toBeTruthy();
          expect(event.chaincodeId).toBe(deployedContractName);
          expect(event.eventName).toBe("AssetCreated");

          if (event.payload) {
            const payload = event.payload.toString("utf-8");
            const payloadJson = JSON.parse(payload);

            expect(payloadJson["id"]).toBe(assetId);
            expect(payloadJson["value"]).toBe(19);
          } else {
            fail("Event payload is empty");
          }
        }
      },
    );

    expect(listener).toBeTruthy();
    expect(removeListener).toBeTruthy();

    log.info("Waiting for events to be emitted...");

    log.info("Issuing tx to create asset...");

    const createRes = await apiClient.runTransactionV1({
      contractName: deployedContractName,
      channelName,
      params: [assetId, "19"],
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

    if (!event_emitted) {
      fail("Event not emitted");
    }

    removeListener();
  });
});
