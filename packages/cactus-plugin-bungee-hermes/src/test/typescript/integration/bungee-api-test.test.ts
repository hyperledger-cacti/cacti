import {
  bigIntToDecimalStringReplacer,
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger-cacti/cactus-common";
import "jest-extended";
import LockAssetContractJson from "../solidity/lock-asset-contract/LockAsset.json";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";
import bodyParser from "body-parser";

import http, { Server } from "http";
import { Server as SocketIoServer } from "socket.io";
import express from "express";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import {
  BesuTestLedger,
  pruneDockerContainersIfGithubAction,
  Containers,
} from "@hyperledger-cacti/cactus-test-tooling";
import { Configuration, Constants } from "@hyperledger-cacti/cactus-core-api";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  EthContractInvocationType,
  ReceiptType,
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredential,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-besu";
import Web3 from "web3";
import { Account } from "web3-core";
import {
  PluginBungeeHermes,
  IPluginBungeeHermesOptions,
} from "../../../main/typescript/plugin-bungee-hermes";
import { DefaultApi as BungeeApi } from "../../../main/typescript/generated/openapi/typescript-axios/api";
import {
  PluginLedgerConnectorEthereum,
  DefaultApi as EthereumApi,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger-cacti/cactus-test-geth-ledger";
import { StrategyEthereum } from "../../../main/typescript/strategy/strategy-ethereum";
import { StrategyBesu } from "../../../main/typescript/strategy/strategy-besu";

interface BesuNetworkDetails {
  connectorApiPath: string;
  participant: string;
  signingCredential: Web3SigningCredential;
  keychainId: string;
  contractName: string;
  contractAddress: string;
}

interface EthereumNetworkDetails {
  connectorApiPath: string;
  participant: string;
  signingCredential: Web3SigningCredential;
  keychainId: string;
  contractName: string;
  contractAddress: string;
}

const logLevel: LogLevelDesc = "INFO";

let besuLedger: BesuTestLedger;
let besuContractName: string;
let besuPath: string;
let besuServer: Server;
let besuConnector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let testEthAccount: Account;
let firstHighNetWorthAccount: string;
let besuKeychainPlugin: PluginKeychainMemory;
let besuSigningCredential: Web3SigningCredential;
let besuContractAddress: string;

let rpcApiHttpHost: string;
let rpcApiWsHost: string;
let web3: Web3;
const BESU_ASSET_ID = uuidv4();

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let ethereumPath: string;
let ethereumSigningCredential: Web3SigningCredential;
let ethereumKeychainId: string;
let ethereumContractAddress: string;
let ethereumServer: Server;
let ethereumLedger: GethTestLedger;

let pluginBungeeHermesOptions: IPluginBungeeHermesOptions;
let bungeeServer: Server;

const BESU_STRATEGY = "BESU";
// TODO(#3978): FABRIC_STRATEGY tests skipped — the Fabric AIO container does not
// start reliably in CI. Re-enable once #3978 is resolved.
// const FABRIC_STRATEGY = "FABRIC";
const ETH_STRATEGY = "ETHEREUM";

beforeAll(async () => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  try {
    log.info(await setupBesuTestLedger());
    log.info(await setupEthereumTestLedger());
  } catch (ex) {
    log.error("bungee-api-test beforeAll setup failed:", ex);
    besuServer = undefined as unknown as Server;
    ethereumServer = undefined as unknown as Server;
    bungeeServer = undefined as unknown as Server;
    besuLedger = undefined as unknown as BesuTestLedger;
    ethereumLedger = undefined as unknown as GethTestLedger;
    throw ex;
  }
});

test("tests bungee api using different strategies", async () => {
  const pluginRegistry = new PluginRegistry({ logLevel, plugins: [] });
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  pluginBungeeHermesOptions = {
    pluginRegistry,
    keyPair,
    instanceId: uuidv4(),
    logLevel,
  };
  const bungee = new PluginBungeeHermes(pluginBungeeHermesOptions);
  pluginRegistry.add(bungee);

  //add strategies to BUNGEE - Hermes
  // TODO(#3978): StrategyFabric skipped — Fabric AIO unreliable in CI.
  bungee.addStrategy(BESU_STRATEGY, new StrategyBesu("INFO"));
  bungee.addStrategy(ETH_STRATEGY, new StrategyEthereum("INFO"));

  //store network details for Besu and Ethereum networks
  const besuNetworkDetails: BesuNetworkDetails = {
    signingCredential: besuSigningCredential,
    contractName: besuContractName,
    connectorApiPath: besuPath,
    keychainId: besuKeychainPlugin.getKeychainId(),
    contractAddress: besuContractAddress,
    participant: firstHighNetWorthAccount,
  };

  const ethereumNetworkDetails: EthereumNetworkDetails = {
    signingCredential: ethereumSigningCredential,
    contractName: LockAssetContractJson.contractName,
    connectorApiPath: ethereumPath,
    keychainId: ethereumKeychainId,
    contractAddress: ethereumContractAddress,
    participant: WHALE_ACCOUNT_ADDRESS,
  };

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  bungeeServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server: bungeeServer,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;

  await bungee.getOrCreateWebServices();
  await bungee.registerWebServices(expressApp);
  const bungeePath = `http://${address}:${port}`;

  const config = new Configuration({ basePath: bungeePath });
  const bungeeApi = new BungeeApi(config);

  //View creation for all networks, using the respective strategies
  // TODO(#3978): Fabric view creation skipped — Fabric AIO unreliable in CI.
  // https://github.com/hyperledger-cacti/cacti/issues/3978

  const viewBesu = await bungeeApi.createViewV1({
    strategyId: BESU_STRATEGY,
    networkDetails: besuNetworkDetails,
  });
  //expect to return a view
  expect(viewBesu.status).toEqual(200);
  expect(viewBesu.data.view).toBeTruthy();

  const viewEth = await bungeeApi.createViewV1({
    strategyId: ETH_STRATEGY,
    networkDetails: ethereumNetworkDetails,
  });
  //expect to return a view
  expect(viewEth.status).toEqual(200);
  expect(viewEth.data.view).toBeTruthy();

  const strategyReq = await bungeeApi.getAvailableStrategies();
  const pubKeyReq = await bungeeApi.getPublicKey();
  for (const strategy of strategyReq.data) {
    expect([BESU_STRATEGY, ETH_STRATEGY]).toInclude(strategy);
  }
  expect(pubKeyReq.data).toEqual(
    Buffer.from(keyPair.publicKey).toString("hex"),
  );

  // TODO(#3978): Fabric snapshot/merkle verification skipped — Fabric AIO unreliable in CI.
  // https://github.com/hyperledger-cacti/cacti/issues/3978

  const viewEth1 = bungee.generateView(
    await bungee.generateSnapshot([], ETH_STRATEGY, ethereumNetworkDetails),
    "0",
    Number.MAX_SAFE_INTEGER.toString(),
    undefined,
  );
  const proof1 = viewEth1.view?.getViewProof();
  const stateProofs1 = viewEth1.view
    ?.getSnapshot()
    .getStateBins()
    .map((x) => safeStableStringify(x.getStateProof()));
  const transactionProofs1: string[] = [];
  viewEth1.view
    ?.getAllTransactions()
    .forEach((t) => transactionProofs1.push(safeStableStringify(t.getProof())));
  const verifyStateRoot1 = await bungeeApi.verifyMerkleRoot({
    input: stateProofs1?.reverse(), //check integrity, order should not matter
    root: proof1?.statesMerkleRoot,
  });
  expect(verifyStateRoot1.status).toEqual(200);
  expect(verifyStateRoot1.data.result).toBeTrue();

  const verifyTransactionsRoot1 = await bungeeApi.verifyMerkleRoot({
    input: transactionProofs1?.reverse(), //check integrity, order should not matter
    root: proof1?.transactionsMerkleRoot,
  });

  expect(verifyTransactionsRoot1.status).toEqual(200);
  expect(verifyTransactionsRoot1.data.result).toBeTrue();
});

afterAll(async () => {
  // Guard every shutdown call: if setup threw before a server/ledger was
  // initialised the variable is `undefined` and Servers.shutdown() would throw
  // "server was falsy", masking the real test failure with a second error.
  await Promise.allSettled([
    besuServer ? Servers.shutdown(besuServer) : Promise.resolve(),
    bungeeServer ? Servers.shutdown(bungeeServer) : Promise.resolve(),
    ethereumServer ? Servers.shutdown(ethereumServer) : Promise.resolve(),
  ]);

  if (ethereumLedger) {
    await ethereumLedger.stop();
    await ethereumLedger.destroy();
  }
  if (besuLedger) {
    await besuLedger.stop();
    await besuLedger.destroy();
  }

  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

async function setupBesuTestLedger(): Promise<string> {
  besuLedger = new BesuTestLedger({
    logLevel,
    emitContainerLogs: true,
    envVars: ["BESU_NETWORK=dev"],
  });
  await besuLedger.start();
  log.info("Besu test ledger initialized");
  rpcApiHttpHost = await besuLedger.getRpcApiHttpHost();
  rpcApiWsHost = await besuLedger.getRpcApiWsHost();
  web3 = new Web3(rpcApiHttpHost);
  firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

  testEthAccount = await besuLedger.createEthTestAccount();

  besuKeyPair = {
    privateKey: besuLedger.getGenesisAccountPrivKey(),
  };

  besuContractName = "LockAsset";

  const keychainEntryValue = besuKeyPair.privateKey;
  const keychainEntryKey = uuidv4();
  besuKeychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),

    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });

  besuKeychainPlugin.set(
    besuContractName,
    safeStableStringify(LockAssetContractJson),
  );

  const pluginRegistry = new PluginRegistry({
    plugins: [besuKeychainPlugin],
  });

  const options: IPluginLedgerConnectorBesuOptions = {
    instanceId: uuidv4(),
    rpcApiHttpHost,
    rpcApiWsHost,
    pluginRegistry,
    logLevel,
  };

  besuConnector = new PluginLedgerConnectorBesu(options);
  pluginRegistry.add(besuConnector);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  besuServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
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
  log.info("Besu connector initialized");

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
  expect(balance).toBeTruthy();
  expect(parseInt(balance, 10)).toBeGreaterThan(10e9);

  const deployOut = await besuConnector.deployContract({
    keychainId: besuKeychainPlugin.getKeychainId(),
    contractName: besuContractName,
    contractAbi: LockAssetContractJson.abi,
    constructorArgs: [],
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    bytecode: LockAssetContractJson.bytecode,
    gas: 1000000,
  });
  expect(deployOut).toBeTruthy();
  expect(deployOut.transactionReceipt).toBeTruthy();
  expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
  log.info("Besu contract Deployed successfully");

  const res = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: besuKeychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: [BESU_ASSET_ID, 19],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(res).toBeTruthy();
  expect(res.success).toBeTruthy();

  log.info("Besu asset created successfully");

  const res1 = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: besuKeychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: [BESU_ASSET_ID],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(res1).toBeTruthy();
  expect(res1.success).toBeTruthy();

  const res2 = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: besuKeychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "unLockAsset",
    params: [BESU_ASSET_ID],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(res2).toBeTruthy();
  expect(res2.success).toBeTruthy();

  besuSigningCredential = {
    ethAccount: firstHighNetWorthAccount,
    secret: besuKeyPair.privateKey,
    type: Web3SigningCredentialType.PrivateKeyHex,
  };
  besuContractAddress = deployOut.transactionReceipt.contractAddress as string;
  return "Besu Network setup successful";
}

async function setupEthereumTestLedger(): Promise<string> {
  const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
  const containerImageVersion = "2023-07-27-2a8c48ed6";

  const keychainEntryKey = uuidv4();
  const ETH_ASSET_NAME = uuidv4();
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  ethereumServer = server;
  // set to address Type Error returned by Response.json()
  // "Can't serialize BigInt"
  expressApp.set("json replacer", bigIntToDecimalStringReplacer);

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const ledger = new GethTestLedger({
    containerImageName,
    containerImageVersion,
  });
  ethereumLedger = ledger;
  await ledger.start();

  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  ethereumPath = `http://${address}:${port}`;
  const apiConfig = new Configuration({ basePath: ethereumPath });
  const apiClient = new EthereumApi(apiConfig);
  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create();

  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel: logLevel,
  });
  keychainPlugin.set(
    LockAssetContractJson.contractName,
    safeStableStringify(LockAssetContractJson),
  );
  const connector = new PluginLedgerConnectorEthereum({
    instanceId: uuidv4(),
    rpcApiHttpHost,
    logLevel: logLevel,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  // Instantiate connector with the keychain plugin that already has the
  // private key we want to use for one of our tests
  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, wsApi);

  const initTransferValue = web3.utils.toWei("5000", "ether");
  await apiClient.runTransactionV1({
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
    transactionConfig: {
      from: WHALE_ACCOUNT_ADDRESS,
      to: testEthAccount.address,
      value: initTransferValue,
    },
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  expect(balance).toBeTruthy();
  expect(balance.toString()).toBe(initTransferValue);

  const deployOut = await apiClient.deployContract({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
    },
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(deployOut).toBeTruthy();
  expect(deployOut.data).toBeTruthy();
  expect(deployOut.data.transactionReceipt).toBeTruthy();
  expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();
  log.info("contract deployed successfully");
  const contractAddress = deployOut.data.transactionReceipt
    .contractAddress as string;
  expect(typeof contractAddress).toBe("string");
  expect(contractAddress).toBeTruthy();

  const invokeOut = await apiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: [ETH_ASSET_NAME, 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(invokeOut).toBeTruthy();
  expect(invokeOut.data).toBeTruthy();
  log.info("contract call successfull");

  const lockAsset = await apiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: [ETH_ASSET_NAME],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(lockAsset).not.toBeUndefined();
  expect(lockAsset.status).toBe(200);

  ethereumSigningCredential = {
    ethAccount: WHALE_ACCOUNT_ADDRESS,
    secret: "",
    type: Web3SigningCredentialType.PrivateKeyHex,
  };
  ethereumKeychainId = keychainPlugin.getKeychainId();

  ethereumContractAddress = deployOut.data.transactionReceipt
    .contractAddress as string;

  return "Ethereum Network setup successful";
}
