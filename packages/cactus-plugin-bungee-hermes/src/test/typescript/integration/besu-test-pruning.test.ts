import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import "jest-extended";
import LockAssetContractJson from "../solidity/lock-asset-contract/LockAsset.json";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import bodyParser from "body-parser";

import http, { Server } from "http";
import { Server as SocketIoServer } from "socket.io";

import express from "express";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { Constants } from "@hyperledger/cactus-core-api";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  EthContractInvocationType,
  ReceiptType,
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import Web3 from "web3";
import { Account } from "web3-core";
import {
  PluginBungeeHermes,
  IPluginBungeeHermesOptions,
} from "../../../main/typescript/plugin-bungee-hermes";

import {
  BesuNetworkDetails,
  StrategyBesu,
} from "../../../main/typescript/strategy/strategy-besu";

const logLevel: LogLevelDesc = "INFO";

let besuLedger: BesuTestLedger;
let contractName: string;

let rpcApiHttpHost: string;
let rpcApiWsHost: string;
let web3: Web3;
let firstHighNetWorthAccount: string;
let connector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let testEthAccount: Account;
const BESU_ASSET_ID = uuidv4();

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});
let besuPath: string;
let pluginBungeeHermesOptions: IPluginBungeeHermesOptions;
let besuServer: Server;

let bungeeSigningCredential: Web3SigningCredential;
let bungeeKeychainId: string;
let bungeeContractAddress: string;

let keychainPlugin: PluginKeychainMemory;

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
    besuLedger = new BesuTestLedger({
      logLevel,
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
    });
    await besuLedger.start();

    rpcApiHttpHost = await besuLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    web3 = new Web3(rpcApiHttpHost);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    testEthAccount = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    contractName = "LockAsset";

    const keychainEntryValue = besuKeyPair.privateKey;
    const keychainEntryKey = uuidv4();
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    keychainPlugin.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin],
    });

    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    connector = new PluginLedgerConnectorBesu(options);
    pluginRegistry.add(connector);

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

    await connector.getOrCreateWebServices();
    const wsApi = new SocketIoServer(besuServer, {
      path: Constants.SocketIoConnectionPathV1,
    });
    await connector.registerWebServices(expressApp, wsApi);
    besuPath = `http://${address}:${port}`;

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
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);

    log.info("Connector initialized");

    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: LockAssetContractJson.contractName,
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
    log.info("Contract Deployed successfully");

    const res = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
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

    const res3 = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getAsset",
      params: [BESU_ASSET_ID],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(res3).toBeTruthy();
    expect(res3.success).toBeTruthy();
    expect(res3.callOutput.toString()).toBeTruthy();

    bungeeSigningCredential = {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    };
    bungeeKeychainId = keychainPlugin.getKeychainId();

    bungeeContractAddress = deployOut.transactionReceipt
      .contractAddress as string;

    pluginBungeeHermesOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      logLevel,
    };
  }
});

test("test creation of views for specific timeframes", async () => {
  const bungee = new PluginBungeeHermes(pluginBungeeHermesOptions);
  const strategy = "BESU";
  bungee.addStrategy(strategy, new StrategyBesu("INFO"));
  const netwokDetails: BesuNetworkDetails = {
    signingCredential: bungeeSigningCredential,
    contractName,
    connectorApiPath: besuPath,
    keychainId: bungeeKeychainId,
    contractAddress: bungeeContractAddress,
    participant: firstHighNetWorthAccount,
  };

  const snapshot = await bungee.generateSnapshot([], strategy, netwokDetails);
  const view = bungee.generateView(
    snapshot,
    "0",
    Number.MAX_SAFE_INTEGER.toString(),
    undefined,
  );

  //expect to return a view
  expect(view.view).toBeTruthy();
  expect(view.signature).toBeTruthy();

  //expect the view to have capture the new asset BESU_ASSET_ID, and attributes to match
  expect(snapshot.getStateBins().length).toEqual(1);
  expect(snapshot.getStateBins()[0].getId()).toEqual(BESU_ASSET_ID);
  expect(snapshot.getStateBins()[0].getTransactions().length).toEqual(1);

  //changing BESU_ASSET_ID value
  const lockAsset = await connector.invokeContract({
    contractName,
    keychainId: keychainPlugin.getKeychainId(),
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
  expect(lockAsset).not.toBeUndefined();
  expect(lockAsset.success).toBeTrue();

  const snapshot1 = await bungee.generateSnapshot([], strategy, netwokDetails);

  //tI is the time of the first transaction + 1
  const tI = (
    parseInt(snapshot.getStateBins()[0].getTransactions()[0].getTimeStamp()) + 1
  ).toString();

  const view1 = bungee.generateView(
    snapshot1,
    tI,
    Number.MAX_SAFE_INTEGER.toString(),
    undefined,
  );

  //expect to return a view
  expect(view1.view).toBeTruthy();
  expect(view1.signature).toBeTruthy();

  expect(snapshot1.getStateBins().length).toEqual(1);
  expect(snapshot1.getStateBins()[0].getId()).toEqual(BESU_ASSET_ID);
  //expect the view to not include first transaction (made before tI)
  expect(snapshot1.getStateBins()[0].getTransactions().length).toEqual(1);
  //expect old and new snapshot state values to differ
  expect(snapshot1.getStateBins()[0].getValue()).not.toEqual(
    snapshot.getStateBins()[0].getValue(),
  );
});

afterAll(async () => {
  await Servers.shutdown(besuServer);
  await besuLedger.stop();
  await besuLedger.destroy();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
