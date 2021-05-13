import test, { Test } from "tape-promise/tape";

import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";
import Web3 from "web3";
import EEAClient, { IWeb3InstanceExtended } from "web3-eea";
import { JWK, JWS } from "jose";

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
} from "@hyperledger/cactus-test-tooling";

import {
  BesuApiClientOptions,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  SignTransactionRequest,
  NodeHostsProviderType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  CactusNode,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
} from "@hyperledger/cactus-core-api";
import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
  DefaultApi as DefaultApiConsortium,
  Configuration as ConfigurationConsortium,
} from "@hyperledger/cactus-plugin-consortium-manual";

import { PluginRegistry, ConsortiumRepository } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

const testCase = "Test sign transaction endpoint";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const consortiumId = uuidv4();
  const consortiumName = "Example Consortium";
  const pluginConsortiumId = uuidv4();

  const memberId1 = uuidv4();

  const httpServerC = createServer();
  await new Promise((resolve, reject) => {
    httpServerC.once("error", reject);
    httpServerC.once("listening", resolve);
    httpServerC.listen(0, "127.0.0.1");
  });
  const addressInfoC = httpServerC.address() as AddressInfo;
  t.comment(`HttpServer1 AddressInfo: ${JSON.stringify(addressInfoC)}`);
  const nodeCHost = `http://${addressInfoC.address}:${addressInfoC.port}`;
  t.comment(`Cactus Node1 Consortium Host: ${nodeCHost}`);

  const keyPairC = await JWK.generate("EC", "secp256k1");
  const pubKeyPemC = keyPairC.toPEM(false);
  t.comment(`Cactus Node 1 Public Key PEM: ${pubKeyPemC}`);

  const node1: CactusNode = {
    consortiumId,
    memberId: memberId1,
    id: "Example_Cactus_Node_1",
    nodeApiHost: nodeCHost,
    publicKeyPem: pubKeyPemC,
    ledgerIds: [],
    pluginInstanceIds: [],
  };

  const member1: ConsortiumMember = {
    id: memberId1,
    name: "Corp 1",
    nodeIds: [node1.id],
  };

  const consortium: Consortium = {
    id: consortiumId,
    mainApiHost: nodeCHost,
    name: consortiumName,
    memberIds: [memberId1],
  };

  const consortiumDatabase: ConsortiumDatabase = {
    cactusNode: [node1],
    consortium: [consortium],
    consortiumMember: [member1],
    ledger: [],
    pluginInstance: [],
  };

  const consortiumRepo = new ConsortiumRepository({ db: consortiumDatabase });
  t.comment(`Setting up first node...`);
  const pluginRegistry = new PluginRegistry({ plugins: [] });
  {
    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    //const pluginRegistry = new PluginRegistry({ plugins: [] });

    // 3. Instantiate the web service consortium plugin
    const options: IPluginConsortiumManualOptions = {
      instanceId: pluginConsortiumId,
      pluginRegistry,
      keyPairPem: keyPairC.toPEM(true),
      consortiumDatabase,
      logLevel: "trace",
      consortiumRepo,
    };

    const pluginConsortiumManual = new PluginConsortiumManual(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const apiServerOptions = configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfoC.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(apiServerOptions);

    pluginRegistry.add(pluginConsortiumManual);

    const apiServer = new ApiServer({
      httpServerApi: httpServerC,
      config: config.getProperties(),
      pluginRegistry,
    });

    // 5. make sure the API server is shut down when the testing if finished.
    test.onFinish(() => apiServer.shutdown());

    // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
    t.comment(`AddressInfo: ${JSON.stringify(addressInfoC)}`);

    const configuration = new ConfigurationConsortium({ basePath: nodeCHost });
    const api = new DefaultApiConsortium(configuration);
    const res = await api.getNodeJws();
    t.ok(res, "API response object is truthy");
  }
  t.comment(`Set up first node OK`);

  ///////////////////////////////
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
  t.comment(`HttpServer1 AddressInfo: ${JSON.stringify(addressInfo1)}`);
  const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;
  t.comment(`Cactus Node 1 Host: ${node1Host}`);

  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  const tearDown = async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
  // const pluginRegistry = new PluginRegistry({ plugins: [keychain] });
  pluginRegistry.add(keychain);

  // 3. Instantiate the web service consortium plugin
  const options: IPluginLedgerConnectorBesuOptions = {
    instanceId: uuidv4(),
    rpcApiHttpHost,
    rpcApiWsHost,
    pluginRegistry,
    logLevel,
  };
  const pluginValidatorBesu = new PluginLedgerConnectorBesu(options);

  // 4. Create the API Server object that we embed in this test
  const configService = new ConfigService();
  const apiServerOptions = await configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo1.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.grpcPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = await configService.newExampleConfigConvict(apiServerOptions);

  pluginRegistry.add(pluginValidatorBesu);

  const apiServer = new ApiServer({
    httpServerApi: httpServer1,
    config: config.getProperties(),
    pluginRegistry,
  });

  // 5. make sure the API server is shut down when the testing if finished.
  test.onFinish(() => apiServer.shutdown());

  // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
  await apiServer.start();

  // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
  t.comment(`AddressInfo: ${JSON.stringify(addressInfo1)}`);

  const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
  const web3 = new Web3(web3Provider);
  const web3Eea: IWeb3InstanceExtended = EEAClient(web3, 2018);

  const orionKeyPair = await besuTestLedger.getOrionKeyPair();
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

  const transactionHash = await web3Eea.eea.sendRawTransaction(contractOptions);

  const transaction = await web3.eth.getTransaction(transactionHash);
  const signData = JWS.sign(transaction.input, keyPairC);

  const request: SignTransactionRequest = {
    keychainId,
    keychainRef,
    transactionHash: transactionHash,
    nodeHostsProvider: NodeHostsProviderType.ConsortiumPlugin,
    consortiumPluginId: pluginConsortiumId,
  };

  const configuration = new BesuApiClientOptions({ basePath: node1Host });
  const api = new BesuApiClient(configuration);

  // Test for 200 valid response test case
  const res = await api.signTransactionV1(request);
  t.ok(res, "API response object is truthy");
  t.ok(res.data, "API response data is truthy");
  t.ok(res.data.signature, "API response data.signature is truthy");

  const referenceVerifyOut = JWS.verify(signData, keyPairC, {
    complete: true,
    parse: true,
  });
  t.ok(referenceVerifyOut, "referenceVerifyOut truthy OK");

  const responseVerifyOut = JWS.verify(
    Buffer.from(res.data.signature, "hex").toString("utf-8"),
    keyPairC,
    { complete: true, parse: true },
  );
  t.ok(responseVerifyOut, "responseVerifyOut truthy OK");

  t.deepEquals(
    responseVerifyOut,
    referenceVerifyOut,
    "Signature data are equal",
  );

  // Test for 404 Transaction not found test case
  try {
    const notFoundRequest: SignTransactionRequest = {
      keychainId: "fake",
      keychainRef: "fake",
      transactionHash:
        "0x46eac4d1d1ff81837698cbab38862a428ddf042f92855a72010de2771a7b704d",
      nodeHostsProvider: NodeHostsProviderType.ConsortiumPlugin,
    };
    await api.signTransactionV1(notFoundRequest);
  } catch (error) {
    t.equal(error.response.status, 404, "HTTP response status are equal");
    t.equal(
      error.response.statusText,
      "Transaction not found",
      "Response text are equal",
    );
  }
});
