import fs from "fs-extra";
import "jest-extended";
import http, { Server } from "http";
import { Server as SocketIoServer } from "socket.io";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { AssetProfile } from "../../../main/typescript/generated/openapi/typescript-axios";
import {
  IListenOptions,
  LoggerProvider,
  LogLevelDesc,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { DiscoveryOptions } from "fabric-network";
import {
  Containers,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
  BesuTestLedger,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { ClientV1Request } from "../../../main/typescript/public-api";
import LockAssetContractJson from "../../solidity/lock-asset-contract/LockAsset.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Configuration,
  PluginImportType,
  Constants,
} from "@hyperledger/cactus-core-api";
import {
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  FileBase64,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  FabricSigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import path from "path";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  ReceiptType,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import Web3 from "web3";

import { makeSessionDataChecks } from "../make-checks";
import {
  BesuSatpGateway,
  IBesuSatpGatewayConstructorOptions,
} from "../../../main/typescript/gateway/besu-satp-gateway";
import {
  FabricSatpGateway,
  IFabricSatpGatewayConstructorOptions,
} from "../../../main/typescript/gateway/fabric-satp-gateway";
import { ClientGatewayHelper } from "../../../main/typescript/gateway/client/client-helper";
import { ServerGatewayHelper } from "../../../main/typescript/gateway/server/server-helper";

import {
  knexClientConnection,
  knexRemoteConnection,
  knexServerConnection,
} from "../knex.config";

/**
 * Use this to debug issues with the fabric node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */

let fabricSigningCredential: FabricSigningCredential;
const logLevel: LogLevelDesc = "INFO";

let sourceGatewayServer: Server;
let recipientGatewayServer: Server;
let besuServer: Server;
let fabricServer: Server;

let fabricLedger: FabricTestLedgerV1;
let fabricContractName: string;
let fabricChannelName: string;
let fabricPath: string;

let besuTestLedger: BesuTestLedger;
let besuPath: string;
let besuContractName: string;
let besuWeb3SigningCredential: Web3SigningCredential;
let besuKeychainId: string;

let fabricConnector: PluginLedgerConnectorFabric;
let besuConnector: PluginLedgerConnectorBesu;

let serverGatewayPluginOptions: IBesuSatpGatewayConstructorOptions;
let pluginSourceGateway: FabricSatpGateway;
let pluginRecipientGateway: BesuSatpGateway;

let clientGatewayApiHost: string;
let serverGatewayApiHost: string;

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const FABRIC_ASSET_ID = uuidv4();
const BESU_ASSET_ID = uuidv4();

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "satpTestWithLedgerConnectors",
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
    // Fabric ledger connection
    const channelId = "mychannel";
    fabricChannelName = channelId;

    fabricLedger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
      logLevel,
    });

    await fabricLedger.start();

    const connectionProfile = await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();

    const enrollAdminOut = await fabricLedger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await fabricLedger.enrollUser(adminWallet);

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user2";
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
      pluginRegistry,
      logLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
      dockerNetworkName: fabricLedger.getNetworkName(),
    };

    fabricConnector = new PluginLedgerConnectorFabric(pluginOptions);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    fabricServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 3000,
      server: fabricServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    await fabricConnector.getOrCreateWebServices();
    await fabricConnector.registerWebServices(expressApp);

    const apiUrl = `http://${address}:${port}`;
    fabricPath = apiUrl;
    const config = new Configuration({ basePath: apiUrl });

    const apiClient = new FabricApi(config);

    fabricContractName = "basic-asset-transfer-2";
    const contractRelPath =
      "../fabric-contracts/lock-asset/chaincode-typescript";
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

    const peer0Org1Certs = await fabricLedger.getPeerOrgCertsAndConfig(
      "org1",
      "peer0",
    );
    const peer0Org2Certs = await fabricLedger.getPeerOrgCertsAndConfig(
      "org2",
      "peer0",
    );

    const filePath = path.join(__dirname, "../../yaml/resources/core.yaml");
    const buffer = await fs.readFile(filePath);
    const coreFile = {
      body: buffer.toString("base64"),
      filename: "core.yaml",
    };

    const response = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: fabricContractName,
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

    const { packageIds, lifecycle, success } = response.data;
    expect(response.status).toBe(200);
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

    // FIXME - without this wait it randomly fails with an error claiming that
    // the endorsement was impossible to be obtained. The fabric-samples script
    // does the same thing, it just waits 10 seconds for good measure so there
    // might not be a way for us to avoid doing this, but if there is a way we
    // absolutely should not have timeouts like this, anywhere...
    await new Promise((resolve) => setTimeout(resolve, 15000));

    fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

    const createResponse = await apiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName: fabricChannelName,
      params: [FABRIC_ASSET_ID, "19"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(createResponse).not.toBeUndefined();
    expect(createResponse.status).toBeGreaterThan(199);
    expect(createResponse.status).toBeLessThan(300);

    log.info(
      `BassicAssetTransfer.Create(): ${JSON.stringify(createResponse.data)}`,
    );
  }
  {
    // Besu ledger connection
    besuTestLedger = new BesuTestLedger();
    await besuTestLedger.start();

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    /**
     * Constant defining the standard 'dev' Besu genesis.json contents.
     *
     * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
     */
    const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
    const besuKeyPair = {
      privateKey: besuTestLedger.getGenesisAccountPrivKey(),
    };

    const web3 = new Web3(rpcApiHttpHost);
    const testEthAccount = web3.eth.accounts.create(uuidv4());

    const keychainEntryKey = uuidv4();
    const keychainEntryValue = testEthAccount.privateKey;
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    keychainPlugin.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    besuConnector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    besuServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 4000,
      server: besuServer,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    await besuConnector.getOrCreateWebServices();
    const wsApi = new SocketIoServer(besuServer, {
      path: Constants.SocketIoConnectionPathV1,
    });
    await besuConnector.registerWebServices(expressApp, wsApi);
    besuPath = `http://${address}:${port}`;

    await besuConnector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: testEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).not.toBeUndefined();
    expect(parseInt(balance, 10)).toBe(10e9);

    besuWeb3SigningCredential = {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    };

    const deployContractResponse = await besuConnector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: LockAssetContractJson.contractName,
      contractAbi: LockAssetContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: besuWeb3SigningCredential,
      bytecode: LockAssetContractJson.bytecode,
      gas: 1000000,
    });

    expect(deployContractResponse).not.toBeUndefined();
    expect(deployContractResponse.transactionReceipt).not.toBeUndefined();
    expect(
      deployContractResponse.transactionReceipt.contractAddress,
    ).not.toBeUndefined();

    besuKeychainId = keychainPlugin.getKeychainId();
    besuContractName = LockAssetContractJson.contractName;

    const contractAddress: string = deployContractResponse.transactionReceipt
      .contractAddress as string;

    expect(typeof contractAddress).toBe("string");
  }
});

beforeEach(async () => {
  {
    // Gateways configuration
    const clientGatewayPluginOptions: IFabricSatpGatewayConstructorOptions = {
      name: "cactus-plugin#satpGateway",
      dltIDs: ["DLT2"],
      instanceId: uuidv4(),
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      fabricPath: fabricPath,
      fabricSigningCredential: fabricSigningCredential,
      fabricChannelName: fabricChannelName,
      fabricContractName: fabricContractName,
      clientHelper: new ClientGatewayHelper(),
      serverHelper: new ServerGatewayHelper(),
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexRemoteConnection,
    };

    serverGatewayPluginOptions = {
      name: "cactus-plugin#satpGateway",
      dltIDs: ["DLT1"],
      instanceId: uuidv4(),
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      besuPath: besuPath,
      besuWeb3SigningCredential: besuWeb3SigningCredential,
      besuContractName: besuContractName,
      besuKeychainId: besuKeychainId,
      clientHelper: new ClientGatewayHelper(),
      serverHelper: new ServerGatewayHelper(),
      knexLocalConfig: knexServerConnection,
      knexRemoteConfig: knexRemoteConnection,
    };

    pluginSourceGateway = new FabricSatpGateway(clientGatewayPluginOptions);
    pluginRecipientGateway = new BesuSatpGateway(serverGatewayPluginOptions);

    expect(pluginSourceGateway.localRepository?.database).not.toBeUndefined();
    expect(
      pluginRecipientGateway.localRepository?.database,
    ).not.toBeUndefined();

    await pluginSourceGateway.localRepository?.reset();
    await pluginRecipientGateway.localRepository?.reset();
  }
  {
    // Server Gateway configuration
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    recipientGatewayServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 5000,
      server: recipientGatewayServer,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    serverGatewayApiHost = `http://${address}:${port}`;

    await pluginRecipientGateway.getOrCreateWebServices();
    await pluginRecipientGateway.registerWebServices(expressApp);
  }
  {
    // Client Gateway configuration
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    sourceGatewayServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 3001,
      server: sourceGatewayServer,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    clientGatewayApiHost = `http://${address}:${port}`;

    await pluginSourceGateway.getOrCreateWebServices();
    await pluginSourceGateway.registerWebServices(expressApp);
  }
});

test("server gateway crashes after creating besu asset", async () => {
  const expiryDate = new Date(2060, 11, 24).toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };

  const clientRequest: ClientV1Request = {
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

  const transferCommenceRequest =
    await pluginSourceGateway.clientHelper.sendTransferCommenceRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (transferCommenceRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  );

  const transferCommenceResponse =
    await pluginRecipientGateway.serverHelper.sendTransferCommenceResponse(
      transferCommenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (transferCommenceResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.lockAsset(sessionID);

  const lockEvidenceRequest =
    await pluginSourceGateway.clientHelper.sendLockEvidenceRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (lockEvidenceRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidLockEvidenceRequest(
    lockEvidenceRequest,
    pluginRecipientGateway,
  );

  const lockEvidenceResponse =
    await pluginRecipientGateway.serverHelper.sendLockEvidenceResponse(
      lockEvidenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (lockEvidenceResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidLockEvidenceResponse(
    lockEvidenceResponse,
    pluginSourceGateway,
  );

  const commitPreparationRequest =
    await pluginSourceGateway.clientHelper.sendCommitPreparationRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (commitPreparationRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidCommitPreparationRequest(
    commitPreparationRequest,
    pluginRecipientGateway,
  );

  const commitPreparationResponse =
    await pluginRecipientGateway.serverHelper.sendCommitPreparationResponse(
      lockEvidenceRequest.sessionID,
      pluginRecipientGateway,
      false,
    );

  if (commitPreparationResponse == void 0) {
    expect(false);
    return;
  }

  await pluginSourceGateway.clientHelper.checkValidCommitPreparationResponse(
    commitPreparationResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.deleteAsset(sessionID);

  const commitFinalRequest =
    await pluginSourceGateway.clientHelper.sendCommitFinalRequest(
      sessionID,
      pluginSourceGateway,
      false,
    );

  if (commitFinalRequest == void 0) {
    expect(false);
    return;
  }

  await pluginRecipientGateway.serverHelper.checkValidCommitFinalRequest(
    commitFinalRequest,
    pluginRecipientGateway,
  );

  await pluginRecipientGateway.createAsset(sessionID);

  // now we simulate the crash of the server gateway
  pluginRecipientGateway.localRepository?.destroy();
  pluginRecipientGateway.remoteRepository?.destroy();
  await Servers.shutdown(recipientGatewayServer);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  recipientGatewayServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 5000,
    server: recipientGatewayServer,
  };

  await Servers.listen(listenOptions);

  pluginRecipientGateway = new BesuSatpGateway(serverGatewayPluginOptions);
  await pluginRecipientGateway.registerWebServices(expressApp);

  // client gateway self-healed and is back online
  await pluginRecipientGateway.recoverOpenSessions(true);

  await makeSessionDataChecks(
    pluginSourceGateway,
    pluginRecipientGateway,
    sessionID,
  );

  await expect(
    pluginSourceGateway.fabricAssetExists(FABRIC_ASSET_ID),
  ).resolves.toBe(false);

  await expect(
    pluginRecipientGateway.besuAssetExists(BESU_ASSET_ID),
  ).resolves.toBe(true);
});

afterAll(async () => {
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await besuTestLedger.stop();
  await besuTestLedger.destroy();

  await pluginSourceGateway.localRepository?.destroy();
  await pluginRecipientGateway.localRepository?.destroy();
  await pluginSourceGateway.remoteRepository?.destroy();
  await pluginRecipientGateway.remoteRepository?.destroy();

  await Servers.shutdown(besuServer);
  await Servers.shutdown(fabricServer);
  await Servers.shutdown(sourceGatewayServer);
  await Servers.shutdown(recipientGatewayServer);

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
