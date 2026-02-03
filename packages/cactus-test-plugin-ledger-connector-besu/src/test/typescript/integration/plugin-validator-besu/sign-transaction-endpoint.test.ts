import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";
import Web3 from "web3";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger-cacti/cactus-cmd-api-server";
import {
  JsObjectSigner,
  IJsObjectSignerOptions,
  Secp256k1Keys,
  KeyFormat,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";

import {
  BesuTestLedger,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";

import {
  BesuApiClientOptions,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  SignTransactionRequest,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-besu";

import { PluginRegistry } from "@hyperledger-cacti/cactus-core";

import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";
import axios from "axios";

const testCase = "Test sign transaction endpoint";
const logLevel: LogLevelDesc = "TRACE";

describe(testCase, () => {
  const besuTestLedger = new BesuTestLedger();
  let apiServer: ApiServer;

  beforeAll(async () => {
    const pruning = pruneDockerContainersIfGithubAction({ logLevel });
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

    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: keyHex,
      logLevel,
    };
    const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

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
    apiServerOptions.grpcPort = 0;
    apiServerOptions.crpcPort = 0;
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

    console.log(`AddressInfo: ${JSON.stringify(addressInfo1)}`);

    const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
    const web3 = new Web3(web3Provider);

    const besuKeyPair = await besuTestLedger.getBesuKeyPair();

    const besuPrivateKey = besuKeyPair.privateKey.toLowerCase().startsWith("0x")
      ? besuKeyPair.privateKey.substring(2)
      : besuKeyPair.privateKey; // besu node's private key

    const besuAccount = web3.eth.accounts.privateKeyToAccount(
      "0x" + besuPrivateKey,
    );

    web3.eth.accounts.wallet.add(besuAccount);

    const nonce = await web3.eth.getTransactionCount(
      besuAccount.address,
      "latest",
    );

    const signedTx = await besuAccount.signTransaction({
      from: besuAccount.address,
      to: besuAccount.address,
      data: "0x123",
      gas: 1_000_000,
      nonce,
    });

    if (!signedTx.rawTransaction) {
      throw new Error("Failed to sign transaction");
    }

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction,
    );

    const transactionHash = receipt.transactionHash;

    const transaction = await web3.eth.getTransaction(transactionHash);
    const singData = jsObjectSigner.sign(transaction.input);
    const signDataHex = Buffer.from(singData).toString("hex");

    const request: SignTransactionRequest = {
      keychainId,
      keychainRef,
      transactionHash: transactionHash,
    };

    const configuration = new BesuApiClientOptions({ basePath: node1Host });
    const api = new BesuApiClient(configuration);

    const res = await api.signTransactionV1(request);
    expect(res).toBeTruthy();
    expect(signDataHex).toBe(res.data.signature);

    try {
      const notFoundRequest: SignTransactionRequest = {
        keychainId: "fake",
        keychainRef: "fake",
        transactionHash:
          "0x46eac4d1d1ff81837698cbab38862a428ddf042f92855a72010de2771a7b704d",
      };
      await api.signTransactionV1(notFoundRequest);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        expect(error.response?.status).toEqual(404);
        expect(error.response?.statusText).toEqual("Transaction not found");
      }
    }
  });
});
