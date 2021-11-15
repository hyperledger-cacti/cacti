import http from "http";
import fs from "fs-extra";
import { Server as SocketIoServer } from "socket.io";
import { AddressInfo } from "net";
import secp256k1 from "secp256k1";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { PluginObjectStoreIpfs } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { create } from "ipfs-http-client";
import bodyParser from "body-parser";
import express from "express";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import {
  SendClientV1Request,
  AssetProfile,
} from "../../../../main/typescript/generated/openapi/typescript-axios";
import {
  Checks,
  IListenOptions,
  LoggerProvider,
  LogLevelDesc,
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
import { DefaultApi as OdapApi } from "../../../../main/typescript/public-api";
import LockAssetContractJson from "../../../solidity/lock-asset-contract/LockAsset.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Configuration,
  PluginImportType,
  Constants,
} from "@hyperledger/cactus-core-api";
import {
  OdapGateway,
  OdapGatewayConstructorOptions,
} from "../../../../main/typescript/gateway/odap-gateway";
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
/**
 * Use this to debug issues with the fabric node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */
let ipfsApiHost: string;
const testCase = "runs odap gateway tests via openApi";
let fabricSigningCredential: FabricSigningCredential;
const logLevel: LogLevelDesc = "TRACE";
let fabricLedger: FabricTestLedgerV1;
let fabricContractName: string;
let fabricChannelName: string;
let fabricPath: string;
let fabricAssetID: string;
let ipfsContainer: GoIpfsTestContainer;
let besuTestLedger: BesuTestLedger;
let besuPath: string;
let besuContractName: string;
let besuWeb3SigningCredential: Web3SigningCredential;
let besuKeychainId: string;
const level = "INFO";
const label = "fabric run transaction test";
const log = LoggerProvider.getOrCreate({ level, label });
log.info("setting up containers");
test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });
  {
    const channelId = "mychannel";
    const channelName = channelId;
    fabricChannelName = channelName;
    fabricLedger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
      logLevel,
    });
    await fabricLedger.start();
    const connectionProfile = await fabricLedger.getConnectionProfileOrg1();
    t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");
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
    const plugin = new PluginLedgerConnectorFabric(pluginOptions);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { port } = addressInfo;
    test.onFinish(async () => await Servers.shutdown(server));

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
    const apiUrl = `http://localhost:${port}`;
    fabricPath = apiUrl;
    const config = new Configuration({ basePath: apiUrl });

    const apiClient = new FabricApi(config);

    const contractName = "basic-asset-transfer-2";
    fabricContractName = contractName;
    const contractRelPath =
      "../../fabric-contracts/lock-asset/chaincode-typescript";
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
      // constructorArgs: { Args: ["john", "99"] },
      sourceFiles,
      ccName: contractName,
      targetOrganizations: [org1Env, org2Env],
      caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
      ccLabel: "basic-asset-transfer-2",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    });

    const { packageIds, lifecycle, success } = res.data;
    t.equal(res.status, 200, "res.status === 200 OK");
    t.true(success, "res.data.success === true");

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

    const assetId = uuidv4();
    fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
    fabricAssetID = assetId;
    const createRes = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId, "19"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    t.ok(createRes, "setRes truthy OK");
    t.true(createRes.status > 199, "createRes status > 199 OK");
    t.true(createRes.status < 300, "createRes status < 300 OK");
    t.comment(
      `BassicAssetTransfer.Create(): ${JSON.stringify(createRes.data)}`,
    );
  }
  ipfsContainer = new GoIpfsTestContainer({ logLevel });
  t.ok(ipfsContainer, "GoIpfsTestContainer instance truthy OK");
  {
    const container = await ipfsContainer.start();
    t.ok(container, "Container returned by start() truthy OK");
    t.ok(container, "Started GoIpfsTestContainer OK");

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    test.onFinish(async () => await Servers.shutdown(server));
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    ipfsApiHost = apiHost;
    const config = new Configuration({ basePath: apiHost });
    const apiClient = new ObjectStoreIpfsApi(config);
    t.ok(apiClient, "ObjectStoreIpfsApi truthy OK");

    const ipfsApiUrl = await ipfsContainer.getApiUrl();
    const ipfsGatewayUrl = await ipfsContainer.getWebGatewayUrl();
    t.comment(`Go IPFS Test Container API URL: ${ipfsApiUrl}`);
    t.comment(`Go IPFS Test Container Gateway URL: ${ipfsGatewayUrl}`);

    const ipfsClientOrOptions = create({
      url: ipfsApiUrl,
    });
    const instanceId = uuidv4();
    const plugin = new PluginObjectStoreIpfs({
      parentDir: `/${uuidv4()}/${uuidv4()}/`,
      logLevel,
      instanceId,
      ipfsClientOrOptions,
    });

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);

    const packageName = plugin.getPackageName();
    t.ok(packageName, "packageName truthy OK");

    const theInstanceId = plugin.getInstanceId();
    t.ok(theInstanceId, "theInstanceId truthy OK");
    t.equal(theInstanceId, instanceId, "instanceId === theInstanceId OK");
  }
  {
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
    const connector: PluginLedgerConnectorBesu = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    await connector.onPluginInit();
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { port } = addressInfo;
    test.onFinish(async () => await Servers.shutdown(server));

    await connector.getOrCreateWebServices();
    const wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });
    await connector.registerWebServices(expressApp, wsApi);
    const apiUrl = `http://localhost:${port}`;
    // eslint-disable-next-line prefer-const
    besuPath = apiUrl;
    await connector.transact({
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
    t.ok(balance, "Retrieved balance of test account OK");
    t.equals(parseInt(balance, 10), 10e9, "Balance of test account is OK");
    // eslint-disable-next-line prefer-const
    besuWeb3SigningCredential = {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    };
    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: LockAssetContractJson.contractName,
      contractAbi: LockAssetContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: besuWeb3SigningCredential,
      bytecode: LockAssetContractJson.bytecode,
      gas: 1000000,
    });
    besuKeychainId = keychainPlugin.getKeychainId();
    besuContractName = LockAssetContractJson.contractName;
    t.ok(deployOut, "deployContract() output is truthy OK");
    t.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );

    const contractAddress: string = deployOut.transactionReceipt
      .contractAddress as string;
    t.ok(
      typeof contractAddress === "string",
      "contractAddress typeof string OK",
    );
    t.end();
  }
});

test(testCase, async (t: Test) => {
  //const logLevel: LogLevelDesc = "TRACE";
  test.onFinish(async () => {
    await ipfsContainer.stop();
    await ipfsContainer.destroy();
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });
  const tearDown = async () => {
    await fabricLedger.stop();
    await fabricLedger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  const odapClientGateWayPluginID = uuidv4();
  const odapPluginOptions: OdapGatewayConstructorOptions = {
    name: "cactus-plugin#odapGateway",
    dltIDs: ["dummy"],
    instanceId: odapClientGateWayPluginID,
    ipfsPath: ipfsApiHost,
    fabricPath: fabricPath,
    fabricSigningCredential: fabricSigningCredential,
    fabricChannelName: fabricChannelName,
    fabricContractName: fabricContractName,
    fabricAssetID: fabricAssetID,
  };
  const clientOdapGateway = new OdapGateway(odapPluginOptions);

  const odapServerGatewayInstanceID = uuidv4();
  // the block below adds the server odap gateway to the plugin registry
  let odapServerGatewayPubKey: string;
  let odapServerGatewayApiHost: string;
  {
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    test.onFinish(async () => await Servers.shutdown(server));
    const { address, port } = addressInfo;
    odapServerGatewayApiHost = `http://${address}:${port}`;
    const odapPluginOptions: OdapGatewayConstructorOptions = {
      name: "cactus-plugin#odapGateway",
      dltIDs: ["dummy"],
      instanceId: odapServerGatewayInstanceID,
      ipfsPath: ipfsApiHost,
      besuAssetID: "whatever",
      besuPath: besuPath,
      besuWeb3SigningCredential: besuWeb3SigningCredential,
      besuContractName: besuContractName,
      besuKeychainId: besuKeychainId,
    };

    const plugin = new OdapGateway(odapPluginOptions);
    odapServerGatewayPubKey = plugin.pubKey;
    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
  }
  {
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    test.onFinish(async () => await Servers.shutdown(server));
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    const apiConfig = new Configuration({ basePath: apiHost });
    const apiClient = new OdapApi(apiConfig);
    await clientOdapGateway.getOrCreateWebServices();
    await clientOdapGateway.registerWebServices(expressApp);
    let dummyPrivKeyBytes = randomBytes(32);
    while (!secp256k1.privateKeyVerify(dummyPrivKeyBytes)) {
      dummyPrivKeyBytes = randomBytes(32);
    }
    const dummyPubKeyBytes = secp256k1.publicKeyCreate(dummyPrivKeyBytes);
    const dummyPubKey = clientOdapGateway.bufArray2HexStr(dummyPubKeyBytes);
    const expiryDate = new Date("23/25/2060").toString();
    const assetProfile: AssetProfile = { expirationDate: expiryDate };
    const odapClientRequest: SendClientV1Request = {
      serverGatewayConfiguration: {
        apiHost: odapServerGatewayApiHost,
      },
      version: "0.0.0",
      loggingProfile: "dummy",
      accessControlProfile: "dummy",
      applicationProfile: "dummy",
      payLoadProfile: {
        assetProfile: assetProfile,
        capabilities: "",
      },
      assetProfile: assetProfile,
      assetControlProfile: "dummy",
      beneficiaryPubkey: dummyPubKey,
      clientDltSystem: "dummy",
      clientIdentityPubkey: clientOdapGateway.pubKey,
      originatorPubkey: dummyPubKey,
      recipientGateWayDltSystem: "dummy",
      recipientGateWayPubkey: odapServerGatewayPubKey,
      serverDltSystem: "dummy",
      serverIdentityPubkey: dummyPubKey,
      sourceGateWayDltSystem: "dummy",
    };
    const res = await apiClient.sendClientRequestV1(odapClientRequest);
    t.ok(res);
  }
  t.end();
});
