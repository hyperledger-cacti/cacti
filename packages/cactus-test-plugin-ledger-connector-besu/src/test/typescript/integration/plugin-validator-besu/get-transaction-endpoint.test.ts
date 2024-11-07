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
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
  IKeyPair,
} from "@hyperledger/cactus-test-tooling";
import {
  BesuApiClientOptions,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  GetTransactionV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

const testCase = "Test get transaction endpoint";
const logLevel: LogLevelDesc = "TRACE";

describe(testCase, () => {
  const besuTestLedger = new BesuTestLedger();
  let apiServer: ApiServer;

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
    await besuTestLedger.start();
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await apiServer.shutdown();
  });

  test(testCase, async () => {
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

    const pluginRegistry = new PluginRegistry({ plugins: [keychain] });
    const httpServer1 = createServer();

    await new Promise((resolve, reject) => {
      httpServer1.once("error", reject);
      httpServer1.once("listening", resolve);
      httpServer1.listen(0, "127.0.0.1");
    });

    const addressInfo1 = httpServer1.address() as AddressInfo;
    console.log(`HttpServer1 AddressInfo: ${JSON.stringify(addressInfo1)}`);

    const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;
    console.log(`Cactus Node 1 Host: ${node1Host}`);

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };

    const pluginValidatorBesu = new PluginLedgerConnectorBesu(options);

    const cfgSvc = new ConfigService();
    const apiSrvOpts = await cfgSvc.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = addressInfo1.port;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    const config = await cfgSvc.newExampleConfigConvict(apiSrvOpts);

    pluginRegistry.add(pluginValidatorBesu);

    apiServer = new ApiServer({
      httpServerApi: httpServer1,
      config: config.getProperties(),
      pluginRegistry,
    });

    await apiServer.start();

    console.log(`AddressInfo: ${JSON.stringify(addressInfo1)}`);

    const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
    const web3 = new Web3(web3Provider);
    const web3JsQuorum: IWeb3Quorum = Web3JsQuorum(web3);

    const orionKeyPair: IKeyPair = await besuTestLedger.getOrionKeyPair();
    const besuKeyPair = await besuTestLedger.getBesuKeyPair();

    const besuPrivateKey = besuKeyPair.privateKey.toLowerCase().startsWith("0x")
      ? besuKeyPair.privateKey.substring(2)
      : besuKeyPair.privateKey; // besu node's private key

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

    const request: GetTransactionV1Request = {
      transactionHash: transactionHash,
    };

    const configuration = new BesuApiClientOptions({ basePath: node1Host });
    const api = new BesuApiClient(configuration);

    // Test for 200 valid response test case
    const res = await api.getTransactionV1(request);

    expect(res).toBeTruthy();
    expect(res.data.transaction).toBeTruthy();
    expect(res.data.transaction).toBeObject();
  });
});
