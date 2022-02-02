// Besu setup code based on:
//  packages/cactus-plugin-ledger-connector-besu/src/test/typescript/integration/plugin-ledger-connector-besu/deploy-contract/v21-deploy-contract-from-json.test.ts

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const containerImageName = "ghcr.io/hyperledger/cactus-besu-21-1-6-all-in-one";
const containerImageVersion = "2021-08-24--feat-1244";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  ReceiptType,
  BesuApiClient,
  WatchBlocksV1Progress,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import Web3 from "web3";
import { Account } from "web3-core";
import { Constants } from "@hyperledger/cactus-core-api";
import express from "express";
import http from "http";
import { AddressInfo } from "net";
import { BesuApiClientOptions } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  Verifier,
  VerifierEventListener,
} from "@hyperledger/cactus-api-client";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier-integration-with-openapi-connectors.test",
  level: testLogLevel,
});
log.info("Test started");

describe("Verifier integration with openapi connectors tests", () => {
  let besuTestLedger: BesuTestLedger;
  let server: http.Server;
  let connector: PluginLedgerConnectorBesu;
  let apiClient: BesuApiClient;
  let sourceEthAccountPubKey: string;
  let sourceEthAccountPrivKey: { privateKey: string };
  let targetEthAccount: Account;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start BesuTestLedger...");
    log.debug("Besu image:", containerImageName);
    log.debug("Besu version:", containerImageVersion);
    besuTestLedger = new BesuTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await besuTestLedger.start();

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
    log.debug("rpcApiHttpHost:", rpcApiHttpHost);
    log.debug("rpcApiWsHost:", rpcApiWsHost);

    // Source account - genesis account
    sourceEthAccountPubKey = besuTestLedger.getGenesisAccountPubKey();
    sourceEthAccountPrivKey = {
      privateKey: besuTestLedger.getGenesisAccountPrivKey(),
    };

    // Target account - create new
    const web3 = new Web3(rpcApiHttpHost);
    targetEthAccount = web3.eth.accounts.create(uuidv4());
    const keychainEntryKey = uuidv4();
    const keychainEntryValue = targetEthAccount.privateKey;
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel: sutLogLevel,
    });

    log.info("Create PluginLedgerConnectorBesu...");
    connector = new PluginLedgerConnectorBesu({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    log.info("Start HTTP and WS servers...");
    const expressApp = express();
    expressApp.use(express.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });

    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    log.info(
      `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
    );
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    log.info("Create BesuApiClientOptions...");
    const besuApiClientOptions = new BesuApiClientOptions({
      basePath: apiHost,
    });
    apiClient = new BesuApiClient(besuApiClientOptions);
  });

  afterAll(async () => {
    log.info("Shutdown the server...");
    if (server) {
      await Servers.shutdown(server);
    }
    log.info("Stop and destroy the test ledger...");
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Functional Tests
  //////////////////////////////////

  test("Verifier is constructed on BesuApiClient", async () => {
    const sut = new Verifier(apiClient, sutLogLevel);
    expect(sut.ledgerApi).toBe(apiClient);
  });

  function sendTransactionOnBesuLedger() {
    return connector.transact({
      web3SigningCredential: {
        ethAccount: sourceEthAccountPubKey,
        secret: sourceEthAccountPrivKey.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: sourceEthAccountPubKey,
        to: targetEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 10000,
      },
    });
  }

  test("Sanity check that BesuApiClient watchBlocksV1 works", async () => {
    const newBlock = new Promise<WatchBlocksV1Progress>((resolve, reject) => {
      const subscription = apiClient
        .watchBlocksV1()
        .subscribe((res: WatchBlocksV1Progress) => {
          log.debug("Received block number", res.blockHeader.number);
          if (!res.blockHeader) {
            reject("Empty block received");
          }
          subscription.unsubscribe();
          resolve(res);
        });
    });

    await sendTransactionOnBesuLedger();
    return expect(newBlock).toResolve();
  });

  test("Verifier works with BesuApiClient", async () => {
    const newBlock = new Promise<WatchBlocksV1Progress>((resolve, reject) => {
      const appId = "testMonitor";
      const sut = new Verifier(apiClient, sutLogLevel);

      const monitor: VerifierEventListener<WatchBlocksV1Progress> = {
        onEvent(ledgerEvent: WatchBlocksV1Progress): void {
          log.info(
            "Listener received ledgerEvent, block number",
            ledgerEvent.blockHeader.number,
          );
          sut.stopMonitor(appId);
          resolve(ledgerEvent);
        },
        onError(err: any): void {
          log.error("Ledger monitoring error:", err);
          reject(err);
        },
      };

      sut.startMonitor(appId, monitor);
    });

    await sendTransactionOnBesuLedger();
    return expect(newBlock).toResolve();
  });
});
