import "jest-extended";

import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";
import Web3 from "web3";
import Web3JsQuorum, { IWeb3Quorum } from "web3js-quorum";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import {
  Secp256k1Keys,
  KeyFormat,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  BesuApiClientOptions,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  GetPastLogsV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

// Main test case name and log level
const testCase = "API client can call get-PastLogs via network";
const logLevel: LogLevelDesc = "TRACE";

describe("PluginLedgerBesu-v21GetPastLogs", () => {
  const log = LoggerProvider.getOrCreate({
    label: "v21-get-past-logs-endpoint.test.ts",
    level: logLevel,
  });

  const containerImageVersion = "2021-08-24--feat-1244";
  const containerImageName =
    "ghcr.io/hyperledger/cactus-besu-21-1-6-all-in-one";
  const besuOptions = { containerImageName, containerImageVersion };
  const besuTestLedger = new BesuTestLedger(besuOptions);

  let apiServer: ApiServer;
  let web3JsQuorum: IWeb3Quorum;
  let besuPrivateKey: string;
  let node1Host: string;
  let web3: Web3;

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).toResolve();
  });

  beforeAll(async () => {
    await besuTestLedger.start();
  });

  beforeAll(async () => {
    const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
    const keychainId = uuidv4();
    const keychainRef = uuidv4();

    const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
    const keyHex = privateKey.toString("hex");
    const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);

    const keychain = new PluginKeychainMemory({
      backend: new Map([[keychainRef, pem]]),
      keychainId,
      logLevel,
      instanceId: uuidv4(),
    });

    const httpServer1 = createServer();
    await new Promise((resolve, reject) => {
      httpServer1.once("error", reject);
      httpServer1.once("listening", resolve);
      httpServer1.listen(0, "127.0.0.1");
    });

    const addressInfo1 = httpServer1.address() as AddressInfo;
    log.debug(`HttpServer1 AddressInfo: ${JSON.stringify(addressInfo1)}`);
    node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;
    log.debug(`Cactus Node 1 Host: ${node1Host}`);

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    const pluginRegistry = new PluginRegistry({ plugins: [keychain] });

    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    const pluginValidatorBesu = new PluginLedgerConnectorBesu(options);

    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfo1.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config =
      await configService.newExampleConfigConvict(apiServerOptions);

    pluginRegistry.add(pluginValidatorBesu);

    apiServer = new ApiServer({
      httpServerApi: httpServer1,
      config: config.getProperties(),
      pluginRegistry,
    });

    await apiServer.start();

    const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
    web3 = new Web3(web3Provider);
    web3JsQuorum = Web3JsQuorum(web3);

    const besuKeyPair = await besuTestLedger.getBesuKeyPair();
    besuPrivateKey = besuKeyPair.privateKey.toLowerCase().startsWith("0x")
      ? besuKeyPair.privateKey.substring(2)
      : besuKeyPair.privateKey;
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  const tearDown = async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  };

  afterAll(tearDown);

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).toResolve();
  });

  test(testCase, async () => {
    const orionKeyPair = await besuTestLedger.getOrionKeyPair();
    const contractOptions = {
      data: `0x123`,
      // privateFrom : Orion public key of the sender.
      privateFrom: orionKeyPair.publicKey,
      // privateFor : Orion public keys of recipients or privacyGroupId: Privacy group to receive the transaction
      privateFor: [orionKeyPair.publicKey],
      // privateKey: Ethereum private key with which to sign the transaction.
      privateKey: besuPrivateKey,
    };

    const transactionHash =
      await web3JsQuorum.priv.generateAndSendRawTransaction(contractOptions);

    await web3.eth.getTransaction(transactionHash);

    const request: GetPastLogsV1Request = {
      address: (await besuTestLedger.createEthTestAccount()).address,
    };

    const configuration = new BesuApiClientOptions({ basePath: node1Host });
    const api = new BesuApiClient(configuration);

    const res = await api.getPastLogsV1(request);

    expect(res).toBeTruthy();

    expect(res.data.logs).toBeArray();
    expect(res.data.logs).toBeTruthy();
  });
});
