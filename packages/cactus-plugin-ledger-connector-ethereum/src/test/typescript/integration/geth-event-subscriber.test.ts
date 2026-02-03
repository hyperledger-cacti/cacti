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
import http from "http";
import { v4 as uuidV4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import Web3, { DecodedParams, HexString } from "web3";

import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { Constants } from "@hyperledger-cacti/cactus-core-api";
import { pruneDockerContainersIfGithubAction } from "@hyperledger-cacti/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger-cacti/cactus-test-geth-ledger";

import SayMessageContractJson from "../../solidity/say-message-contract/SayMessageContract.json";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "../../../main/typescript/public-api";
import { LogsSubscription, NewHeadsSubscription } from "web3-eth";
import { decodeEvent } from "../../../main/typescript/decode-utils";
import { SolidityEventLog } from "../../../main/typescript/types/util-types";
import { keccak256 } from "web3-utils";

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("Testing the ability for listening to events emitted by deployed contracts and new blocks", () => {
  const keychainEntryKey = uuidV4();
  let testEthAccount: {
      address: HexString;
      privateKey: HexString;
    },
    web3: InstanceType<typeof Web3>,
    contractAddress: string,
    ledger: GethTestLedger,
    connector: PluginLedgerConnectorEthereum,
    rpcApiWsHost: string,
    keychainPlugin: PluginKeychainMemory;
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  //////////////////////////////////
  // Setup
  //////////////////////////////////

  beforeAll(async () => {
    const pruning = pruneDockerContainersIfGithubAction({
      logLevel: testLogLevel,
    });
    await expect(pruning).resolves.toBeTruthy();

    ledger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ledger.start();

    rpcApiWsHost = await ledger.getRpcApiWebSocketHost();
    web3 = new Web3(rpcApiWsHost);
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
      SayMessageContractJson.contractName,
      JSON.stringify(SayMessageContractJson),
    );
    connector = new PluginLedgerConnectorEthereum({
      instanceId: uuidV4(),
      rpcApiWsHost,
      logLevel: testLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    const deploy = await connector.deployContract({
      contract: {
        contractJSON: SayMessageContractJson,
      },
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    contractAddress = deploy.transactionReceipt.contractAddress as string;
    expect(typeof contractAddress).toBe("string");
    expect(contractAddress).toBeTruthy();
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();

    const pruning = pruneDockerContainersIfGithubAction({
      logLevel: testLogLevel,
    });
    await expect(pruning).resolves.toBeTruthy();
  });

  //////////////////////////////////
  // Deployment Tests
  //////////////////////////////////

  test("setup log subscriber, issue tx, and capture event emitted", async () => {
    console.log("Subscribing to events emitted by contract:", contractAddress);

    // Set up the event listener for event SayMessageEvent
    const subscriber = (await connector.createSubscriber("logs", {
      address: contractAddress,
      topics: [keccak256("SayMessageEvent(bytes32,string,uint256)")],
    })) as LogsSubscription;

    // Set up the event listener before the transaction is invoked
    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Event listener timed out"));
      }, 10000); // Timeout after 30 seconds

      // Listen for the event (data is the emitted event)
      subscriber.on("data", (event: any) => {
        clearTimeout(timeout);
        resolve(event);
      });

      // Optional: Log for debugging
      subscriber.on("error", (err: any) => {
        clearTimeout(timeout);
        reject(new Error(`Error while listening for event: ${err.message}`));
      });
    });

    const payload = "Message to emit";

    // Invoke the contract after setting up the listener
    const txReceipt = await connector.invokeContract({
      contract: {
        contractJSON: SayMessageContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "sayMessage",
      params: [payload],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    // Ensure the transaction was successful
    expect(txReceipt).toBeTruthy();
    expect(txReceipt.success).toBeTruthy();

    // Wait for the event to be captured
    const event = await eventPromise;
    expect(event).toBeTruthy();

    const typedEvent = event as {
      address: string;
      topics: string[];
      data: string;
      transactionHash: string;
    };

    expect(typedEvent.address).toEqual(contractAddress);
    expect(typedEvent.topics).toBeArrayOfSize(2);
    expect(typedEvent.topics[0]).toEqual(
      keccak256("SayMessageEvent(bytes32,string,uint256)"),
    );
    expect(typedEvent.topics[1]).toEqual(keccak256(payload));
    expect(typedEvent.data).toBeTruthy();

    const decoded = decodeEvent(
      new Web3(rpcApiWsHost),
      event as SolidityEventLog,
      SayMessageContractJson.abi,
      "SayMessageEvent",
    ) as DecodedParams;

    expect(decoded).toBeTruthy();
    expect(decoded).toHaveProperty("message");
    expect(decoded).toHaveProperty("nonce");
    expect(decoded?.["message"] as string).toEqual(payload);
    expect(decoded?.["messageHash"] as string).toEqual(keccak256(payload));
    expect((decoded?.["nonce"] as bigint).toString()).toEqual("1");

    // Clean up by unsubscribing from the event listener
    await subscriber.unsubscribe();
  });

  test("setup log subscriber, issue tx, and capture new block", async () => {
    const subscriber = (await connector.createSubscriber(
      "newBlockHeaders",
    )) as NewHeadsSubscription;

    // Set up the event listener before the transaction is invoked
    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Event listener timed out"));
      }, 10000); // Timeout after 30 seconds

      // Listen for the new block
      subscriber.on("data", (event: any) => {
        clearTimeout(timeout);
        resolve(event);
      });

      subscriber.on("error", (err: any) => {
        clearTimeout(timeout);
        reject(new Error(`Error while listening for event: ${err.message}`));
      });
    });

    // Issue a transaction
    const txReceipt = await connector.invokeContract({
      contract: {
        contractJSON: SayMessageContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "sayMessage",
      params: [""],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    // Ensure the transaction was successful
    expect(txReceipt).toBeTruthy();
    expect(txReceipt.success).toBeTruthy();

    // Wait for the event to be captured
    const newBlockEvent = await eventPromise;
    expect(newBlockEvent).toBeTruthy();
    const typedNewBlockEvent = newBlockEvent as { hash: string };
    expect(typedNewBlockEvent.hash).toBeTruthy();

    // Clean up by unsubscribing from the event listener
    await subscriber.unsubscribe();
  });
});
