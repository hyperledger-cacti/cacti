import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { AddressInfo } from "net";
import HttpStatus from "http-status-codes";

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
  BesuApiClientOptions,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  ReceiptType,
  RunTransactionRequest,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";

describe("ApiServer:PluginLedgerConnectorBesu", () => {
  const logLevel = "TRACE";
  let apiServer: ApiServer;
  let apiClient: BesuApiClient;
  let ledger: BesuTestLedger;

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();

    // Initialize Besu test ledger
    ledger = new BesuTestLedger({});
    await ledger.start();

    // Setup HTTP server and ApiServer
    const httpServer = createServer();
    await new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.once("listening", resolve);
      httpServer.listen(0, "127.0.0.1");
    });
    const addressInfo = httpServer.address() as AddressInfo;

    const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    const rpcApiWsHost = await ledger.getRpcApiWsHost();

    const pluginRegistry = new PluginRegistry();
    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    const pluginConnectorBesu = new PluginLedgerConnectorBesu(options);
    pluginRegistry.add(pluginConnectorBesu);

    const configService = new ConfigService();
    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = addressInfo.port;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.apiTlsEnabled = false;

    const config = await configService.newExampleConfigConvict(apiSrvOpts);
    apiServer = new ApiServer({
      httpServerApi: httpServer,
      config: config.getProperties(),
      pluginRegistry,
    });

    await apiServer.start();

    const apiClientCfg = new BesuApiClientOptions({
      basePath: `http://${addressInfo.address}:${addressInfo.port}`,
    });
    apiClient = new BesuApiClient(apiClientCfg);
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  test("API server does not crash if backing ledger is unavailable.", async () => {
    const testEthAccount1 = await ledger.createEthTestAccount();
    const testEthAccount2 = await ledger.createEthTestAccount();
    const req: RunTransactionRequest = {
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 10e7,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 5000,
      },
    };

    await ledger.stop();
    await ledger.destroy();

    const runTxRequest = apiClient.runTransactionV1(req);
    await expect(runTxRequest).rejects.toMatchObject({
      response: { status: HttpStatus.SERVICE_UNAVAILABLE },
    });
  });
});
