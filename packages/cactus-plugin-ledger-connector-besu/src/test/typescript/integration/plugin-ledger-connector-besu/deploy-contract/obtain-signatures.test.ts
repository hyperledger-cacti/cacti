import test, { Test } from "tape-promise/tape";

import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";
import Web3 from "web3";
import { JWK, JWS } from "jose";
import express from "express";
import { Server as SocketIoServer } from "socket.io";

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
  //  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  SignTransactionRequest,
  NodeHostsProviderType,
  ReceiptType,
  Web3SigningCredentialType,
} from "../../../../../main/typescript/public-api";
import {
  CactusNode,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
  LedgerType,
  Constants,
} from "@hyperledger/cactus-core-api";
import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
  DefaultApi as DefaultApiConsortium,
  Configuration as ConfigurationConsortium,
} from "@hyperledger/cactus-plugin-consortium-manual";

import { PluginRegistry, ConsortiumRepository } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import http from "http";

const logLevel: LogLevelDesc = "TRACE";
const firstHighNetWorthAccount = "627306090abaB3A6e1400e9345bC60c78a8BEf57";
const besuKeyPair = {
  privateKey:
    "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
};

test("BEFORE Test sign transaction validation", async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test("Test sign transaction validation", async (t: Test) => {
  //Create Ledger
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
  const besuTestLedger2 = new BesuTestLedger();
  await besuTestLedger2.start();

  const tearDown = async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await besuTestLedger2.stop();
    await besuTestLedger2.destroy();
  };

  test.onFinish(tearDown);

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  const rpcApiHttpHost2 = await besuTestLedger2.getRpcApiHttpHost();
  // const rpcApiWsHost2 = await besuTestLedger2.getRpcApiWsHost();

  const expressApp = express();
  const server = http.createServer(expressApp);

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const configuration = new BesuApiClientOptions({ basePath: node1Host });
  const api = new BesuApiClient(configuration);

  //Create Consortium
  const consortiumId = uuidv4();
  const consortiumName = "Example Consortium";
  const pluginConsortiumId = uuidv4();

  const memberId1 = uuidv4();
  const memberId2 = uuidv4();

  const httpServerC1 = createServer();
  await new Promise((resolve, reject) => {
    httpServerC1.once("error", reject);
    httpServerC1.once("listening", resolve);
    httpServerC1.listen(0, "127.0.0.1");
  });
  const addressInfoC1 = httpServerC1.address() as AddressInfo;
  t.comment(`HttpServerC1 AddressInfo: ${JSON.stringify(addressInfoC1)}`);
  const nodeC1Host = `http://${addressInfoC1.address}:${addressInfoC1.port}`;
  t.comment(`Cactus Node1 Consortium Host: ${nodeC1Host}`);

  const keyPairC1 = await JWK.generate("EC", "secp256k1");
  const pubKeyPemC1 = keyPairC1.toPEM(false);
  t.comment(`Cactus Node 1 Public Key PEM: ${pubKeyPemC1}`);
  /////////////////////////////////////////////////////////////
  const httpServerC2 = createServer();
  await new Promise((resolve, reject) => {
    httpServerC2.once("error", reject);
    httpServerC2.once("listening", resolve);
    httpServerC2.listen(0, "127.0.0.1");
  });
  const addressInfoC2 = httpServerC2.address() as AddressInfo;
  t.comment(`HttpServerC2 AddressInfo: ${JSON.stringify(addressInfoC2)}`);
  const nodeC2Host = `http://${addressInfoC2.address}:${addressInfoC2.port}`;
  t.comment(`Cactus Node2 Consortium Host: ${nodeC2Host}`);

  const keyPairC2 = await JWK.generate("EC", "secp256k1");
  const pubKeyPemC2 = keyPairC2.toPEM(false);
  t.comment(`Cactus Node 2 Public Key PEM: ${pubKeyPemC2}`);

  const node1: CactusNode = {
    consortiumId,
    memberId: memberId1,
    id: "Example_Cactus_Node_1",
    nodeApiHost: rpcApiHttpHost,
    publicKeyPem: pubKeyPemC1,
    ledgerIds: [],
    pluginInstanceIds: [],
  };

  const member1: ConsortiumMember = {
    id: memberId1,
    name: "Corp 1",
    nodeIds: [node1.id],
  };

  const ledger1 = {
    id: "BesuLedger1",
    ledgerType: LedgerType.Besu1X,
  };
  node1.ledgerIds.push(ledger1.id);
  ///////////////////////////////////////////////////////
  const node2: CactusNode = {
    consortiumId,
    memberId: memberId2,
    id: "Example_Cactus_Node_2",
    nodeApiHost: rpcApiHttpHost2,
    publicKeyPem: pubKeyPemC2,
    ledgerIds: [],
    pluginInstanceIds: [],
  };

  const member2: ConsortiumMember = {
    id: memberId2,
    name: "Corp 2",
    nodeIds: [node2.id],
  };

  const ledger2 = {
    id: "BesuLedger2",
    ledgerType: LedgerType.Besu1X,
  };
  node2.ledgerIds.push(ledger2.id);

  const consortium: Consortium = {
    id: consortiumId,
    mainApiHost: nodeC1Host,
    name: consortiumName,
    memberIds: [memberId1, memberId2],
  };

  const consortiumDatabase: ConsortiumDatabase = {
    cactusNode: [node1, node2],
    consortium: [consortium],
    consortiumMember: [member1, member2],
    ledger: [ledger1, ledger2],
    pluginInstance: [],
  };

  const consortiumRepo = new ConsortiumRepository({ db: consortiumDatabase });
  t.comment(`Setting up first node...`);
  const pluginRegistry = new PluginRegistry({ plugins: [] });

  pluginRegistry.add(keychain);

  // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
  //const pluginRegistry = new PluginRegistry({ plugins: [] });

  // 3. Instantiate the web service consortium plugin
  const options: IPluginConsortiumManualOptions = {
    instanceId: pluginConsortiumId,
    //pluginRegistry,
    keyPairPem: keyPairC1.toPEM(true),
    consortiumDatabase,
    logLevel: "trace",
    consortiumRepo,
  };

  const pluginConsortiumManual = new PluginConsortiumManual(options);

  //here
  pluginRegistry.add(pluginConsortiumManual);

  const connectorBesu = new PluginLedgerConnectorBesu({
    instanceId: "PluginLedgerConnectorBesu_A",
    rpcApiHttpHost: rpcApiHttpHost,
    rpcApiWsHost: rpcApiWsHost,
    pluginRegistry: pluginRegistry,
    logLevel: options.logLevel,
  });

  await connectorBesu.getOrCreateWebServices();
  await connectorBesu.registerWebServices(expressApp, wsApi);

  pluginRegistry.add(connectorBesu);

  /*    const connectorBesu2 = new PluginLedgerConnectorBesu({
      instanceId: "PluginLedgerConnectorBesu_B",
      rpcApiHttpHost: rpcApiHttpHost2,
      rpcApiWsHost: rpcApiWsHost2,
      pluginRegistry: pluginRegistry,
      logLevel: options.logLevel,
    });

    pluginRegistry.add(connectorBesu2);*/

  // 4. Create the API Server object that we embed in this test
  const configService1 = new ConfigService();
  const apiServerOptions1 = configService1.newExampleConfig();
  apiServerOptions1.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions1.configFile = "";
  apiServerOptions1.apiCorsDomainCsv = "*";
  apiServerOptions1.apiPort = addressInfoC1.port;
  apiServerOptions1.cockpitPort = 0;
  apiServerOptions1.apiTlsEnabled = false;
  const config1 = configService1.newExampleConfigConvict(apiServerOptions1);

  //pluginRegistry.add(pluginConsortiumManual);

  const apiServer1 = new ApiServer({
    httpServerApi: httpServerC1,
    config: config1.getProperties(),
    pluginRegistry,
  });

  // 5. make sure the API server is shut down when the testing if finished.
  test.onFinish(() => apiServer1.shutdown());

  // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
  await apiServer1.start();

  // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
  t.comment(`AddressInfo: ${JSON.stringify(addressInfoC1)}`);

  const configuration1 = new ConfigurationConsortium({ basePath: nodeC1Host });
  const api1 = new DefaultApiConsortium(configuration1);
  const res1 = await api1.getNodeJws();
  t.ok(res1, "API response object is truthy");

  t.comment(`Set up first node OK`);

  // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
  //const pluginRegistry = new PluginRegistry({ plugins: [keychain] });
  //pluginRegistry.add(keychain);

  // 3. Instantiate the web service consortium plugin
  /*  const options: IPluginLedgerConnectorBesuOptions = {
    instanceId: uuidv4(),
    rpcApiHttpHost,
    rpcApiWsHost,
    pluginRegistry,
    logLevel,
  };
  const pluginValidatorBesu = new PluginLedgerConnectorBesu(options);*/

  // 4. Create the API Server object that we embed in this test
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo1.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);

  //  pluginRegistry.add(pluginValidatorBesu);

  const apiServer = new ApiServer({
    httpServerApi: httpServer1,
    config: config.getProperties(),
    pluginRegistry,
  });

  // 5. make sure the API server is shut down when the testing if finished.
  test.onFinish(() => apiServer.shutdown());

  // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
  await apiServer.start();

  ///////////////////////////////
  //**1 */
  // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
  t.comment(`AddressInfo: ${JSON.stringify(addressInfo1)}`);

  const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
  const web3 = new Web3(web3Provider);

  const testEthAccount = web3.eth.accounts.create(uuidv4());
  const testEthAccount2 = web3.eth.accounts.create(uuidv4());

  await connectorBesu.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.NodeTxPoolAck,
      timeoutMs: 60000,
    },
  });
  const { rawTransaction } = await web3.eth.accounts.signTransaction(
    {
      from: testEthAccount.address,
      to: testEthAccount2.address,
      value: 10e6,
      gas: 1000000,
    },
    testEthAccount.privateKey,
  );

  const txPoolReceipt = await web3.eth.sendSignedTransaction(
    rawTransaction as string,
  );

  if (txPoolReceipt instanceof Error) {
    throw txPoolReceipt;
  }

  const transaction = await web3.eth.getTransaction(
    txPoolReceipt.transactionHash,
  );
  const signData = JWS.sign(transaction.input, keyPairC1);

  const request: SignTransactionRequest = {
    keychainId,
    keychainRef,
    transactionHash: txPoolReceipt.transactionHash,
    nodeHostsProvider: NodeHostsProviderType.ConsortiumPlugin,
    consortiumPluginId: pluginConsortiumId,
    threshold: 50,
  };
  //const api = new BesuApiClient(configuration);

  // Test for 200 valid response test case
  const res = await api.signTransactionV1(request);
  t.ok(res, "API response object is truthy");
  t.ok(res.data, "API response data is truthy");
  t.ok(res.data.signature, "API response data.signature is truthy");

  const referenceVerifyOut = JWS.verify(signData, keyPairC1, {
    complete: true,
    parse: true,
  });
  t.ok(referenceVerifyOut, "referenceVerifyOut truthy OK");

  const responseVerifyOut = JWS.verify(
    Buffer.from(res.data.signature, "hex").toString("utf-8"),
    keyPairC1,
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

test("AFTER Test sign transaction validation", async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
