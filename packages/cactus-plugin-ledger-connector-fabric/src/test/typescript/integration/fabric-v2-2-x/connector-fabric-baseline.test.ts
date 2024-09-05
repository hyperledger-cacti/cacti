import { AddressInfo } from "node:net";
import http from "node:http";
import path from "node:path";

import "jest-extended";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { DiscoveryOptions } from "fabric-network";
import { StatusCodes } from "http-status-codes";
import express from "express";
import bodyParser from "body-parser";

// BlockDecoder is not exported in ts definition so we need to use legacy import.
// TODO(petermetz): Migrate over to the newer versions of the Fabric NodeJS SDK
// which will (hopefully) not have this problem with the exports.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BlockDecoder } = require("fabric-common");

import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  Checks,
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
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  FileBase64,
  PluginLedgerConnectorFabric,
} from "../../../../main/typescript/public-api";

import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import {
  CactiBlockFullEventV1,
  GatewayOptions,
  GetBlockResponseTypeV1,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";

import { sendTransactionOnFabric } from "../../common/send-transaction-on-fabric";
import { getBlock } from "../../common/get-block";

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

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
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
    });

    await ledger.start({ omitPull: false });

    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();

    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);
    const sshConfig = await ledger.getSshConfig();

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
    apiClient = new FabricApi(
      new Configuration({ basePath: `http://127.0.0.1:${port}` }),
    );

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
    await Servers.shutdown(server);
  });

  it("getBlockV1() -Get first block by it's number - decoded.", async () => {
    const ledgerChannelName = "mychannel";
    // Check decoded
    const decodedFirstBlock = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: { blockNumber: "0" },
      responseType: GetBlockResponseTypeV1.Full,
    });
    log.debug("Received decodedFirstBlock:", decodedFirstBlock);
    expect(decodedFirstBlock.header).toBeTruthy();
    expect(decodedFirstBlock.header.number.low).toBe(0);
    expect(decodedFirstBlock.header.number.high).toBe(0);
    expect(decodedFirstBlock.data).toBeTruthy();
    expect(decodedFirstBlock.metadata).toBeTruthy();
  });

  it("getBlockV1() - Get first block by it's number - encoded.", async () => {
    const ledgerChannelName = "mychannel";
    // Check decoded
    const encodedFirstBlock = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: { blockNumber: "0" },
      responseType: GetBlockResponseTypeV1.Encoded,
    });
    const decodedFirstBlockBuffer = Buffer.from(encodedFirstBlock, "base64");
    const decodedFirstBlock = BlockDecoder.decode(decodedFirstBlockBuffer);
    log.debug("Received decodedFirstBlock:", decodedFirstBlock);
    expect(decodedFirstBlock.header).toBeTruthy();
    expect(decodedFirstBlock.header.number.low).toBe(0);
    expect(decodedFirstBlock.header.number.high).toBe(0);
    expect(decodedFirstBlock.data).toBeTruthy();
    expect(decodedFirstBlock.metadata).toBeTruthy();
  });

  /**
   * GetBlock endpoint using transactionId
   */
  it("getBlockV1() - Get a block by transactionId it contains", async () => {
    const ledgerChannelName = "mychannel";
    const ledgerContractName = "basic";
    // Run some transaction
    const assetName = `getBlockTx_${(Math.random() + 1).toString(36).substring(2)}`;
    const txId = await sendTransactionOnFabric({
      apiClient,
      assetName,
      gatewayOptions,
      ledgerChannelName,
      ledgerContractName,
      log,
    });

    // Get block using transactionId we've just sent
    const blockByTx = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: { transactionId: txId },
      responseType: GetBlockResponseTypeV1.Full,
    });
    expect(blockByTx).toBeTruthy();
    expect(blockByTx.header).toBeTruthy();
    expect(blockByTx.data).toBeTruthy();
    expect(blockByTx.metadata).toBeTruthy();
  });

  it("getBlockV1() - Get a block by transactionId it contains - cacti transactions summary", async () => {
    const ledgerChannelName = "mychannel";
    const ledgerContractName = "basic";
    // Run some transaction
    const assetName = `cactiTx_${(Math.random() + 1).toString(36).substring(2)}`;
    const txId = await sendTransactionOnFabric({
      apiClient,
      assetName,
      gatewayOptions,
      ledgerChannelName,
      ledgerContractName,
      log,
    });

    // Get block using transactionId we've just sent
    const cactiTxList = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: { transactionId: txId },
      responseType: GetBlockResponseTypeV1.CactiTransactions,
    });
    expect(cactiTxList).toBeTruthy();
    expect(cactiTxList.length).toBeGreaterThanOrEqual(1);
    const cactiTx = cactiTxList[0];
    expect(cactiTx).toBeTruthy();
    expect(cactiTx.chaincodeId).toBeTruthy();
    expect(cactiTx.transactionId).toBeTruthy();
    expect(cactiTx.functionName).toBeTruthy();
    expect(cactiTx.functionArgs).toBeTruthy();
    expect(cactiTx.functionArgs.length).toEqual(5);
  });

  it("getBlockV1() - Get a block by transactionId it contains - cacti full block summary", async () => {
    const ledgerChannelName = "mychannel";
    const ledgerContractName = "basic";

    // Run some transaction
    const assetName = `cactiTx_${(Math.random() + 1).toString(36).substring(2)}`;
    const txId = await sendTransactionOnFabric({
      apiClient,
      assetName,
      gatewayOptions,
      ledgerChannelName,
      ledgerContractName,
      log,
    });

    // Get block using transactionId we've just sent
    const cactiFullBlock = (await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: { transactionId: txId },
      responseType: GetBlockResponseTypeV1.CactiFullBlock,
    })) as CactiBlockFullEventV1;

    // Check block fields
    expect(cactiFullBlock).toBeTruthy();
    expect(cactiFullBlock.blockNumber).toBeDefined();
    expect(cactiFullBlock.blockHash).toBeTruthy();
    expect(cactiFullBlock.previousBlockHash).toBeTruthy();
    expect(cactiFullBlock.transactionCount).toBeGreaterThanOrEqual(1);

    // Check transaction fields
    for (const tx of cactiFullBlock.cactiTransactionsEvents) {
      expect(tx.hash).toBeTruthy();
      expect(tx.channelId).toBeTruthy();
      expect(tx.timestamp).toBeTruthy();
      expect(tx.transactionType).toBeTruthy();
      expect(tx.protocolVersion).not.toBeUndefined();
      expect(tx.epoch).not.toBeUndefined();

      // Check transaction actions fields
      for (const action of tx.actions) {
        expect(action.functionName).toBeTruthy();
        expect(action.functionArgs).toBeTruthy();
        expect(action.functionArgs.length).toEqual(5);
        expect(action.chaincodeId).toBeTruthy();
        expect(action.creator.mspid).toBeTruthy();
        expect(action.creator.cert).toBeTruthy();

        // Check transaction action endorsement fields
        for (const endorsement of action.endorsements) {
          expect(endorsement.signature).toBeTruthy();
          expect(endorsement.signer.mspid).toBeTruthy();
          expect(endorsement.signer.cert).toBeTruthy();
        }
      }
    }
  });

  /**
   * GetBlock endpoint using block hash
   */
  it("getBlockV1() - Get block by it's hash.", async () => {
    const ledgerChannelName = "mychannel";
    const ledgerContractName = "basic";
    // Run transaction to ensure more than one block is present
    const assetName = `txForNewBlock_${(Math.random() + 1).toString(36).substring(2)}`;
    await sendTransactionOnFabric({
      assetName,
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      ledgerContractName,
      log,
    });

    // Get second block by it's number
    const decodedSecondBlock = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: { blockNumber: "1" },
      responseType: GetBlockResponseTypeV1.Full,
    });
    expect(decodedSecondBlock.header).toBeTruthy();
    const firstBlockHashJSON = decodedSecondBlock.header.previous_hash;
    expect(firstBlockHashJSON).toBeTruthy();

    // Get using default JSON hash representation
    log.info("Get by JSON hash:", firstBlockHashJSON);

    const decodedFirstBlock = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: {
        blockHash: {
          buffer: firstBlockHashJSON,
        },
      },
      responseType: GetBlockResponseTypeV1.Full,
    });
    expect(decodedFirstBlock).toBeTruthy();
    expect(decodedFirstBlock.header).toBeTruthy();
    expect(decodedFirstBlock.header.number.low).toBe(0);
    expect(decodedFirstBlock.header.number.high).toBe(0);
    expect(decodedFirstBlock.data).toBeTruthy();
    expect(decodedFirstBlock.metadata).toBeTruthy();

    // Get using HEX encoded hash representation
    const firstBlockHashHex = Buffer.from(firstBlockHashJSON).toString("hex");
    log.info("Get by HEX hash:", firstBlockHashHex);

    const decodedBlockHex = await getBlock({
      apiClient,
      gatewayOptions,
      ledgerChannelName,
      log,
      query: {
        blockHash: {
          encoding: "hex",
          buffer: firstBlockHashHex,
        },
      },
      responseType: GetBlockResponseTypeV1.Full,
    });
    expect(decodedBlockHex).toBeTruthy();
    expect(decodedBlockHex.header).toBeTruthy();
    expect(decodedBlockHex.header.number.low).toBe(0);
    expect(decodedBlockHex.header.number.high).toBe(0);
    expect(decodedBlockHex.data).toBeTruthy();
    expect(decodedBlockHex.metadata).toBeTruthy();
  });

  /**
   * Check error handling
   */
  it("getBlockV1() - Reading block with invalid number returns an error.", async () => {
    const ledgerChannelName = "mychannel";
    const getBlockReq = {
      channelName: ledgerChannelName,
      gatewayOptions,
      query: {
        blockNumber: "foo", // non existent block
      },
    };

    // FIXME(petermetz): This should fail with `StatusCodes.BAD_REQUEST`
    expect(
      apiClient.getBlockV1(getBlockReq).catch((ex: unknown) => {
        log.debug("Dumping the exception thrown by getBlockV1()...");
        log.debug(ex);
        throw ex;
      }),
    ).rejects.toMatchObject({
      message:
        "Request failed with status code " + StatusCodes.INTERNAL_SERVER_ERROR,
      name: "AxiosError",
      code: "ERR_BAD_RESPONSE",
      response: {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        statusText: "Internal Server Error",
      },
    });
  });

  it("GetChainInfoV1() - Get test ledger chain info.", async () => {
    const ledgerChannelName = "mychannel";
    const chainInfoResponse = await apiClient.getChainInfoV1({
      channelName: ledgerChannelName,
      gatewayOptions,
    });

    const chainInfo = chainInfoResponse.data;
    expect(chainInfoResponse.status).toBe(200);
    expect(chainInfo).toBeTruthy;
    expect(chainInfo.height).toBeGreaterThanOrEqual(1);
    expect(chainInfo.currentBlockHash).toBeTruthy;
    expect(chainInfo.previousBlockHash).toBeTruthy;
  });

  it("deployContractV1() - deploys Fabric 2.x contract from go source", async () => {
    const channelId = "mychannel";
    const channelName = channelId;
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
      ccLabel: contractName,
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

  it("deployContractV1() - deploys contract and performs transactions", async () => {
    const channelId = "mychannel";
    const channelName = channelId;
    const contractName = "basic-asset-transfer-2";

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

    const createRes = await apiClient.runTransactionV1({
      contractName,
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

    const asset = JSON.parse(getRes.data.functionOutput);

    expect(asset).toBeTruthy();
    expect(asset.ID).toBeTruthy();
    expect(asset.ID).toBe(assetId);

    const lockRes = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId],
      methodName: "LockAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    expect(lockRes).toBeTruthy();
    expect(lockRes.data).toBeTruthy();
    expect(lockRes.data.functionOutput).toBeTruthy();
    expect(lockRes.status).toBeGreaterThan(199);
    expect(lockRes.status).toBeLessThan(300);
    expect(lockRes.data.functionOutput).toBe("true");

    log.warn(lockRes.data.functionOutput);
  });
});
