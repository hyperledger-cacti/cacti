/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { AddressInfo } from "net";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import {
  IListenOptions,
  Logger,
  LoggerProvider,
  Servers,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Account } from "web3-core";
import LockAssetContractJson from "../../solidity/lock-asset-contract/LockAsset.json";
import { IPluginCcModelHephaestusOptions } from "../../../main/typescript";
import { CcModelHephaestus } from "../../../main/typescript/plugin-ccmodel-hephaestus";
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";

const log: Logger = LoggerProvider.getOrCreate({
  label: "cross-chain-model-conformance-checking.test",
  level: testLogLevel,
});
log.info("Test started");

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("Test cross-chain model serialization and conformance checking", () => {
  const keychainEntryKey = uuidv4();
  let testEthAccount: Account,
    web3: InstanceType<typeof Web3>,
    addressInfo,
    address: string,
    port: number,
    apiHost: string,
    apiConfig,
    ledger: GethTestLedger,
    apiClient: EthereumApi,
    connector: PluginLedgerConnectorEthereum,
    rpcApiHttpHost: string,
    keychainPlugin: PluginKeychainMemory;

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  let hephaestus: CcModelHephaestus;
  let hephaestusOptions: IPluginCcModelHephaestusOptions;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
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

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
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

    log.info("Create PluginKeychainMemory...");
    const keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel: testLogLevel,
    });

    keychainPlugin.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    log.info("Create PluginLedgerConnectorEthereum...");
    connector = new PluginLedgerConnectorEthereum({
      rpcApiHttpHost: rpcApiHttpHost,
      logLevel: testLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    log.info("Deploy Contract...");
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

    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: testLogLevel,
      ethTxObservable: connector.getTxSubjectObservable(),
    };

    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  });

  test("Monitor Ethereum transactions and create cross-chain model", async () => {
    hephaestus.setCaseId("ETHEREUM_MONITORING");
    hephaestus.monitorTransactions();

    const numberOfCases = 3;
    const txsPerCase = 3;
    let caseNumber = 1;

    while (numberOfCases >= caseNumber) {
      const createResEth = await apiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPlugin.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "createAsset",
        params: ["asset1", 5],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(createResEth).toBeTruthy();
      expect(createResEth.data).toBeTruthy();

      const lockResEth = await apiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPlugin.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "lockAsset",
        params: ["asset1"],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(lockResEth).toBeTruthy();
      expect(lockResEth.data).toBeTruthy();
      expect(lockResEth.status).toBe(200);

      const deleteResEth = await apiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPlugin.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "deleteAsset",
        params: ["asset1"],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(deleteResEth).toBeTruthy();
      expect(deleteResEth.data).toBeTruthy();
      expect(deleteResEth.status).toBe(200);

      caseNumber++;
    }

    const totalTxs = txsPerCase * numberOfCases;

    expect(hephaestus.numberUnprocessedReceipts).toEqual(totalTxs);
    expect(hephaestus.numberEventsLog).toEqual(0);

    await hephaestus.txReceiptToCrossChainEventLogEntry();

    expect(hephaestus.numberUnprocessedReceipts).toEqual(0);
    expect(hephaestus.numberEventsLog).toEqual(totalTxs);

    const output = await hephaestus.createModel();

    expect(output).toBeTruthy();
    hephaestus.ccModel.setType(CrossChainModelType.PetriNet);
    hephaestus.saveModel(CrossChainModelType.PetriNet, output!);
  });

  test("Check confomity of unmodeled transactions", async () => {
    const createResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset2", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth).toBeTruthy();
    expect(createResEth.data).toBeTruthy();

    const lockResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset2"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(lockResEth).toBeTruthy();
    expect(lockResEth.data).toBeTruthy();
    expect(lockResEth.status).toBe(200);

    const deleteResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "deleteAsset",
      params: ["asset2"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deleteResEth).toBeTruthy();
    expect(deleteResEth.data).toBeTruthy();
    expect(deleteResEth.status).toBe(200);

    expect(hephaestus.numberEventsConformanceLog).toEqual(0);
    expect(hephaestus.numberUnprocessedReceipts).toEqual(3);

    // true for confomance check
    await hephaestus.txReceiptToCrossChainEventLogEntry(true);
    expect(hephaestus.numberEventsConformanceLog).toEqual(3);
    expect(hephaestus.numberUnprocessedReceipts).toEqual(0);

    const serializedCCModel = hephaestus.getModel(CrossChainModelType.PetriNet);
    expect(serializedCCModel).toBeTruthy();

    const conformanceDetails = await hephaestus.checkConformance(
      serializedCCModel!,
    );
    expect(conformanceDetails).toBeTruthy();
    console.log(conformanceDetails);

    expect(hephaestus.numberUnprocessedReceipts).toEqual(0);
    expect(hephaestus.numberEventsConformanceLog).toEqual(0);

    const tree = hephaestus.convertModelToProcessTree();
    expect(tree).toBeTruthy();
    expect(
      hephaestus.ccModel.getModel(CrossChainModelType.ProcessTree),
    ).toBeTruthy();
    console.log(hephaestus.ccModel.getModel(CrossChainModelType.ProcessTree));
  });

  test("Check confomity of unmodeled transactions that should not conform", async () => {
    const createResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset3", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth).toBeTruthy();
    expect(createResEth.data).toBeTruthy();

    const lockResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset3"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(lockResEth).toBeTruthy();
    expect(lockResEth.data).toBeTruthy();
    expect(lockResEth.status).toBe(200);

    const deleteResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "deleteAsset",
      params: ["asset3"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deleteResEth).toBeTruthy();
    expect(deleteResEth.data).toBeTruthy();
    expect(deleteResEth.status).toBe(200);

    const getResEth = await apiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "getAsset",
      params: ["asset3"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(getResEth).toBeTruthy();
    expect(getResEth.data).toBeTruthy();
    expect(getResEth.status).toBe(200);

    expect(hephaestus.numberEventsConformanceLog).toEqual(0);
    expect(hephaestus.numberUnprocessedReceipts).toEqual(4);

    // true for confomance check
    await hephaestus.txReceiptToCrossChainEventLogEntry(true);
    expect(hephaestus.numberEventsConformanceLog).toEqual(4);
    expect(hephaestus.numberUnprocessedReceipts).toEqual(0);

    const serializedCCModel = hephaestus.getModel(CrossChainModelType.PetriNet);
    expect(serializedCCModel).toBeTruthy();

    const conformanceDetails = await hephaestus.checkConformance(
      serializedCCModel!,
    );
    expect(conformanceDetails).toBeTruthy();
    console.log(conformanceDetails);

    expect(hephaestus.numberUnprocessedReceipts).toEqual(0);
    expect(hephaestus.numberEventsConformanceLog).toEqual(0);
    expect(hephaestus.numberEventsNonConformanceLog).toEqual(4);

    const tree = hephaestus.convertModelToProcessTree();
    expect(tree).toBeTruthy();
    expect(hephaestus.getModel(CrossChainModelType.ProcessTree)).toBeTruthy();
    console.log(hephaestus.getModel(CrossChainModelType.ProcessTree));
  });

  afterAll(async () => {
    log.info("Shutdown connector...");
    await connector.shutdown();

    log.info("Stop and destroy the test ledger...");
    await ledger.stop();
    await ledger.destroy();

    log.info("Shutdown server...");
    await Servers.shutdown(server);

    log.info("Prune docker...");
    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();
  });
});
