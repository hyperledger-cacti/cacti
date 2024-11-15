import "jest-extended";
import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { DiscoveryOptions } from "fabric-network";
import bodyParser from "body-parser";
import path from "path";
import http, { Server } from "http";
import fs from "fs-extra";
import {
  Configuration,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  FileBase64,
  ChainCodeProgrammingLanguage,
  FabricContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  Containers,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import express from "express";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { CcModelHephaestus } from "../../../main/typescript/plugin-ccmodel-hephaestus";
import { IPluginCcModelHephaestusOptions } from "../../../main/typescript";
import { LedgerType } from "@hyperledger/cactus-core-api";

let server: Server;

let fabricSigningCredential: FabricSigningCredential;
const logLevel: LogLevelDesc = "INFO";

let fabricLedger: FabricTestLedgerV1;
let contractName: string;
let channelName: string;

let config: Configuration;
let apiClient: FabricApi;

let fabricConnector: PluginLedgerConnectorFabric;
const FABRIC_ASSET_ID = uuidv4();

let hephaestus: CcModelHephaestus;
let hephaestusOptions: IPluginCcModelHephaestusOptions;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "monitor-4-fabric-events.test",
});

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  {
    fabricLedger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel,
    });

    await fabricLedger.start();
    log.info("Fabric Ledger started");

    const channelId = "mychannel";
    channelName = channelId;

    const connectionProfile = await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();
    const enrollAdminOut = await fabricLedger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await fabricLedger.enrollUser(adminWallet);
    const sshConfig = await fabricLedger.getSshConfig();
    log.info("admin enrolled");

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1";
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

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
      sshConfig,
      logLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };
    fabricConnector = new PluginLedgerConnectorFabric(pluginOptions);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiUrl = `http://${address}:${port}`;

    await fabricConnector.getOrCreateWebServices();
    await fabricConnector.registerWebServices(expressApp);

    config = new Configuration({ basePath: apiUrl });

    apiClient = new FabricApi(config);

    // deploy contracts ...
    contractName = "basic-asset-transfer-2";
    const contractRelPath =
      "../fabric-contracts/lock-asset/chaincode-typescript";

    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── assetTransfer.ts
    // │   ├── asset.ts
    // │   ├── index.ts
    // │   └── ITraceableContract.ts
    // ├── tsconfig.json
    // --------
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

    const res = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: contractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    });

    const { packageIds, lifecycle, success } = res.data;
    expect(res.status).toBe(200);
    expect(success).toBe(true);
    expect(lifecycle).not.toBeUndefined();

    const {
      approveForMyOrgList,
      installList,
      queryInstalledList,
      commit,
      packaging,
      queryCommitted,
    } = lifecycle;

    expect(packageIds).toBeTruthy();
    expect(packageIds).toBeArray();

    expect(approveForMyOrgList).toBeTruthy();
    expect(approveForMyOrgList).toBeArray();

    expect(installList).toBeTruthy();
    expect(installList).toBeArray();
    expect(queryInstalledList).toBeTruthy();
    expect(queryInstalledList).toBeArray();

    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();
    log.info("Contract deployed");

    fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
  }
  {
    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: logLevel,
      fabricTxObservable: fabricConnector.getTxSubjectObservable(),
      sourceLedger: LedgerType.Fabric2,
      targetLedger: LedgerType.Fabric2,
    };

    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  }
});

test("monitor Fabric transactions", async () => {
  hephaestus.setCaseId("FABRIC_MONITORING");
  hephaestus.monitorTransactions();

  const createResFabric = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [FABRIC_ASSET_ID, "10", "owner1"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(createResFabric).toBeTruthy();

  const transferResFabric = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [FABRIC_ASSET_ID, "owner2"],
    methodName: "TransferAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(transferResFabric).toBeTruthy();

  const transferBackResFabric = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [FABRIC_ASSET_ID, "owner1"],
    methodName: "TransferAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(transferBackResFabric).toBeTruthy();

  const deleteResFabric = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [FABRIC_ASSET_ID],
    methodName: "DeleteAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(deleteResFabric).toBeTruthy();

  expect(hephaestus.numberEventsLog).toEqual(4);

  await hephaestus.persistCrossChainLogCsv("example-dummy-fabric-4-events");
  await hephaestus.persistCrossChainLogJson("example-dummy-fabric-4-events");
});

afterAll(async () => {
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await Servers.shutdown(server);

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
