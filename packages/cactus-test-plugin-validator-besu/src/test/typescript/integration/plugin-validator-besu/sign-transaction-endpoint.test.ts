import test, { Test } from "tape";

import crypto from "crypto";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";
import secp256k1 from "secp256k1";
import Web3 from "web3";
import EEAClient, { IWeb3InstanceExtended } from "web3-eea";

import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import {
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { Configuration, ApiClient } from "@hyperledger/cactus-api-client";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  IPluginValidatorBesuOptions,
  PluginValidatorBesu,
  DefaultApi,
  SignTransactionRequest,
  SignTransactionResponse,
} from "@hyperledger/cactus-plugin-validator-besu";
import { PluginRegistry } from "@hyperledger/cactus-core-api";

test("Test sign transaction endpoint", async (t: Test) => {
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
  };

  test.onFinish(tearDown);

  const rcpHttpHost = await besuTestLedger.getRpcApiHttpHost();

  let privKey: any;
  // generate secp256K1 private key
  do {
    privKey = crypto.randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privKey));
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const pemPrivate = keyEncoder.encodePrivate(
    privKey.toString("hex"),
    "raw",
    "pem"
  );

  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: privKey,
    logLevel: "INFO",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  {
    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    const pluginRegistry = new PluginRegistry({ plugins: [] });

    // 3. Instantiate the web service consortium plugin
    const options: IPluginValidatorBesuOptions = {
      rpcApiHttpHost: rcpHttpHost,
      keyPairPem: pemPrivate,
      pluginRegistry,
      logLevel: "trace",
    };
    const pluginValidatorBesu = new PluginValidatorBesu(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const apiServerOptions = configService.newExampleConfig();
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfo1.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(apiServerOptions);

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

    const web3Provider = new Web3.providers.HttpProvider(rcpHttpHost);
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

    const txHash = await web3Eea.eea.sendRawTransaction(contractOptions);

    const transaction = await web3.eth.getTransaction(txHash);
    const singData = jsObjectSigner.sign(transaction.input);
    const signDataHex = Buffer.from(singData).toString("hex");

    const request: SignTransactionRequest = { transactionHash: txHash };

    const configuration = new Configuration({ basePath: node1Host });
    const api = new ApiClient(configuration).extendWith(DefaultApi);

    // Test for 200 valid response test case
    const res = await api.apiV1PluginsHyperledgerCactusPluginValidatorBesuSignTransactionPost(
      request
    );
    t.ok(res, "API response object is truthy");
    t.deepEquals(signDataHex, res.data.signature, "Signature data are equal");

    // Test for 404 Transacation not found test case
    try {
      const notFoundRequest: SignTransactionRequest = {
        transactionHash:
          "0x46eac4d1d1ff81837698cbab38862a428ddf042f92855a72010de2771a7b704d",
      };
      const notFoundResponse = await api.apiV1PluginsHyperledgerCactusPluginValidatorBesuSignTransactionPost(
        notFoundRequest
      );
    } catch (error) {
      t.equal(error.response.status, 404, "HTTP response status are equal");
      t.equal(
        error.response.statusText,
        "Transaction not found",
        "Response text are equal"
      );
    }
  }
});
