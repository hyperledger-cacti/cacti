import KeyEncoder from "key-encoder";
import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  IListenOptions,
  KeyFormat,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";

import {
  IrohaTestLedger,
  PostgresTestContainer,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { v4 as internalIpV4 } from "internal-ip";
import { v4 as uuidv4 } from "uuid";
import { RuntimeError } from "run-time-error";
import cryptoHelper from "iroha-helpers-ts/lib/cryptoHelper";
import {
  IrohaBlockProgress,
  IrohaBlockResponse,
  IrohaCommand,
  KeyPair,
} from "../../../main/typescript/generated/openapi/typescript-axios";

import {
  IPluginLedgerConnectorIrohaOptions,
  IrohaApiClient,
  IrohaApiClientOptions,
  PluginFactoryLedgerConnector,
} from "../../../main/typescript";

import { AddressInfo } from "net";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server as SocketIoServer } from "socket.io";

const logLevel: LogLevelDesc = "DEBUG";

const log: Logger = LoggerProvider.getOrCreate({
  label: "socket-api.test",
  level: logLevel,
});

type IrohaLedgerInfo = {
  testLedger: IrohaTestLedger;
  host: string;
  adminPriv: string;
  adminAccount: string;
  port: number;
  domain: string;
};

type PostgresContainerInfo = {
  container: PostgresTestContainer;
  host: string;
  port: number;
};

async function setupPostgres(): Promise<any> {
  const postgresTestContainer = new PostgresTestContainer({ logLevel });

  await postgresTestContainer.start();

  const postgresHost = await internalIpV4();
  const postgresPort = await postgresTestContainer.getPostgresPort();

  if (!postgresHost) {
    throw new RuntimeError("Could not determine the internal IPV4 address.");
  } else {
    return {
      container: postgresTestContainer,
      host: postgresHost,
      port: postgresPort,
    };
  }
}

async function setupIrohaTestLedger(postgres: any): Promise<any> {
  const keyPair1: KeyPair = cryptoHelper.generateKeyPair();
  const adminPriv = keyPair1.privateKey;
  const adminPubA = keyPair1.publicKey;

  const keyPair2: KeyPair = cryptoHelper.generateKeyPair();
  const nodePrivA = keyPair2.privateKey;
  const nodePubA = keyPair2.publicKey;

  const iroha = new IrohaTestLedger({
    adminPriv: adminPriv,
    adminPub: adminPubA,
    nodePriv: nodePrivA,
    nodePub: nodePubA,
    postgresHost: postgres.host,
    // postgresHost: "172.17.0.1", for docker
    postgresPort: postgres.port,
    logLevel: logLevel,
    rpcApiWsPort: 50051,
  });

  log.debug("Starting Iroha test ledger");
  await iroha.start(true);

  const adminAccount = iroha.getDefaultAdminAccount();
  const irohaHost = await internalIpV4();
  const irohaPort = await iroha.getRpcToriiPort();
  const domain = iroha.getDefaultDomain();

  if (!irohaHost) {
    throw new RuntimeError("Could not determine the internal IPV4 address.");
  } else {
    return {
      testLedger: iroha,
      host: irohaHost,
      adminPriv: adminPriv,
      adminAccount: adminAccount,
      port: irohaPort,
      domain: domain,
    };
  }
}

async function createPluginRegistry(): Promise<PluginRegistry> {
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const keychainRef = uuidv4();
  const keychainId = uuidv4();

  const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
  const keyHex = privateKey.toString("hex");
  const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);

  const keychain = new PluginKeychainMemory({
    backend: new Map([[keychainRef, pem]]),
    keychainId,
    logLevel,
    instanceId: uuidv4(),
  });

  log.debug("Instantiating plugin registry");
  const pluginRegistry = new PluginRegistry({ plugins: [keychain] });

  return pluginRegistry;
}

describe("Iroha SocketIo TestSuite", () => {
  let postgres: PostgresContainerInfo;
  let iroha: IrohaLedgerInfo;
  let apiClient: IrohaApiClient;
  let server: http.Server;

  beforeAll(async () => {
    const pruning = await pruneDockerAllIfGithubAction({ logLevel });
    expect(pruning).toBeTruthy();
  });

  test("Prepare Iroha test ledger and Postgres Container", async () => {
    log.debug("Setting up Postgres");
    postgres = await setupPostgres();

    log.debug("Setting up Iroha test ledger");
    iroha = await setupIrohaTestLedger(postgres);

    expect(iroha).not.toBe(undefined);
    expect(postgres).not.toBe(undefined);
  });

  test("Prepare API client", async () => {
    const rpcApiHttpHost = await iroha.testLedger.getRpcToriiPortHost();
    const rpcApiWsHost = await iroha.testLedger.getRpcApiWsHost();

    log.debug("Instantiating plugin registry");
    const pluginRegistry = await createPluginRegistry();

    log.debug("Creating API server object");
    const options: IPluginLedgerConnectorIrohaOptions = {
      rpcToriiPortHost: rpcApiHttpHost,
      rpcApiWsHost: rpcApiWsHost,
      pluginRegistry: pluginRegistry,
      logLevel: logLevel,
      instanceId: uuidv4(),
    };

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const connector = await factory.create(options);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
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

    const wsBasePath = apiHost + Constants.SocketIoConnectionPathV1;
    log.info(`ws base path: ${wsBasePath}`);

    const irohaApiClientOptions = new IrohaApiClientOptions({
      basePath: apiHost,
    });
    apiClient = new IrohaApiClient(irohaApiClientOptions);

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    expect(apiClient).not.toBe(undefined);
  });

  async function testBlock(block: IrohaBlockResponse): Promise<boolean> {
    log.debug("Testing given block...");
    let blockOk = true;

    const topLevelProperties = ["payload", "signaturesList"];

    const payloadProperties = [
      "transactionsList",
      "txNumber",
      "height",
      "prevBlockHash",
      "createdTime",
      "rejectedTransactionsHashesList",
    ];

    for (let iter = 0; iter < topLevelProperties.length; iter++) {
      if (
        !Object.prototype.hasOwnProperty.call(block, topLevelProperties[iter])
      ) {
        log.error(
          `Tested block is missing property: ${topLevelProperties[iter]}`,
        );
        blockOk = false;
      }
      if (
        block[topLevelProperties[iter] as keyof IrohaBlockResponse] ===
        undefined
      ) {
        log.error(
          `Property ${topLevelProperties[iter]} is undefined: ${topLevelProperties[iter]}`,
        );
        blockOk = false;
      }
    }

    for (let iter = 0; iter < payloadProperties.length; iter++) {
      if (
        !Object.prototype.hasOwnProperty.call(
          block.payload,
          payloadProperties[iter],
        )
      ) {
        log.error(
          `Payload in tested block is missing property: ${payloadProperties[iter]}`,
        );
        blockOk = false;
      }
    }
    log.debug(`Tested block is: ${blockOk ? "ok" : "not ok"}`);
    return blockOk;
  }

  async function createSampleAsset(assetID: string) {
    // Create asset on ledger to create new block
    const assetId = assetID;

    const createAssetRequest = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: iroha.host,
        irohaPort: iroha.port,
        creatorAccountId: `${iroha.adminAccount}@${iroha.domain}`,
        privKey: [iroha.adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetId, iroha.domain, 3],
    };
    await apiClient.runTransactionV1(createAssetRequest);
  }

  test("Monitoring", async () => {
    const monitoringOptions = {
      baseConfig: {
        irohaHost: iroha.host,
        irohaPort: iroha.port,
        creatorAccountId: `${iroha.adminAccount}@${iroha.domain}`,
        privKey: [iroha.adminPriv],
        quorum: 1,
        timeoutLimit: 10000,
      },
      pollTime: 5000,
    };

    // Start monitoring
    const blocks = apiClient.watchBlocksV1(monitoringOptions);

    // Make sample action on ledger
    await createSampleAsset("coolcoin");

    // Check for arrival of new block
    const arrivedBlock = await new Promise<IrohaBlockResponse>(
      (resolve, reject) => {
        let done = false;
        const timerId = setTimeout(() => {
          if (!done) {
            reject("Waiting for block notification to arrive timed out");
          }
        }, 30000);

        const subscription = blocks.subscribe((res: IrohaBlockProgress) => {
          subscription.unsubscribe();
          done = true;
          clearTimeout(timerId);
          resolve(res.transactionReceipt);
        });
      },
    );

    expect(arrivedBlock).not.toBe(undefined);
    log.debug(`Block arrived: ${JSON.stringify(arrivedBlock, null, 4)}`);

    // Checking block structure
    expect(
      Object.prototype.hasOwnProperty.call(arrivedBlock, "payload"),
    ).toBeTrue();
    expect(await testBlock(arrivedBlock)).toBeTrue();

    log.debug("Monitoring successfully completed");
  });

  test("Async Request", async () => {
    // Start monitoring to catch block created in async request
    // const blocks = apiClient.watchBlocksV1(requestData);

    const monitoringRequestData = {
      baseConfig: {
        irohaHost: iroha.host,
        irohaPort: iroha.port,
        creatorAccountId: `${iroha.adminAccount}@${iroha.domain}`,
        privKey: [iroha.adminPriv],
        quorum: 1,
        timeoutLimit: 10000,
      },
      pollTime: 3000,
    };

    const blocks = apiClient.watchBlocksV1(monitoringRequestData);

    // Create new asset to check if request was successfull
    const assetID = "eth";
    const commandName = { methodName: IrohaCommand.CreateAsset };
    const baseConfig = {
      irohaHost: iroha.host,
      irohaPort: iroha.port,
      creatorAccountId: `${iroha.adminAccount}@${iroha.domain}`,
      privKey: [iroha.adminPriv],
      quorum: 1,
      timeoutLimit: 5000,
    };
    const params = [assetID, iroha.domain, 3];

    log.debug(`Sending Async Request with ${commandName} command.`);
    apiClient.sendAsyncRequest(params, commandName, baseConfig);

    const arrivedBlock = await new Promise<IrohaBlockResponse>(
      (resolve, reject) => {
        let done = false;
        const timerId = setTimeout(() => {
          if (!done) {
            reject("Waiting for block notification to arrive timed out");
          }
        }, 30000);

        const subscription = blocks.subscribe((res: IrohaBlockProgress) => {
          subscription.unsubscribe();
          done = true;
          clearTimeout(timerId);
          resolve(res.transactionReceipt);
        });
      },
    );

    expect(await testBlock(arrivedBlock)).toBeTrue();
    log.debug("Async call successfully completed");
  });

  test("Sync Request", async () => {
    // Get asset info on previously created coolcoin
    const assetID = "btc";
    const commandName = { methodName: IrohaCommand.CreateAsset };
    const baseConfig = {
      irohaHost: iroha.host,
      irohaPort: iroha.port,
      creatorAccountId: `${iroha.adminAccount}@${iroha.domain}`,
      privKey: [iroha.adminPriv],
      quorum: 1,
      timeoutLimit: 10000,
    };
    const params = [assetID, iroha.domain, 3];

    log.debug(`Sending Sync Request with ${commandName} command.`);
    const response = await apiClient.sendSyncRequest(
      params,
      commandName,
      baseConfig,
    );

    expect(response).not.toBe(undefined || " ");
    expect(Object.keys(response)).toContain("status");
    expect(Object.keys(response)).toContain("data");
    expect(response.status).toBe("COMMITTED");
    log.debug("Sync call successfully completed");
  });

  afterAll(async () => {
    // Remove Iroha after all tests are done
    await iroha.testLedger.stop();
    await iroha.testLedger.destroy();

    await postgres.container.stop();
    await postgres.container.destroy();

    const pruning = await pruneDockerAllIfGithubAction({ logLevel });
    expect(pruning).toBeTruthy();
  });
});
