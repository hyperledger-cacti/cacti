import "jest-extended";

import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import KeyEncoder from "key-encoder";
import { AddressInfo } from "net";

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
  GetBlockV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

const testCase = "Test get block endpoint";
const logLevel: LogLevelDesc = "INFO";

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

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
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

    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    const pluginRegistry = new PluginRegistry({ plugins: [keychain] });

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

    // 5. make sure the API server is shut down when the testing if finished.

    // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
    console.log(`AddressInfo: ${JSON.stringify(addressInfo1)}`);

    const request: GetBlockV1Request = {
      blockHashOrBlockNumber: 0,
    };

    const configuration = new BesuApiClientOptions({ basePath: node1Host });
    const api = new BesuApiClient(configuration);

    // Test for 200 valid response test case
    const res = await api.getBlockV1(request);

    const { status, data } = res;

    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);
    expect(data).toBeTruthy();
    expect(data.block).toBeObject();
  });
});
