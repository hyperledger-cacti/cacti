import fs from "fs-extra";
import "jest-extended";
import http, { Server } from "http";
import { Server as SocketIoServer } from "socket.io";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { create } from "ipfs-http-client";
import bodyParser from "body-parser";
import express from "express";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { AssetProfile } from "../../../main/typescript/generated/openapi/typescript-axios";
import {
  Checks,
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
  GoIpfsTestContainer,
  BesuTestLedger,
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
  IPluginOdapGatewayConstructorOptions,
  PluginOdapGateway,
} from "../../../main/typescript/gateway/plugin-odap-gateway";
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
import { knexClientConnection, knexServerConnection } from "../knex.config";
import { makeSessionDataChecks } from "../make-checks";
import {
  sendTransferCommenceRequest,
  checkValidTransferCommenceResponse,
} from "../../../main/typescript/gateway/client/transfer-commence";
import {
  sendTransferInitializationRequest,
  checkValidInitializationResponse,
} from "../../../main/typescript/gateway/client/transfer-initialization";
import {
  checkValidtransferCommenceRequest,
  sendTransferCommenceResponse,
} from "../../../main/typescript/gateway/server/transfer-commence";
import {
  checkValidInitializationRequest,
  sendTransferInitializationResponse,
} from "../../../main/typescript/gateway/server/transfer-initialization";
import {
  isFabricAssetLocked,
  fabricAssetExists,
  besuAssetExists,
} from "../make-checks-ledgers";
/**
 * Use this to debug issues with the fabric node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */
let ipfsApiHost: string;

let fabricSigningCredential: FabricSigningCredential;
const logLevel: LogLevelDesc = "TRACE";

let ipfsServer: Server;
let sourceGatewayServer: Server;
let recipientGatewayServer: Server;
let besuServer: Server;
let fabricServer: Server;

let ipfsContainer: GoIpfsTestContainer;

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

let odapClientGatewayPluginOptions: IPluginOdapGatewayConstructorOptions;
let odapServerGatewayPluginOptions: IPluginOdapGatewayConstructorOptions;
let pluginSourceGateway: PluginOdapGateway;
let pluginRecipientGateway: PluginOdapGateway;

let odapClientGatewayApiHost: string;
let odapServerGatewayApiHost: string;

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const FABRIC_ASSET_ID = uuidv4();
const BESU_ASSET_ID = uuidv4();

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odapTestWithLedgerConnectors",
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
    // IPFS configuration
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
  }

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
    const sshConfig = await fabricLedger.getSshConfig();

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

    // This is the directory structure of the Fabirc 2.x CLI container (fabric-tools image)
    // const orgCfgDir = "/fabric-samples/test-network/organizations/";
    const orgCfgDir =
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/";

    // these below mirror how the fabric-samples sets up the configuration
    const org1Env = {
      CORE_LOGGING_LEVEL: "debug",
      FABRIC_LOGGING_SPEC: "debug",
      CORE_PEER_LOCALMSPID: "Org1MSP",

      ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

      FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
      CORE_PEER_TLS_ENABLED: "true",
      CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
      CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`,
      CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
      ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
    };

    // these below mirror how the fabric-samples sets up the configuration
    const org2Env = {
      CORE_LOGGING_LEVEL: "debug",
      FABRIC_LOGGING_SPEC: "debug",
      CORE_PEER_LOCALMSPID: "Org2MSP",

      FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
      CORE_PEER_TLS_ENABLED: "true",
      ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

      CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
      CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp`,
      CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt`,
      ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
    };

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry,
      cliContainerEnv: org1Env,
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
    fabricServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
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

    const response = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: fabricContractName,
      targetOrganizations: [org1Env, org2Env],
      caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
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

    // FIXME - without this wait it randomly fails with an error claiming that
    // the endorsement was impossible to be obtained. The fabric-samples script
    // does the same thing, it just waits 10 seconds for good measure so there
    // might not be a way for us to avoid doing this, but if there is a way we
    // absolutely should not have timeouts like this, anywhere...
    await new Promise((resolve) => setTimeout(resolve, 10000));

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
      hostname: "localhost",
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
  {
    // Gateways configuration
    odapClientGatewayPluginOptions = {
      name: "cactus-plugin#odapGateway",
      dltIDs: ["DLT2"],
      instanceId: uuidv4(),
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      ipfsPath: ipfsApiHost,
      fabricPath: fabricPath,
      fabricSigningCredential: fabricSigningCredential,
      fabricChannelName: fabricChannelName,
      fabricContractName: fabricContractName,
      fabricAssetID: FABRIC_ASSET_ID,
      knexConfig: knexClientConnection,
    };

    odapServerGatewayPluginOptions = {
      name: "cactus-plugin#odapGateway",
      dltIDs: ["DLT1"],
      instanceId: uuidv4(),
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      ipfsPath: ipfsApiHost,
      besuAssetID: BESU_ASSET_ID,
      besuPath: besuPath,
      besuWeb3SigningCredential: besuWeb3SigningCredential,
      besuContractName: besuContractName,
      besuKeychainId: besuKeychainId,
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
  }
  {
    // Server Gateway configuration
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    recipientGatewayServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 5000,
      server: recipientGatewayServer,
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
      port: 3001,
      server: sourceGatewayServer,
    };

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    odapClientGatewayApiHost = `http://${address}:${port}`;

    await pluginSourceGateway.getOrCreateWebServices();
    await pluginSourceGateway.registerWebServices(expressApp);
  }
});

test("client gateway crashes after lock fabric asset", async () => {
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

  const sessionID = pluginSourceGateway.configureOdapSession(odapClientRequest);

  const transferInitializationRequest = await sendTransferInitializationRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (transferInitializationRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidInitializationRequest(
    transferInitializationRequest,
    pluginRecipientGateway,
  );

  const transferInitializationResponse = await sendTransferInitializationResponse(
    transferInitializationRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (transferInitializationResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidInitializationResponse(
    transferInitializationResponse,
    pluginSourceGateway,
  );

  const transferCommenceRequest = await sendTransferCommenceRequest(
    sessionID,
    pluginSourceGateway,
    false,
  );

  if (transferCommenceRequest == void 0) {
    expect(false);
    return;
  }

  await checkValidtransferCommenceRequest(
    transferCommenceRequest,
    pluginRecipientGateway,
  );

  const transferCommenceResponse = await sendTransferCommenceResponse(
    transferCommenceRequest.sessionID,
    pluginRecipientGateway,
    false,
  );

  if (transferCommenceResponse == void 0) {
    expect(false);
    return;
  }

  await checkValidTransferCommenceResponse(
    transferCommenceResponse,
    pluginSourceGateway,
  );

  await pluginSourceGateway.lockFabricAsset(sessionID);

  // check if asset was successfully locked
  expect(
    await isFabricAssetLocked(
      pluginSourceGateway,
      fabricContractName,
      fabricChannelName,
      FABRIC_ASSET_ID,
      fabricSigningCredential,
    ),
  ).toBe(true);

  // now we simulate the crash of the client gateway
  pluginSourceGateway.database?.destroy();
  await Servers.shutdown(sourceGatewayServer);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  sourceGatewayServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 3001,
    server: sourceGatewayServer,
  };

  await Servers.listen(listenOptions);

  pluginSourceGateway = new PluginOdapGateway(odapClientGatewayPluginOptions);
  await pluginSourceGateway.registerWebServices(expressApp);

  // client gateway self-healed and is back online
  await pluginSourceGateway.recoverOpenSessions(true);

  await makeSessionDataChecks(
    pluginSourceGateway,
    pluginRecipientGateway,
    sessionID,
  );

  expect(
    await fabricAssetExists(
      pluginSourceGateway,
      fabricContractName,
      fabricChannelName,
      FABRIC_ASSET_ID,
      fabricSigningCredential,
    ),
  ).toBe(false);

  expect(
    await besuAssetExists(
      pluginRecipientGateway,
      besuContractName,
      besuKeychainId,
      BESU_ASSET_ID,
      besuWeb3SigningCredential,
    ),
  ).toBe(true);
});

afterAll(async () => {
  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await besuTestLedger.stop();
  await besuTestLedger.destroy();

  pluginSourceGateway.database?.destroy();
  pluginRecipientGateway.database?.destroy();

  await Servers.shutdown(ipfsServer);
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
