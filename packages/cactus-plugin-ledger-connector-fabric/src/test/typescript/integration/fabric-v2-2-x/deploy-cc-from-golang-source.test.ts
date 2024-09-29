import "jest-extended";
import { AddressInfo } from "net";
import http, { Server } from "http";
import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";

import {
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  PluginLedgerConnectorFabric,
} from "../../../../main/typescript/public-api";

import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Configuration } from "@hyperledger/cactus-core-api";
import { DEFAULT_FABRIC_2_AIO_IMAGE_NAME } from "@hyperledger/cactus-test-tooling";

const testCase = "deploys Fabric 2.x contract from go source";
const logLevel: LogLevelDesc = "INFO";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "deploy-cc-from-golang-source.test",
  level: logLevel,
});

describe("Deploy CC from Golang Source Test", () => {
  let ledger: FabricTestLedgerV1;
  const channelId = "mychannel";
  const channelName = channelId;
  let server: Server;
  let apiClient: FabricApi;
  const contractName = "basic-asset-transfer-2";
  const contractRelPath = "../../fixtures/go/basic-asset-transfer/chaincode-go";
  const contractDir = path.join(__dirname, contractRelPath);
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel,
    });
    await ledger.start();
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();
    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);
    const sshConfig = await ledger.getSshConfig();

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
    await pruneDockerAllIfGithubAction({ logLevel });
    await Servers.shutdown(server);
  });
  test(`${testCase}`, async () => {
    const smartContractGoPath = path.join(
      contractDir,
      "./chaincode/",
      "./smartcontract.go",
    );
    const smartContractGoBuf = await fs.readFile(smartContractGoPath);
    const smartContractGo = {
      body: smartContractGoBuf.toString("base64"),
      filepath: "./chaincode/",
      filename: `smartcontract.go`,
    };
    const assetTransferGoPath = path.join(contractDir, "./assetTransfer.go");
    const assetTransferGoBuf = await fs.readFile(assetTransferGoPath);
    const assetTransferGo = {
      body: assetTransferGoBuf.toString("base64"),
      filename: `${contractName}.go`,
    };
    const goModPath = path.join(contractDir, "./go.mod");
    const goModBuf = await fs.readFile(goModPath);
    const goMod = {
      body: goModBuf.toString("base64"),
      filename: "go.mod",
    };

    const goSumPath = path.join(contractDir, "./go.sum");
    const goSumBuf = await fs.readFile(goSumPath);
    const goSum = {
      body: goSumBuf.toString("base64"),
      filename: "go.sum",
    };
    const res = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      // constructorArgs: { Args: ["john", "99"] },
      sourceFiles: [assetTransferGo, smartContractGo, goMod, goSum],
      ccName: contractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Golang,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
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
    expect(asset.owner).toBeTruthy();
    expect(asset.owner).toEqual(assetOwner);
  });
});
