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
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { stringify as safeStableStringify } from "safe-stable-stringify";

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
  DefaultApi as BungeeApi,
  PrivacyPolicyOpts,
} from "../../../main/typescript/generated/openapi/typescript-axios/api";
import {
  BesuNetworkDetails,
  StrategyBesu,
} from "../../../main/typescript/strategy/strategy-besu";
import { View } from "../../../main/typescript/view-creation/view";
import { deserializeView } from "../../../main/typescript/utils";

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
let bungeeServer: Server;

let keychainPlugin: PluginKeychainMemory;

let networkDetailsList: BesuNetworkDetails[];

beforeEach(async () => {
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
      safeStableStringify(LockAssetContractJson),
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

    //creating new asset
    const new_asset_id = uuidv4();
    const depNew = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: [new_asset_id, 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(depNew).not.toBeUndefined();
    expect(depNew.success).toBeTrue();

    bungeeSigningCredential = {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    };
    bungeeKeychainId = keychainPlugin.getKeychainId();

    bungeeContractAddress = deployOut.transactionReceipt
      .contractAddress as string;

    pluginBungeeHermesOptions = {
      pluginRegistry,
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      logLevel,
    };
  }
  networkDetailsList = [
    {
      signingCredential: bungeeSigningCredential,
      contractName,
      connectorApiPath: besuPath,
      keychainId: bungeeKeychainId,
      contractAddress: bungeeContractAddress,
      participant: firstHighNetWorthAccount,
    } as BesuNetworkDetails,
    {
      signingCredential: bungeeSigningCredential,
      contractName,
      connector: connector,
      keychainId: bungeeKeychainId,
      contractAddress: bungeeContractAddress,
      participant: firstHighNetWorthAccount,
    } as BesuNetworkDetails,
  ];
});

test.each([{ apiPath: true }, { apiPath: false }])(
  //test for both BesuApiPath and BesuConnector
  "test merging views, and integrated view proofs",
  async ({ apiPath }) => {
    let networkDetails: BesuNetworkDetails;
    if (apiPath) {
      networkDetails = networkDetailsList[0];
    } else {
      networkDetails = networkDetailsList[1];
    }

    const bungee = new PluginBungeeHermes(pluginBungeeHermesOptions);
    const strategy = "BESU";
    bungee.addStrategy(strategy, new StrategyBesu("INFO"));

    const snapshot = await bungee.generateSnapshot(
      [],
      strategy,
      networkDetails,
    );
    const view = bungee.generateView(
      snapshot,
      "0",
      Number.MAX_SAFE_INTEGER.toString(),
      undefined,
    );
    //expect to return a view
    expect(view.view).toBeTruthy();
    expect(view.signature).toBeTruthy();

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    bungeeServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 3000,
      server: bungeeServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    await bungee.getOrCreateWebServices();
    await bungee.registerWebServices(expressApp);
    const bungeePath = `http://${address}:${port}`;

    const config = new Configuration({ basePath: bungeePath });
    const bungeeApi = new BungeeApi(config);

    const processed = await bungeeApi.processViewV1({
      serializedView: safeStableStringify({
        view: safeStableStringify(view.view as View),
        signature: view.signature,
      })!,
      policyId: PrivacyPolicyOpts.PruneState,
      policyArguments: [BESU_ASSET_ID],
    });

    expect(processed.status).toBe(200);
    expect(processed.data.view).toBeTruthy();
    expect(processed.data.signature).toBeTruthy();

    const processedView = deserializeView(safeStableStringify(processed.data));

    //check view deserializer
    expect(safeStableStringify(processedView)).toEqual(processed.data.view);

    expect(processedView.getPolicy()).toBeTruthy();
    expect(processedView.getOldVersionsMetadata().length).toBe(1);
    expect(processedView.getOldVersionsMetadata()[0].signature).toBe(
      view.signature,
    );
    expect(processedView.getAllTransactions().length).toBe(1);
  },
);

afterEach(async () => {
  await Servers.shutdown(besuServer);
  await Servers.shutdown(bungeeServer);
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
