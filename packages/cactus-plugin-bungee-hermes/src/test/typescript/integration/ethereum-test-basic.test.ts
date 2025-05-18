/**
 * Tests for deploying a contract and invoking it's method by directly sending contract JSON.
 *
 * @note all tests must be run in order, don't use `skip()` or `only()`. @todo - fix that
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "info";

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidV4 } from "uuid";
import { AddressInfo } from "net";
import http, { Server } from "http";
import { Server as SocketIoServer } from "socket.io";
import Web3 from "web3";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
  Logger,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";

import LockAssetContractJson from "../../typescript/solidity/lock-asset-contract/LockAsset.json";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { Account } from "web3-core";
import {
  IPluginBungeeHermesOptions,
  PluginBungeeHermes,
} from "../../../main/typescript";
import {
  EthereumNetworkDetails,
  StrategyEthereum,
} from "../../../main/typescript/strategy/strategy-ethereum";

const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-invoke-web3-contract-v1.test",
  level: testLogLevel,
});

log.info("Test started");
const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("Ethereum contract deploy and invoke using keychain", () => {
  const keychainEntryKey = uuidV4();
  let testEthAccount: Account,
    web3: InstanceType<typeof Web3>,
    addressInfo,
    address: string,
    port: number,
    contractAddress: string,
    apiHost: string,
    apiConfig,
    ledger: GethTestLedger,
    apiClient: EthereumApi,
    connector: PluginLedgerConnectorEthereum,
    rpcApiHttpHost: string,
    keychainPlugin: PluginKeychainMemory;

  let bungeeSigningCredential: Web3SigningCredential;
  let bungeeKeychainId: string;
  let bungeeContractAddress: string;
  let pluginBungeeHermesOptions: IPluginBungeeHermesOptions;
  const ETH_ASSET_NAME = uuidV4();

  let server: Server;

  //////////////////////////////////
  // Setup
  //////////////////////////////////

  let networkDetailsList: EthereumNetworkDetails[];

  beforeEach(async () => {
    pruneDockerAllIfGithubAction({ logLevel: testLogLevel })
      .then(() => {
        log.info("Pruning throw OK");
      })
      .catch(async () => {
        await Containers.logDiagnostics({ logLevel: testLogLevel });
        fail("Pruning didn't throw OK");
      });

    ledger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ledger.start();

    const expressApp = express();

    expressApp.use(bodyParser.json({ limit: "250mb" }));
    // set to address Type Error returned by Response.json()
    // "Can't serialize BigInt"
    expressApp.set("json replacer", stringifyBigIntReplacer);

    server = http.createServer(expressApp);

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 5000,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new EthereumApi(apiConfig);
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create();

    const keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel: testLogLevel,
    });
    keychainPlugin.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );
    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });
    connector = new PluginLedgerConnectorEthereum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel: testLogLevel,
      pluginRegistry,
    });

    // Instantiate connector with the keychain plugin that already has the
    // private key we want to use for one of our tests
    await connector.getOrCreateWebServices();
    const wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });

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
    contractAddress = deployOut.data.transactionReceipt
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

    bungeeSigningCredential = {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.PrivateKeyHex,
    };
    bungeeKeychainId = keychainPlugin.getKeychainId();

    bungeeContractAddress = deployOut.data.transactionReceipt
      .contractAddress as string;

    pluginBungeeHermesOptions = {
      pluginRegistry,
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidV4(),
      logLevel: testLogLevel,
    };
    networkDetailsList = [
      {
        signingCredential: bungeeSigningCredential,
        contractName: LockAssetContractJson.contractName,
        connectorApiPath: apiHost,
        keychainId: bungeeKeychainId,
        contractAddress: bungeeContractAddress,
        participant: WHALE_ACCOUNT_ADDRESS,
      } as EthereumNetworkDetails,
      {
        signingCredential: bungeeSigningCredential,
        contractName: LockAssetContractJson.contractName,
        connector: connector,
        keychainId: bungeeKeychainId,
        contractAddress: bungeeContractAddress,
        participant: WHALE_ACCOUNT_ADDRESS,
      } as EthereumNetworkDetails,
    ];
  });

  afterEach(async () => {
    await Servers.shutdown(server);
    await ledger.stop();
    await ledger.destroy();

    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel })
      .then(() => {
        log.info("Pruning throw OK");
      })
      .catch(async () => {
        await Containers.logDiagnostics({ logLevel: testLogLevel });
        fail("Pruning didn't throw OK");
      });
  });
  test.each([{ apiPath: true }, { apiPath: false }])(
    //test for both EthereumApiPath and EthereumConnector
    "test creation of views for different timeframes and states",
    async ({ apiPath }) => {
      if (!apiPath) {
        // set to address Type Error returned by Response.json() when using the connector by it self
        // "Can't serialize BigInt"
        const originalStringify = JSON.stringify;
        const mock = jest.spyOn(JSON, "stringify");
        mock.mockImplementation((value: any) => {
          return originalStringify(value, stringifyBigIntReplacer);
        });
      }

      let networkDetails: EthereumNetworkDetails;
      if (apiPath) {
        networkDetails = networkDetailsList[0];
      } else {
        networkDetails = networkDetailsList[1];
      }
      const bungee = new PluginBungeeHermes(pluginBungeeHermesOptions);
      const strategy = "ETH";
      bungee.addStrategy(strategy, new StrategyEthereum("INFO"));
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

      //expect the view to have capture the new asset ETH_ASSET_NAME, and attributes to match
      expect(snapshot.getStateBins().length).toEqual(1);
      expect(snapshot.getStateBins()[0].getId()).toEqual(ETH_ASSET_NAME);
      expect(snapshot.getStateBins()[0].getTransactions().length).toEqual(1);

      const view1 = bungee.generateView(snapshot, "0", "9999", undefined);

      //expects nothing to limit time of 9999
      expect(view1.view).toBeUndefined();
      expect(view1.signature).toBeUndefined();

      //changing ETH_ASSET_NAME value
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

      //changing ETH_ASSET_NAME value
      const new_asset_id = uuidV4();
      const depNew = await apiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPlugin.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "createAsset",
        params: [new_asset_id, 10],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(depNew).not.toBeUndefined();
      expect(depNew.status).toBe(200);

      const snapshot1 = await bungee.generateSnapshot(
        [],
        strategy,
        networkDetails,
      );
      const view2 = bungee.generateView(
        snapshot1,
        "0",
        Number.MAX_SAFE_INTEGER.toString(),
        undefined,
      );
      //expect to return a view
      expect(view2.view).toBeTruthy();
      expect(view2.signature).toBeTruthy();

      const stateBins = snapshot1.getStateBins();
      expect(stateBins.length).toEqual(2); //expect to have captured state for both assets

      const bins = [stateBins[0].getId(), stateBins[1].getId()];

      //checks if values match:
      //  - new value of ETH_ASSET_NAME state in new snapshot different than value from old snapshot)
      //  - successfully captured transaction that created the new asset
      if (bins[0] === ETH_ASSET_NAME) {
        expect(snapshot1.getStateBins()[0].getTransactions().length).toEqual(2);
        expect(snapshot1.getStateBins()[0].getValue()).not.toEqual(
          snapshot.getStateBins()[0].getValue(),
        );
        expect(snapshot1.getStateBins()[1].getTransactions().length).toEqual(1);
      } else {
        expect(snapshot1.getStateBins()[0].getTransactions().length).toEqual(1);
        expect(snapshot1.getStateBins()[1].getTransactions().length).toEqual(2);
        expect(snapshot1.getStateBins()[1].getValue()).not.toEqual(
          snapshot.getStateBins()[0].getValue(),
        );
      }
    },
  );
});

function stringifyBigIntReplacer(key: string, value: bigint): string {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
