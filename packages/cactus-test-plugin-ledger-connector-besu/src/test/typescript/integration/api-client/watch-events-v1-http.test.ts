import { randomUUID } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

import "jest-extended";
import { encodeAbiParameters, WebSocketTransportConfig } from "viem";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  Servers,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  ReceiptType,
  BesuApiClient,
  BesuApiClientOptions,
  PluginLedgerConnectorBesu,
  ViemV2242WatchEventsV1Progress,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import * as EventsKitchensinkContract from "../../fixtures/event-kitchensink.sol";

describe("PluginLedgerConnectorBesu", () => {
  const logLevel: LogLevelDesc = "INFO";
  const log = LoggerProvider.getOrCreate({
    label: "watch-events-v1.test.ts",
    level: logLevel,
  });

  const besuTestLedger = new BesuTestLedger();
  const besuGenesisAccountPrivKeyEntryKey = randomUUID();
  const keychainId = randomUUID();
  const keychainInstanceId = randomUUID();
  const connectorInstanceId = randomUUID();
  const eventMessage = randomUUID();
  const eventNumberBigInt = BigInt(Math.random() * 10e12 * 10e15);
  const eventNumberBigIntStr10 = eventNumberBigInt.toString(10);

  const basicEventParams = [eventNumberBigIntStr10, true, eventMessage];

  /**
   * ```sol
   * contract EventKitchensink {
   *   // Event with basic types
   *   event BasicEvent(
   *     address indexed sender,
   *     uint256 value,
   *     bool success,
   *     string message
   *   );
   * ```
   */
  const basicEventAbiEncoded = encodeAbiParameters(
    [
      { type: "uint256" }, // value
      { type: "bool" }, // success
      { type: "string" }, // message
    ],
    basicEventParams as never,
  );

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: keychainInstanceId,
    keychainId,
    backend: new Map(),
    logLevel,
  });

  const pluginRegistry = new PluginRegistry({
    logLevel,
    plugins: [keychainPlugin],
  });

  const besuGenesisAccountPubKey = besuTestLedger.getGenesisAccountPubKey();
  const besuGenesisAccountPrivKey = besuTestLedger.getGenesisAccountPrivKey();

  let besuConnectorPlugin: PluginLedgerConnectorBesu;
  let rpcApiHttpHost: string;
  let rpcApiWsHost: string;
  let apiClient: BesuApiClient;
  let contractAddress: string;

  let httpServer: http.Server;
  let apiServer: ApiServer;
  let addressInfoHttp: AddressInfo;
  let apiHttpHost: string;

  beforeAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  beforeAll(async () => {
    await besuTestLedger.start();
  });

  beforeAll(async () => {
    rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    const viemWebSocketTransportConfig: WebSocketTransportConfig = {
      keepAlive: false,
      reconnect: false,
    };

    besuConnectorPlugin = new PluginLedgerConnectorBesu({
      rpcApiHttpHost,
      rpcApiWsHost,
      mainTransport: "http",
      logLevel,
      instanceId: connectorInstanceId,
      pluginRegistry,
      viemWebSocketTransportConfig,
    });
    pluginRegistry.add(besuConnectorPlugin);

    await keychainPlugin.set(
      besuGenesisAccountPrivKeyEntryKey,
      besuGenesisAccountPrivKey,
    );

    await keychainPlugin.set(
      EventsKitchensinkContract.CONTRACT_NAME,
      JSON.stringify(EventsKitchensinkContract.toJSON()),
    );
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  beforeAll(async () => {
    httpServer = await Servers.startOnPreferredPort(4050);
    addressInfoHttp = httpServer.address() as AddressInfo;
    apiHttpHost = `http://${addressInfoHttp.address}:${addressInfoHttp.port}`;
    log.debug("HTTP API host: %s", apiHttpHost);

    const cfgSrv = new ConfigService();
    const apiSrvOpts = await cfgSrv.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = addressInfoHttp.port;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.crpcPort = 0;
    const cfg = await cfgSrv.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      httpServerApi: httpServer,
      config: cfg.getProperties(),
      pluginRegistry,
    });

    const { addressInfoGrpc, addressInfoCrpc, addressInfoApi } =
      await apiServer.start();

    const {
      address: httpHost,
      port: httpPort,
      family: httpFamilly,
    } = addressInfoApi;

    log.info("HTTP family=%s host=%s port=%s", httpFamilly, httpHost, httpPort);
    const httpApiUrl = `http://${httpHost}:${httpPort}`;
    log.info("HTTP API URL: %s", httpApiUrl);

    const besuApiClientOptions = new BesuApiClientOptions({
      basePath: httpApiUrl,
    });
    apiClient = new BesuApiClient(besuApiClientOptions);

    const grpcPort = addressInfoGrpc.port;
    const grpcHost = addressInfoGrpc.address;
    const grpcFamily = addressInfoHttp.family;
    log.info("gRPC family=%s host=%s port=%s", grpcFamily, grpcHost, grpcPort);
    log.info("CRPC AddressInfo=%o", addressInfoCrpc);

    expect(apiServer).toBeTruthy();
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  afterAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  it("deploys and invokes solidity contracts - triggering events", async () => {
    const { data: deployOut } = await apiClient.deployContractSolBytecodeV1({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: EventsKitchensinkContract.CONTRACT_NAME,
      contractAbi: EventsKitchensinkContract.ABI,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: besuGenesisAccountPubKey,
        secret: besuGenesisAccountPrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: EventsKitchensinkContract.BYTECODE,
      gas: 6_000_000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut).toBeObject();

    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeObject();

    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeString();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
  });

  it("can watch/stream solidity contract events - SocketIO", async () => {
    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: besuGenesisAccountPubKey,
        secret: besuGenesisAccountPrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: besuGenesisAccountPubKey,
        to: besuGenesisAccountPubKey,
        value: 10e9,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    });

    const requestId = randomUUID();

    const eventStream = apiClient.watchEventsV1({
      requestId,
      abi: EventsKitchensinkContract.ABI,
      address: contractAddress,
    });

    const watchProgressV1 = await new Promise<ViemV2242WatchEventsV1Progress>(
      async (resolve, reject) => {
        let done = false;
        const timerId = setTimeout(() => {
          if (!done) {
            reject("Waiting for event log notification to arrive timed out");
          }
        }, 10000);

        const subscription = eventStream.subscribe((res) => {
          subscription.unsubscribe();
          done = true;
          clearTimeout(timerId);
          resolve(res);
        });

        const { data: callOutput } = await apiClient.invokeContractV1({
          contractName: EventsKitchensinkContract.CONTRACT_NAME,
          contractAbi: EventsKitchensinkContract.ABI,
          contractAddress,
          invocationType: EthContractInvocationType.Send,
          methodName: "triggerBasicEvent",
          params: basicEventParams,
          signingCredential: {
            ethAccount: besuGenesisAccountPubKey,
            secret: besuGenesisAccountPrivKey,
            type: Web3SigningCredentialType.PrivateKeyHex,
          },
          gas: 2_000_000,
        });

        expect(callOutput).toBeTruthy();
        expect(callOutput).toBeObject();
        expect(callOutput).not.toBeEmpty();
      },
    );
    expect(watchProgressV1).toBeTruthy();
    expect(watchProgressV1).toBeObject();
    expect(watchProgressV1).not.toBeEmptyObject();

    const { logs, requestId: requestIdReturned } = watchProgressV1;
    expect(logs).toBeArrayOfSize(1);
    if (!Array.isArray(logs)) {
      throw new Error("eventLog is not an array");
    }
    expect(requestIdReturned).toEqual(requestId);
    const [firstEventLog] = logs;

    log.debug("Contract Address: %s", contractAddress);
    expect(firstEventLog).toMatchObject({
      address: contractAddress.toLowerCase(),
      args: {
        message: eventMessage,
        sender: besuGenesisAccountPubKey,
        success: true,
        value: eventNumberBigIntStr10,
      },
      blockHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
      blockNumber: expect.toBePositive(),
      data: basicEventAbiEncoded,
      eventName: "BasicEvent",
      logIndex: 0,
      removed: false,
      topics: [
        "0xfccf2aa743a7966109510c058a36522fd1ef4e5bc019915d2bcd25ac6ff5ddc2",
        "0x000000000000000000000000627306090abab3a6e1400e9345bc60c78a8bef57",
      ],
      transactionHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
      transactionIndex: 0,
    });
  });
});
