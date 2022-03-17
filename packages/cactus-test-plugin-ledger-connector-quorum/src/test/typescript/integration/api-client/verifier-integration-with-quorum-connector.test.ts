/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "info";
const sutLogLevel = "info";

const containerImageName =
  "ghcr.io/hyperledger/cactus-quorum-multi-party-all-in-one";
const containerImageVersion = "2022-04-06-fd10e27";

import "jest-extended";
import lodash from "lodash";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorQuorum,
  QuorumApiClient,
  WatchBlocksV1Progress,
  Web3BlockHeader,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
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
import {
  pruneDockerAllIfGithubAction,
  QuorumMultiPartyTestLedger,
} from "@hyperledger/cactus-test-tooling";

import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";

const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier-integration-with-quorum-connector.test",
  level: testLogLevel,
});

log.info("Test started");

describe("Verifier integration with quorum connector tests", () => {
  let quorumTestLedger: QuorumMultiPartyTestLedger;
  let apiServer: ApiServer;
  let connector: PluginLedgerConnectorQuorum;
  let web3: Web3;
  let keychainPlugin: PluginKeychainMemory;
  let connectionProfile: ReturnType<
    typeof QuorumMultiPartyTestLedger.prototype.getKeys
  > extends Promise<infer T>
    ? T
    : never;

  const quorumValidatorId = "testQuorumId";
  let globalVerifierFactory: VerifierFactory;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start QuorumMultiPartyTestLedger...");
    log.debug("QuorumMultiParty image:", containerImageName);
    log.debug("QuorumMultiParty version:", containerImageVersion);
    quorumTestLedger = new QuorumMultiPartyTestLedger({
      containerImageName,
      containerImageVersion,
      logLevel: sutLogLevel,
      emitContainerLogs: false,
      //useRunningLedger: true,
    });
    await quorumTestLedger.start();

    connectionProfile = await quorumTestLedger.getKeys();
    log.debug("connectionProfile:", connectionProfile);

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

    log.info("Create PluginLedgerConnectorQuorum...");
    connector = new PluginLedgerConnectorQuorum({
      rpcApiHttpHost: connectionProfile.quorum.member1.url,
      rpcApiWsHost: connectionProfile.quorum.member1.wsUrl,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    plugins.push(connector);

    // Create web3 provider for test
    web3 = new Web3(connectionProfile.quorum.member1.url);

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
    log.info("Create VerifierFactory with Quorum Validator...");
    globalVerifierFactory = new VerifierFactory(
      [
        {
          validatorID: quorumValidatorId,
          validatorType: "QUORUM_2X",
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
    if (quorumTestLedger) {
      await quorumTestLedger.stop();
      await quorumTestLedger.destroy();
    }

    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Helper Functions
  //////////////////////////////////

  function monitorAndGetBlock(
    options: Record<string, unknown> = {},
  ): Promise<LedgerEvent<WatchBlocksV1Progress>> {
    return new Promise<LedgerEvent<WatchBlocksV1Progress>>(
      (resolve, reject) => {
        const appId = "testMonitor";
        const sut = globalVerifierFactory.getVerifier(quorumValidatorId);

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

  test("Verifier of QuorumApiClient is created by VerifierFactory", () => {
    const sut = globalVerifierFactory.getVerifier(quorumValidatorId);
    expect(sut.ledgerApi.className).toEqual("QuorumApiClient");
  });

  describe("web3EthContract tests", () => {
    let verifier: Verifier<QuorumApiClient>;
    let contractCommon: {
      abi: AbiItem[];
      address: string;
    };

    beforeAll(async () => {
      // Setup verifier
      verifier = globalVerifierFactory.getVerifier(
        quorumValidatorId,
        "QUORUM_2X",
      );

      // Deploy contract to interact with
      const deployOut = await connector.deployContract({
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
        web3SigningCredential: {
          ethAccount: connectionProfile.quorum.member2.accountAddress,
          secret: connectionProfile.quorum.member2.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
      expect(deployOut).toBeTruthy();
      expect(deployOut.transactionReceipt).toBeTruthy();
      expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
      expect(deployOut.transactionReceipt.status).toBeTrue();

      contractCommon = {
        abi: HelloWorldContractJson.abi as AbiItem[],
        address: deployOut.transactionReceipt.contractAddress as string,
      };
    });

    test("Invalid web3EthContract calls are rejected by QuorumApiClient", async () => {
      // Define correct input parameters
      const correctContract: Record<string, unknown> = lodash.clone(
        contractCommon,
      );
      const correctMethod: Record<string, unknown> = {
        type: "web3EthContract",
        command: "call",
        function: "getName",
        params: [],
      };
      const correctArgs: any = {};

      // Sanity check if correct parameters work
      const resultCorrect = await verifier.sendSyncRequest(
        correctContract,
        correctMethod,
        correctArgs,
      );
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
      const newName = "QuorumCactus";

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
          from: connectionProfile.quorum.member1.accountAddress,
        },
      };

      const resultsSend = await verifier.sendSyncRequest(
        contractCommon,
        methodSend,
        argsSend,
      );
      expect(resultsSend.status).toEqual(200);
      expect(resultsSend.data.status).toBeTrue();

      // 2. Get new, updated value (call)
      const methodCall = {
        type: "web3EthContract",
        command: "call",
        function: "getName",
        params: [],
      };
      const argsCall = {};

      const resultCall = await verifier.sendSyncRequest(
        contractCommon,
        methodCall,
        argsCall,
      );
      expect(resultCall.status).toEqual(200);
      expect(resultCall.data).toEqual(newName);
    });

    test("encodeABI of transactions gives same results as direct web3 call", async () => {
      // Send encodeABI request to connector
      const methodEncode = {
        type: "web3EthContract",
        command: "encodeABI",
        function: "setName",
        params: ["QuorumCactusEncode"],
      };
      const argsEncode = {
        args: {
          from: connectionProfile.quorum.member1.accountAddress,
        },
      };

      const resultsEncode = await verifier.sendSyncRequest(
        contractCommon,
        methodEncode,
        argsEncode,
      );
      expect(resultsEncode.status).toEqual(200);
      expect(resultsEncode.data.length).toBeGreaterThan(5);

      // Compare encoded data with direct web3 call
      const web3Contract = new web3.eth.Contract(
        contractCommon.abi,
        contractCommon.address,
      );
      const web3Encode = await web3Contract.methods
        .setName(...methodEncode.params)
        .encodeABI(argsEncode);
      expect(resultsEncode.data).toEqual(web3Encode);
    });

    test("estimateGas of transactions gives same results as direct web3 call", async () => {
      // Send estimateGas request to connector
      const methodEstimateGas = {
        type: "web3EthContract",
        command: "estimateGas",
        function: "setName",
        params: ["QuorumCactusGas"],
      };
      const argsEstimateGas = {};

      const resultsEstimateGas = await verifier.sendSyncRequest(
        contractCommon,
        methodEstimateGas,
        argsEstimateGas,
      );
      expect(resultsEstimateGas.status).toEqual(200);
      expect(resultsEstimateGas.data).toBeGreaterThan(0);

      // Compare gas estimate with direct web3 call
      const web3Contract = new web3.eth.Contract(
        contractCommon.abi,
        contractCommon.address,
      );
      const web3Encode = await web3Contract.methods
        .setName(...methodEstimateGas.params)
        .estimateGas(argsEstimateGas);
      expect(resultsEstimateGas.data).toEqual(web3Encode);
    });

    test("Sending transaction with sendAsyncRequest works", async () => {
      const newName = "QuorumCactusAsync";

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
          from: connectionProfile.quorum.member1.accountAddress,
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

      const resultsCall = await verifier.sendSyncRequest(
        contractCommon,
        methodCall,
        argsCall,
      );
      expect(resultsCall.status).toEqual(200);
      expect(resultsCall.data).toEqual(newName);
    });
  });

  test("Verifier of QuorumApiClient supports web3Eth function", async () => {
    // web3Eth.getBalance
    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [connectionProfile.quorum.member2.accountAddress] };

    const results = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, method, args);
    expect(results.status).toEqual(200);
    expect(results.data.length).toBeGreaterThan(0);
  });

  test("Invalid web3Eth calls are rejected by QuorumApiClient", async () => {
    // Define correct input parameters
    const correctContract = {};
    const correctMethod: Record<string, unknown> = {
      type: "web3Eth",
      command: "getBalance",
    };
    const correctArgs: any = {
      args: [connectionProfile.quorum.member2.accountAddress],
    };
    const verifier = globalVerifierFactory.getVerifier(quorumValidatorId);

    // Sanity check if correct parameters work
    const resultCorrect = await verifier.sendSyncRequest(
      correctContract,
      correctMethod,
      correctArgs,
    );
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

  test("QuorumApiClient web3Eth throws error on unknown method", async () => {
    const contract = {};
    const method = { type: "web3Eth", command: "foo" };
    const args = {};

    const results = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, method, args);

    expect(results).toBeTruthy();
    expect(results.status).toEqual(504);
    expect(results.errorDetail).toBeTruthy();
  });

  function assertBlockHeader(header: Web3BlockHeader) {
    // Check if defined and with expected type
    // Ignore nullable / undefine-able fields
    expect(typeof header.parentHash).toEqual("string");
    expect(typeof header.sha3Uncles).toEqual("string");
    expect(typeof header.miner).toEqual("string");
    expect(typeof header.stateRoot).toEqual("string");
    expect(typeof header.logsBloom).toEqual("string");
    expect(typeof header.number).toEqual("number");
    expect(typeof header.gasLimit).toEqual("number");
    expect(typeof header.gasUsed).toEqual("number");
    expect(typeof header.extraData).toEqual("string");
    expect(typeof header.nonce).toEqual("string");
    expect(typeof header.hash).toEqual("string");
    expect(typeof header.difficulty).toEqual("string");
  }

  test("Monitor new blocks headers on Quorum", async () => {
    const ledgerEvent = await monitorAndGetBlock();
    // assert well-formed output
    expect(ledgerEvent.id).toEqual("");
    expect(ledgerEvent.verifierId).toEqual(quorumValidatorId);
    expect(ledgerEvent.data).toBeTruthy();

    // blockData should not be present if called with empty options
    expect(ledgerEvent.data?.blockData).toBeUndefined();
    expect(ledgerEvent.data?.blockHeader).toBeTruthy();

    // check some fields
    assertBlockHeader(ledgerEvent.data?.blockHeader as Web3BlockHeader);
  });

  test("Monitor new blocks data on Quorum", async () => {
    const ledgerEvent = await monitorAndGetBlock({ getBlockData: true });
    // assert well-formed output
    expect(ledgerEvent.id).toEqual("");
    expect(ledgerEvent.verifierId).toEqual(quorumValidatorId);
    expect(ledgerEvent.data).toBeTruthy();

    // blockHeader should not be present if called with getBlockData option
    expect(ledgerEvent.data?.blockHeader).toBeFalsy();
    expect(ledgerEvent.data?.blockData).toBeTruthy();

    // check some fields
    assertBlockHeader(ledgerEvent.data?.blockData as Web3BlockHeader);
    expect(typeof ledgerEvent.data?.blockData?.size).toEqual("number");
    expect(typeof ledgerEvent.data?.blockData?.totalDifficulty).toEqual(
      "string",
    );
    expect(typeof ledgerEvent.data?.blockData?.uncles).toEqual("object");
    expect(typeof ledgerEvent.data?.blockData?.transactions).toEqual("object");
  });
});
