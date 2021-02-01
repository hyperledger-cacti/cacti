import test, { Test } from "tape";

import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";

import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import {
  JsObjectSigner,
  IJsObjectSignerOptions,
  Secp256k1Keys,
  KeyFormat,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  IPluginHtlcEthBesuOptions,
  PluginHtlcEthBesu,
} from "@hyperledger/cactus-plugin-htlc-eth-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";

test("Test sign transaction endpoint", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");

  const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
  const keyHex = privateKey.toString("hex");
  const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);

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

  const rpcApiHttpHost = "localhost:8545";

  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyHex,
    logLevel,
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  // 3. Instantiate the web service consortium plugin
  const options: IPluginHtlcEthBesuOptions = {
    instanceId: uuidv4(),
    rpcApiHttpHost,
    logLevel,
  };
  const pluginValidatorBesu = new PluginHtlcEthBesu(options);

  // 4. Create the API Server object that we embed in this test
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo1.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);

  const pluginRegistry = new PluginRegistry({ plugins: [pluginValidatorBesu] });

  const apiServer = new ApiServer({
    httpServerApi: httpServer1,
    config: config.getProperties(),
    pluginRegistry,
  });

  // 5. make sure the API server is shut down when the testing if finished.
  test.onFinish(() => apiServer.shutdown());

  // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
  await apiServer.start();
  /*
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
  const singData = jsObjectSigner.sign(transaction.input);
  const signDataHex = Buffer.from(singData).toString("hex");

  const request: SignTransactionRequest = {
    keychainId,
    keychainRef,
    transactionHash: transactionHash,
  };

  const configuration = new Configuration({ basePath: node1Host });
  const api = new DefaultApi(configuration);

  // Test for 200 valid response test case
  const res = await api.signTransactionV1(request);
  t.ok(res, "API response object is truthy");
  t.deepEquals(signDataHex, res.data.signature, "Signature data are equal");

  // Test for 404 Transacation not found test case
  try {
    const notFoundRequest: SignTransactionRequest = {
      keychainId: "fake",
      keychainRef: "fake",
      transactionHash:
        "0x46eac4d1d1ff81837698cbab38862a428ddf042f92855a72010de2771a7b704d",
    };
    await api.signTransactionV1(notFoundRequest);
  } catch (error) {
    t.equal(error.response.status, 404, "HTTP response status are equal");
    t.equal(
      error.response.statusText,
      "Transaction not found",
      "Response text are equal",
    );
  }*/
});
