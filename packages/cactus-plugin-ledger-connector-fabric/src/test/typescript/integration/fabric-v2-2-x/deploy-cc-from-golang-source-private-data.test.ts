import { AddressInfo } from "net";
import http from "http";
import fs from "fs-extra";
import path from "path";
import "jest-extended";
import { v4 as uuidv4 } from "uuid";

import express from "express";
import bodyParser from "body-parser";

import {
  Containers,
  DEFAULT_FABRIC_2_AIO_FABRIC_VERSION,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  DEFAULT_FABRIC_2_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  Checks,
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  ChainCodeProgrammingLanguage,
  Configuration,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  PluginLedgerConnectorFabric,
} from "../../../../main/typescript/public-api";
import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

const testCase = "deploys Fabric 2.x contract from go source";
describe(testCase, () => {
  const logLevel: LogLevelDesc = "INFO";
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
    imageVersion: DEFAULT_FABRIC_2_AIO_IMAGE_VERSION,
    envVars: new Map([["FABRIC_VERSION", DEFAULT_FABRIC_2_AIO_FABRIC_VERSION]]),
    logLevel,
  });
  let addressInfo,
    port: number,
    configuration,
    apiUrl: string,
    apiClient: FabricApi;
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => await Servers.shutdown(server));
  afterAll(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });
  beforeAll(async () => {
    await ledger.start({ omitPull: false });

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ port } = addressInfo);
    apiUrl = `http://127.0.0.1:${port}`;

    configuration = new Configuration({ basePath: apiUrl });
    apiClient = new FabricApi(configuration);
  });

  test(testCase, async () => {
    const LOG = LoggerProvider.getOrCreate({
      label: "deploy-cc-from-golang-source-private-data",
      level: logLevel,
    });

    const channelId = "mychannel";
    const channelName = channelId;

    const connectionProfile = await ledger.getConnectionProfileOrg1();

    expect(connectionProfile).toBeTruthy();

    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);
    const sshConfig = await ledger.getSshConfig();

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1Org1";
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

    LOG.debug("Creating connector - connection profile: %o", connectionProfile);
    LOG.debug("Creating connector - discovery options: %o", discoveryOptions);
    LOG.debug("Creating connector - SSH config: %o", sshConfig);

    const connector = new PluginLedgerConnectorFabric(pluginOptions);
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp);
    const contractName = "asset-transfer-private-data";

    const contractRelPath =
      "../../fixtures/go/asset-transfer-private-data/chaincode-go";
    const contractDir = path.join(__dirname, contractRelPath);

    const smartContractGoPath = path.join(
      contractDir,
      "./chaincode/",
      "./asset_transfer.go",
    );
    const smartContractGoBuf = await fs.readFile(smartContractGoPath);
    const smartContractGo = {
      body: smartContractGoBuf.toString("base64"),
      filepath: "./chaincode/",
      filename: `asset_transfer.go`,
    };

    const assetTransferGoPath = path.join(contractDir, "./main.go");
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

    const privateDataCollectionName = "collections_config.json";
    const privateDataCollectionsPath = path.join(
      contractDir,
      "./" + privateDataCollectionName,
    );
    const privateDataCollectionsBuf = await fs.readFile(
      privateDataCollectionsPath,
    );
    const privateDataCollections = {
      body: privateDataCollectionsBuf.toString("base64"),
      filename: privateDataCollectionName,
    };

    const res = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      sourceFiles: [
        assetTransferGo,
        smartContractGo,
        goMod,
        goSum,
        privateDataCollections,
      ],
      collectionsConfigFile: privateDataCollectionName,
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
    expect(res.status).toEqual(200);
    expect(success).toBe(true);

    const {
      approveForMyOrgList,
      installList,
      queryInstalledList,
      commit,
      packaging,
      queryCommitted,
    } = lifecycle;

    Checks.truthy(packageIds, `packageIds truthy OK`);
    Checks.truthy(
      Array.isArray(packageIds),
      `Array.isArray(packageIds) truthy OK`,
    );
    Checks.truthy(approveForMyOrgList, `approveForMyOrgList truthy OK`);
    Checks.truthy(
      Array.isArray(approveForMyOrgList),
      `Array.isArray(approveForMyOrgList) truthy OK`,
    );
    Checks.truthy(installList, `installList truthy OK`);
    Checks.truthy(
      Array.isArray(installList),
      `Array.isArray(installList) truthy OK`,
    );
    Checks.truthy(queryInstalledList, `queryInstalledList truthy OK`);
    Checks.truthy(
      Array.isArray(queryInstalledList),
      `Array.isArray(queryInstalledList) truthy OK`,
    );
    Checks.truthy(commit, `commit truthy OK`);
    Checks.truthy(packaging, `packaging truthy OK`);
    Checks.truthy(queryCommitted, `queryCommitted truthy OK`);

    const assetId = uuidv4();
    const assetType = "asset";

    const assetData = {
      objectType: assetType,
      assetID: assetId,
      color: "gray",
      size: 3,
      appraisedValue: 500,
    };

    //Chaincode-specific method requires attribute asset_properties
    const rawTmpData = {
      asset_properties: assetData,
    };

    // CreateAsset(id string, color string, size int, owner string, appraisedValue int)
    const createRes = await apiClient.runTransactionV1({
      transientData: rawTmpData,
      contractName,
      channelName,
      //objectType, assetID, color, size, appraisedvalue
      params: [],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Sendprivate,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    expect(createRes).toBeTruthy();
    expect(createRes.status).toBeWithin(199, 300);
    const getRes = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId],
      methodName: "ReadAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });

    expect(getRes).toBeTruthy();
    expect(getRes.data).toBeTruthy();
    expect(getRes.data.functionOutput).toBeTruthy();
    expect(getRes.status).toBeWithin(199, 300);
    //TODO FIX:
    //Error: failed to read asset details: GET_STATE failed: transaction ID: 0a41ae425e259ee6c1331d4d3c06bd9fc4727f9961abc0c1a2895c450fc8411a: tx creator does not have read access permission on privatedata in chaincodeName:asset-transfer-private-data collectionName: Org2MSPPrivateCollection
    //This has probably to do with the state database supported by Fabric test ledger
    /*
    const collectionToParse = "Org1MSPPrivateCollection";
    const getResPrivate = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [collectionToParse, assetId],
      methodName: "ReadAssetPrivateDetails",
      invocationType: FabricContractInvocationType.SEND,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });


    */

    const getResQuery = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId, assetId + "1"],
      methodName: "GetAssetByRange",
      invocationType: FabricContractInvocationType.Call,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });

    expect(getResQuery).toBeTruthy();
    expect(getResQuery.data).toBeTruthy();
    expect(getResQuery.data.functionOutput).toBeTruthy();
    expect(getResQuery.status).toBeWithin(199, 300);
  });
});
