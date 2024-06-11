/**
 * Test Iroha V2 environment setup functions.
 */

// Ledger settings
const containerImageName = "ghcr.io/hyperledger/cactus-iroha2-all-in-one";
const containerImageVersion = "2023-07-29-f2bc772ee";
const useRunningLedger = false;

// Log settings
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";

import {
  Iroha2ClientConfig,
  Iroha2TestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  Iroha2BaseConfig,
  KeychainReference,
  PluginLedgerConnectorIroha2,
  Iroha2KeyPair,
  Iroha2ApiClient,
} from "../../../main/typescript/public-api";
import { addRandomSuffix } from "./utils";

import { crypto } from "@iroha2/crypto-target-node";
import { setCrypto } from "@iroha2/client";

import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { AddressInfo } from "net";
import { bytesToHex } from "hada";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import "jest-extended";

setCrypto(crypto);

/**
 * Wait for transaction commit on the ledger.
 * Currently there's no better way than just wait for a while, so we sleep for 3 seconds.
 */
export async function waitForCommit(): Promise<void> {
  const timeout = 3 * 1000; // 3 seconds
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * Generates Iroha V2 ledger compatible key pair that can be used as account credentials.
 * Pubic key is encoded in a multihash format.
 *
 * @returns Ed25519 keypair
 */
export function generateTestIrohaCredentials(): Iroha2KeyPair & {
  publicKeyMultihash: string;
} {
  const seedBytes = Buffer.from(addRandomSuffix("seed"));
  const config = crypto
    .createKeyGenConfiguration()
    .useSeed(Uint8Array.from(seedBytes))
    .withAlgorithm(crypto.AlgorithmEd25519());

  const freeableKeys: { free(): void }[] = [];
  try {
    const keyPair = crypto.generateKeyPairWithConfiguration(config);
    freeableKeys.push(keyPair);

    const multiHashPubKey = crypto.createMultihashFromPublicKey(
      keyPair.publicKey(),
    );
    freeableKeys.push(multiHashPubKey);

    return {
      publicKey: bytesToHex(Array.from(keyPair.publicKey().payload())),
      publicKeyMultihash: bytesToHex(Array.from(multiHashPubKey.toBytes())),
      privateKey: {
        digestFunction: keyPair.privateKey().digestFunction(),
        payload: bytesToHex(Array.from(keyPair.privateKey().payload())),
      },
    };
  } finally {
    freeableKeys.forEach((x) => x.free());
  }
}

/**
 * Test Iroha V2 environment.
 * Starts dockerized ledger, cactus connector and apiClient.
 */
export class IrohaV2TestEnv {
  constructor(private log: Logger) {
    this.log.info("Creating IrohaV2TestEnv...");
  }

  // Private fields
  private ledger?: Iroha2TestLedger;
  private connectorServer?: http.Server;
  private socketioServer?: SocketIoServer;
  private iroha2ConnectorPlugin?: PluginLedgerConnectorIroha2;
  private clientConfig?: Iroha2ClientConfig;

  /**
   * If value is not falsy throw error informing that environment is not running yet.
   *
   * @param value any value.
   * @returns the value or an error.
   */
  private checkedGet<T>(value?: T): T {
    if (value) {
      return value;
    }
    throw new Error("IrohaV2TestEnv not started yet.");
  }

  // Public fields
  private _keyPairCredential?: Iroha2KeyPair;
  get keyPairCredential(): Iroha2KeyPair {
    return this.checkedGet(this._keyPairCredential);
  }

  private _keychainCredentials?: KeychainReference;
  get keychainCredentials(): KeychainReference {
    return this.checkedGet(this._keychainCredentials);
  }

  private _defaultBaseConfig?: Iroha2BaseConfig;
  get defaultBaseConfig(): Iroha2BaseConfig {
    return this.checkedGet(this._defaultBaseConfig);
  }

  private _apiClient?: Iroha2ApiClient;
  get apiClient(): Iroha2ApiClient {
    return this.checkedGet(this._apiClient);
  }

  /**
   * Start entire test Iroha V2 environment.
   * Runs the ledger, cactus connector, apiClient, handles all intermediate steps.
   * @note Remember to call `stop()` after test is done to cleanup allocated resources and stop the docker containers.
   */
  async start(): Promise<void> {
    this.log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    this.log.info("Start Iroha2TestLedger...");
    this.ledger = new Iroha2TestLedger({
      containerImageName,
      containerImageVersion,
      useRunningLedger,
      emitContainerLogs: true,
      logLevel: testLogLevel,
      // Uncomment to test against the latest LTS image (pinned, older version of LTS is used by default)
      // envVars: ["IROHA_IMAGE_TAG=lts"],
    });
    this.log.debug("IrohaV2 image:", this.ledger.fullContainerImageName);
    expect(this.ledger).toBeTruthy();
    await this.ledger.start();

    // Get client config
    this.clientConfig = await this.ledger.getClientConfig();

    // Get signingCredential
    this._keyPairCredential = {
      publicKey: this.clientConfig.PUBLIC_KEY,
      privateKey: {
        digestFunction: this.clientConfig.PRIVATE_KEY.digest_function,
        payload: this.clientConfig.PRIVATE_KEY.payload,
      },
    };

    // Create Keychain Plugin
    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "aliceKey";
    const keychainEntryValue = JSON.stringify(this.keyPairCredential);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    });

    this._keychainCredentials = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

    this.iroha2ConnectorPlugin = new PluginLedgerConnectorIroha2({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      logLevel: sutLogLevel,
    });

    const [accountName, accountDomain] =
      this.clientConfig.ACCOUNT_ID.split("@");

    this._defaultBaseConfig = {
      torii: {
        apiURL: this.clientConfig.TORII_API_URL,
        telemetryURL: this.clientConfig.TORII_TELEMETRY_URL,
      },
      accountId: {
        name: accountName,
        domainId: accountDomain,
      },
      signingCredential: this.keychainCredentials,
    };

    // Run http server
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    this.connectorServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: this.connectorServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;
    this.log.debug("Iroha V2 connector URL:", apiHost);

    // Run socketio server
    this.socketioServer = new SocketIoServer(this.connectorServer, {
      path: Constants.SocketIoConnectionPathV1,
    });

    // Register services
    await this.iroha2ConnectorPlugin.getOrCreateWebServices();
    await this.iroha2ConnectorPlugin.registerWebServices(
      expressApp,
      this.socketioServer,
    );

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    this._apiClient = new Iroha2ApiClient(apiConfig);
  }

  /**
   * Stop the entire test environment (if it was started in the first place).
   */
  async stop(): Promise<void> {
    this.log.info("FINISHING THE TESTS");

    if (this.ledger) {
      this.log.info("Stop the iroha2 ledger...");
      await this.ledger.stop();
      await this.ledger.destroy();
    }

    if (this.socketioServer) {
      this.log.info("Stop the SocketIO server connector...");
      await new Promise<void>((resolve) =>
        this.socketioServer?.close(() => resolve()),
      );
    }

    if (this.connectorServer) {
      this.log.info("Stop the iroha2 connector...");
      await new Promise<void>((resolve) =>
        this.connectorServer?.close(() => resolve()),
      );
    }

    this.log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Fix flaky tests when running on local (fast) machine
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
