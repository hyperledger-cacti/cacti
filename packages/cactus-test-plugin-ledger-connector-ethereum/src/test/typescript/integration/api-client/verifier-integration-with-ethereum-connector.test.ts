/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * @todo - there's an ugly warning in the end caused by some issue with clearing web3js ws connection to geth.
 *  Investigate and report if needed.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "info";
const sutLogLevel = "info";

import "jest-extended";
import lodash from "lodash";
import { v4 as uuidv4 } from "uuid";
import Web3, { ContractAbi } from "web3";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorEthereum,
  EthereumApiClient,
  WatchBlocksV1Progress,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  ISendRequestResultV1,
  IVerifierEventListener,
  LedgerEvent,
} from "@hyperledger/cactus-core-api";
import { AddressInfo } from "net";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { Verifier, VerifierFactory } from "@hyperledger/cactus-verifier-client";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import { PayableMethodObject } from "web3-eth-contract";

import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";

const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier-integration-with-ethereum-connector.test",
  level: testLogLevel,
});

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

log.info("Test started");

describe("Verifier integration with ethereum connector tests", () => {
  let ethereumTestLedger: GethTestLedger;
  let apiServer: ApiServer;
  let connector: PluginLedgerConnectorEthereum;
  let web3: InstanceType<typeof Web3>;
  let keychainPlugin: PluginKeychainMemory;
  const ethereumValidatorId = "testEthereumId";
  let globalVerifierFactory: VerifierFactory;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start GethTestLedger...");
    // log.debug("GethTestLedger image:", containerImageName);
    ethereumTestLedger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
      logLevel: sutLogLevel,
    });
    await ethereumTestLedger.start();

    // Setup ApiServer plugins
    const plugins: ICactusPlugin[] = [];
    const pluginRegistry = new PluginRegistry({ plugins });

    log.info("Create PluginKeychainMemory...");
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: sutLogLevel,
    });
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    plugins.push(keychainPlugin);

    log.info("Create PluginLedgerConnectorEthereum...");
    const rpcApiHttpHost = await ethereumTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await ethereumTestLedger.getRpcApiWebSocketHost();
    connector = new PluginLedgerConnectorEthereum({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    plugins.push(connector);

    // Create web3 provider for test
    web3 = new Web3(rpcApiHttpHost);

    // Create Api Server
    log.info("Create ApiServer...");
    const configService = new ConfigService();
    const cactusApiServerOptions = await configService.newExampleConfig();
    cactusApiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    cactusApiServerOptions.configFile = "";
    cactusApiServerOptions.apiCorsDomainCsv = "*";
    cactusApiServerOptions.apiTlsEnabled = false;
    cactusApiServerOptions.apiPort = 0;
    const config = await configService.newExampleConfigConvict(
      cactusApiServerOptions,
    );

    apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    // Start ApiServer
    const apiServerStartOut = await apiServer.start();
    log.debug(`apiServerStartOut:`, apiServerStartOut);
    const httpServer = apiServer.getHttpServerApi();

    const addressInfo = httpServer?.address() as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    // Create VerifierFactory
    log.info("Create VerifierFactory with Ethereum Validator...");
    globalVerifierFactory = new VerifierFactory(
      [
        {
          validatorID: ethereumValidatorId,
          validatorType: "ETH_1X",
          basePath: apiHost,
          logLevel: sutLogLevel,
        },
      ],
      sutLogLevel,
    );
  });

  afterAll(async () => {
    log.info("Shutdown the server...");
    if (apiServer) {
      await apiServer.shutdown();
    }

    log.info("Stop and destroy the test ledger...");
    if (ethereumTestLedger) {
      await ethereumTestLedger.stop();
      await ethereumTestLedger.destroy();
    }

    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Helper Functions
  //////////////////////////////////

  async function monitorAndGetBlock(
    options: Record<string, unknown> = {},
  ): Promise<LedgerEvent<WatchBlocksV1Progress>> {
    const appId = "testMonitor";
    const sut = await globalVerifierFactory.getVerifier(ethereumValidatorId);

    return new Promise<LedgerEvent<WatchBlocksV1Progress>>(
      (resolve, reject) => {
        const monitor: IVerifierEventListener<WatchBlocksV1Progress> = {
          onEvent(ledgerEvent: LedgerEvent<WatchBlocksV1Progress>): void {
            try {
              log.info("Received event:", ledgerEvent);

              if (!ledgerEvent.data) {
                throw Error("No block data");
              }

              log.info(
                "Listener received ledgerEvent, block number",
                ledgerEvent.data.blockHeader?.number,
              );

              sut.stopMonitor(appId);
              resolve(ledgerEvent);
            } catch (err) {
              reject(err);
            }
          },
          onError(err: any): void {
            log.error("Ledger monitoring error:", err);
            reject(err);
          },
        };

        sut.startMonitor(appId, options, monitor);
      },
    );
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test("Verifier of EthereumApiClient is created by VerifierFactory", async () => {
    const sut = await globalVerifierFactory.getVerifier(ethereumValidatorId);
    expect(sut.ledgerApi.className).toEqual("EthereumApiClient");
  });

  describe("web3EthContract tests", () => {
    let verifier: Verifier<EthereumApiClient>;
    let contractCommon: {
      abi: ContractAbi;
      address: string;
    };

    beforeAll(async () => {
      // Setup verifier
      verifier = await globalVerifierFactory.getVerifier(
        ethereumValidatorId,
        "ETH_1X",
      );

      // Deploy contract to interact with
      const deployOut = await connector.deployContract({
        contract: {
          contractName: HelloWorldContractJson.contractName,
          keychainId: keychainPlugin.getKeychainId(),
        },
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(deployOut).toBeTruthy();
      expect(deployOut.transactionReceipt).toBeTruthy();
      expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
      expect(deployOut.transactionReceipt.status).toBeTrue();

      contractCommon = {
        abi: HelloWorldContractJson.abi,
        address: deployOut.transactionReceipt.contractAddress as string,
      };
    });

    test("Invalid web3EthContract calls are rejected by EthereumApiClient", async () => {
      // Define correct input parameters
      const correctContract: Record<string, unknown> =
        lodash.clone(contractCommon);
      const correctMethod: Record<string, unknown> = {
        type: "web3EthContract",
        command: "call",
        function: "getName",
        params: [],
      };
      const correctArgs: any = {};

      // Sanity check if correct parameters work
      const resultCorrect = (await verifier.sendSyncRequest(
        correctContract,
        correctMethod,
        correctArgs,
      )) as ISendRequestResultV1<void>;
      expect(resultCorrect.status).toEqual(200);

      // Failing: Missing contract ABI
      const missingABIContract = lodash.clone(correctContract);
      delete missingABIContract.abi;

      expect(
        verifier.sendSyncRequest(
          missingABIContract,
          correctMethod,
          correctArgs,
        ),
      ).toReject();

      // Failing: Missing contract address
      const missingAddressContract = lodash.clone(correctContract);
      delete missingAddressContract.address;

      expect(
        verifier.sendSyncRequest(
          missingAddressContract,
          correctMethod,
          correctArgs,
        ),
      ).toReject();

      // Failing: Unknown invocation method
      const unknownMethod = lodash.clone(correctMethod);
      unknownMethod.command = "foo";
      expect(
        verifier.sendSyncRequest(correctContract, unknownMethod, correctArgs),
      ).toReject();

      // Failing: Empty invocation method
      const emptyMethod = lodash.clone(correctMethod);
      emptyMethod.command = "";
      expect(
        verifier.sendSyncRequest(correctContract, emptyMethod, correctArgs),
      ).toReject();

      // Failing: Empty contract method
      const emptyContractFunction = lodash.clone(correctMethod);
      emptyContractFunction.function = "";
      expect(
        verifier.sendSyncRequest(
          correctContract,
          emptyContractFunction,
          correctArgs,
        ),
      ).toReject();

      // Failing: Wrong method params format
      const numericParam = lodash.clone(correctMethod);
      numericParam.params = 42;
      expect(
        verifier.sendSyncRequest(correctContract, numericParam, correctArgs),
      ).toReject();

      const objectParam = lodash.clone(correctMethod);
      objectParam.params = { arg1: 42 };
      expect(
        verifier.sendSyncRequest(correctContract, objectParam, correctArgs),
      ).toReject();
    });

    test("Send unsigned transaction and use call to check results works", async () => {
      const newName = "EthereumCactus";

      // 1. Set new value (send)
      // Will use signing key of the node we're connected to (member1)
      const methodSend = {
        type: "web3EthContract",
        command: "send",
        function: "setName",
        params: [newName],
      };
      const argsSend = {
        args: {
          from: WHALE_ACCOUNT_ADDRESS,
        },
      };

      const resultsSend = (await verifier.sendSyncRequest(
        contractCommon,
        methodSend,
        argsSend,
      )) as ISendRequestResultV1<{ readonly status: string }>;
      expect(resultsSend.status).toEqual(200);
      expect(resultsSend.data.status).toEqual("1");

      // 2. Get new, updated value (call)
      const methodCall = {
        type: "web3EthContract",
        command: "call",
        function: "getName",
        params: [],
      };
      const argsCall = {};

      const resultCall = (await verifier.sendSyncRequest(
        contractCommon,
        methodCall,
        argsCall,
      )) as ISendRequestResultV1<string>;
      expect(resultCall.status).toEqual(200);
      expect(resultCall.data).toEqual(newName);
    });

    test("encodeABI of transactions gives same results as direct web3 call", async () => {
      // Send encodeABI request to connector
      const methodEncode = {
        type: "web3EthContract",
        command: "encodeABI",
        function: "setName",
        params: ["EthereumCactusEncode"],
      };
      const argsEncode = {
        args: {
          from: WHALE_ACCOUNT_ADDRESS,
        },
      };

      const resultsEncode = (await verifier.sendSyncRequest(
        contractCommon,
        methodEncode,
        argsEncode,
      )) as ISendRequestResultV1<string>;
      expect(resultsEncode.status).toEqual(200);
      expect(resultsEncode.data.length).toBeGreaterThan(5);

      // Compare encoded data with direct web3 call
      const web3Contract = new web3.eth.Contract(
        contractCommon.abi,
        contractCommon.address,
      );
      const methodRef = web3Contract.methods.setName as unknown as (
        ...args: unknown[]
      ) => PayableMethodObject;
      const web3Encode = methodRef(...methodEncode.params).encodeABI();
      expect(resultsEncode.data).toEqual(web3Encode);
    });

    test("estimateGas of transactions gives same results as direct web3 call", async () => {
      // Send estimateGas request to connector
      const methodEstimateGas = {
        type: "web3EthContract",
        command: "estimateGas",
        function: "setName",
        params: ["EthereumCactusGas"],
      };
      const argsEstimateGas = {};

      const resultsEstimateGas = (await verifier.sendSyncRequest(
        contractCommon,
        methodEstimateGas,
        argsEstimateGas,
      )) as ISendRequestResultV1<string>;
      expect(resultsEstimateGas.status).toEqual(200);
      expect(Number(resultsEstimateGas.data)).toBeGreaterThan(0);

      // Compare gas estimate with direct web3 call
      const web3Contract = new web3.eth.Contract(
        contractCommon.abi,
        contractCommon.address,
      );
      const methodRef = web3Contract.methods.setName as unknown as (
        ...args: unknown[]
      ) => PayableMethodObject;
      const web3Encode = await methodRef(
        ...methodEstimateGas.params,
      ).estimateGas(argsEstimateGas);
      expect(resultsEstimateGas.data).toEqual(web3Encode.toString());
    });

    test("Sending transaction with sendAsyncRequest works", async () => {
      const newName = "EthereumCactusAsync";

      // 1. Set new value with async call (send)
      // Will use signing key of the node we're connected to (member1)
      const methodSendAsync = {
        type: "web3EthContract",
        command: "send",
        function: "setName",
        params: [newName],
      };
      const argsSendAsync = {
        args: {
          from: WHALE_ACCOUNT_ADDRESS,
        },
      };

      await verifier.sendAsyncRequest(
        contractCommon,
        methodSendAsync,
        argsSendAsync,
      );

      // 2. Wait for transaction commit
      // We assume transaction will be included in the next block
      await monitorAndGetBlock();

      // 3. Get new, updated value (call)
      const methodCall = {
        type: "web3EthContract",
        command: "call",
        function: "getName",
        params: [],
      };
      const argsCall = {};

      const resultsCall = (await verifier.sendSyncRequest(
        contractCommon,
        methodCall,
        argsCall,
      )) as ISendRequestResultV1<string>;
      expect(resultsCall.status).toEqual(200);
      expect(resultsCall.data).toEqual(newName);
    });
  });

  test("Verifier of EthereumApiClient supports web3Eth function", async () => {
    // web3Eth.getBalance
    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [WHALE_ACCOUNT_ADDRESS] };

    const verifier =
      await globalVerifierFactory.getVerifier(ethereumValidatorId);
    const results = (await verifier.sendSyncRequest(
      contract,
      method,
      args,
    )) as ISendRequestResultV1<string>;
    expect(results.status).toEqual(200);
    expect(results.data.length).toBeGreaterThan(0);
  });

  test("Invalid web3Eth calls are rejected by EthereumApiClient", async () => {
    // Define correct input parameters
    const correctContract = {};
    const correctMethod: Record<string, unknown> = {
      type: "web3Eth",
      command: "getBalance",
    };
    const correctArgs: any = {
      args: [WHALE_ACCOUNT_ADDRESS],
    };
    const verifier =
      await globalVerifierFactory.getVerifier(ethereumValidatorId);

    // Sanity check if correct parameters work
    const resultCorrect = (await verifier.sendSyncRequest(
      correctContract,
      correctMethod,
      correctArgs,
    )) as ISendRequestResultV1<unknown>;
    expect(resultCorrect.status).toEqual(200);

    // Failing: Empty web3.eth method
    const emptyMethod = lodash.clone(correctMethod);
    emptyMethod.command = "";

    expect(
      verifier.sendSyncRequest(correctContract, emptyMethod, correctArgs),
    ).toReject();

    // Failing: Wrong args format
    const numericArgsFormat = lodash.clone(correctArgs);
    numericArgsFormat.args = 42;

    expect(
      verifier.sendSyncRequest(correctContract, numericArgsFormat, correctArgs),
    ).toReject();

    const objectArgsFormat = lodash.clone(correctArgs);
    objectArgsFormat.args = { arg1: 42 };

    expect(
      verifier.sendSyncRequest(correctContract, objectArgsFormat, correctArgs),
    ).toReject();
  });

  test("EthereumApiClient web3Eth throws error on unknown method", async () => {
    const contract = {};
    const method = { type: "web3Eth", command: "foo" };
    const args = {};

    try {
      const verifier =
        await globalVerifierFactory.getVerifier(ethereumValidatorId);
      await verifier.sendSyncRequest(contract, method, args);
      fail("Expected sendSyncRequest call to fail but it succeeded.");
    } catch (error) {
      console.log("sendSyncRequest failed as expected");
    }
  });
});
