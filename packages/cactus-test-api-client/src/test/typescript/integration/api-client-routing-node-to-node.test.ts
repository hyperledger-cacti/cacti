import { AddressInfo } from "net";

import "jest-extended";
import { v4 as uuidV4 } from "uuid";
import { generateKeyPair, exportSPKI, exportPKCS8 } from "jose";
import Web3 from "web3";

import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import {
  CactusNode,
  Configuration,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
  Ledger,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  DefaultApi as BesuApi,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  pruneDockerAllIfGithubAction,
  BesuTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";

import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
} from "@hyperledger/cactus-plugin-consortium-manual";
import { Account } from "web3-core";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "Routes to correct node based on ledger ID";
const testCase1 = "Set Up Test ledgers, Consortium, Cactus Nodes";
const testCase2 = "ApiClient #1 Routes based on Ledger ID #1";
const testCase3 = "ApiClient #1 Routes based on Ledger ID #2";

describe(testCase, () => {
  const besuTestLedger1 = new BesuTestLedger();
  const besuTestLedger2 = new BesuTestLedger();
  let consortiumDatabase: ConsortiumDatabase;
  let mainApiClient: ApiClient;

  let initialFundsAccount1: string;
  let initialFundsAccount2: string;
  let keyPair1: any;
  let keyPair2: any;
  let addressInfo1: AddressInfo;
  let addressInfo2: AddressInfo;
  let httpServer1: any;
  let httpServer2: any;

  let apiServer1: ApiServer;
  let apiServer2: ApiServer;
  let testEthAccount1: Account;

  const ledger1: Ledger = {
    id: "my_cool_ledger_that_i_want_to_transact_on",
    ledgerType: LedgerType.Besu2X,
  };
  const ledger2: Ledger = {
    id: "other_ledger_that_is_just_taking_up_space",
    ledgerType: LedgerType.Besu2X,
  };

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy;
  });

  beforeAll(async () => {
    await besuTestLedger1.start();
    await besuTestLedger2.start();

    testEthAccount1 = await besuTestLedger1.createEthTestAccount();

    httpServer1 = await Servers.startOnPreferredPort(4050);
    addressInfo1 = httpServer1.address() as AddressInfo;
    const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;

    httpServer2 = await Servers.startOnPreferredPort(4100);
    addressInfo2 = httpServer2.address() as AddressInfo;
    const node2Host = `http://${addressInfo2.address}:${addressInfo2.port}`;

    keyPair1 = await generateKeyPair("ES256K");
    const pubKeyPem1 = await exportSPKI(keyPair1.publicKey);

    keyPair2 = await generateKeyPair("ES256K");
    const pubKeyPem2 = await exportSPKI(keyPair2.publicKey);

    const consortiumId = uuidV4();
    const consortiumName = "Example Corp. & Friends Crypto Consortium";
    const memberId1 = uuidV4();
    const memberId2 = uuidV4();

    const node1: CactusNode = {
      nodeApiHost: node1Host,
      publicKeyPem: pubKeyPem1,
      consortiumId,
      id: uuidV4(),
      ledgerIds: [ledger1.id],
      memberId: memberId1,
      pluginInstanceIds: [],
    };

    const member1: ConsortiumMember = {
      id: memberId1,
      name: "Example Corp 1",
      nodeIds: [node1.id],
    };

    const node2: CactusNode = {
      nodeApiHost: node2Host,
      publicKeyPem: pubKeyPem2,
      consortiumId,
      id: uuidV4(),
      ledgerIds: [ledger2.id],
      memberId: memberId2,
      pluginInstanceIds: [],
    };

    const member2: ConsortiumMember = {
      id: memberId2,
      name: "Example Corp 2",
      nodeIds: [node2.id],
    };

    const consortium: Consortium = {
      id: consortiumId,
      mainApiHost: node1Host,
      name: consortiumName,
      memberIds: [member1.id, member2.id],
    };

    consortiumDatabase = {
      cactusNode: [node1, node2],
      consortium: [consortium],
      consortiumMember: [member1, member2],
      ledger: [ledger1, ledger2],
      pluginInstance: [],
    };

    const config = new Configuration({ basePath: consortium.mainApiHost });
    mainApiClient = new ApiClient(config);
  });

  afterAll(async () => {
    await besuTestLedger1.stop();
    await besuTestLedger1.destroy();
    await besuTestLedger2.stop();
    await besuTestLedger2.destroy();
    await apiServer1.shutdown();
    await apiServer2.shutdown();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  test(testCase1, async () => {
    const rpcApiHttpHost1 = await besuTestLedger1.getRpcApiHttpHost();
    const rpcApiWsHost1 = await besuTestLedger1.getRpcApiWsHost();

    initialFundsAccount1 = besuTestLedger1.getGenesisAccountPubKey();

    const rpcApiHttpHost2 = await besuTestLedger2.getRpcApiHttpHost();
    const rpcApiWsHost2 = await besuTestLedger2.getRpcApiWsHost();

    initialFundsAccount2 = besuTestLedger2.getGenesisAccountPubKey();

    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const pluginBesuConnector = new PluginLedgerConnectorBesu({
        instanceId: uuidV4(),
        rpcApiHttpHost: rpcApiHttpHost1,
        rpcApiWsHost: rpcApiWsHost1,
        logLevel,
        pluginRegistry: new PluginRegistry(),
      });

      const keyPairPem = await exportPKCS8(keyPair1.privateKey);
      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPairPem,
        consortiumDatabase,
        logLevel,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);

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
      apiServerOptions.crpcPort = 0;
      const config =
        await configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);
      pluginRegistry.add(pluginBesuConnector);

      apiServer1 = new ApiServer({
        httpServerApi: httpServer1,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer1.start();
    }

    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const pluginBesuConnector = new PluginLedgerConnectorBesu({
        instanceId: uuidV4(),
        rpcApiHttpHost: rpcApiHttpHost2,
        rpcApiWsHost: rpcApiWsHost2,
        logLevel,
        pluginRegistry: new PluginRegistry(),
      });

      const keyPairPem = await exportPKCS8(keyPair2.privateKey);
      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPairPem,
        consortiumDatabase,
        logLevel,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);

      const configService = new ConfigService();
      const apiServerOptions = await configService.newExampleConfig();
      apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo2.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.grpcPort = 0;
      apiServerOptions.crpcPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      apiServerOptions.plugins = [];
      apiServerOptions.crpcPort = 0;
      const config =
        await configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);
      pluginRegistry.add(pluginBesuConnector);

      apiServer2 = new ApiServer({
        httpServerApi: httpServer2,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer2.start();
      // test.onFinish(() => apiServer.shutdown());
      // afterAll(async () => await apiServer.shutdown());
    }
  });
  test(testCase2, async () => {
    const apiClient1 = await mainApiClient.ofLedger(ledger1.id, BesuApi, {});
    const testAccount1 = new Web3().eth.accounts.create(uuidV4());
    const res = await apiClient1.runTransactionV1({
      transactionConfig: {
        from: initialFundsAccount1,
        to: testAccount1.address,
        value: 10e6,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });

    expect(res).toBeTruthy();
    expect(res.status).toBeGreaterThan(199);
    expect(res.status).toBeLessThan(300);
  });

  test(testCase3, async () => {
    const apiClient2 = await mainApiClient.ofLedger(ledger2.id, BesuApi, {});
    const testAccount2 = new Web3().eth.accounts.create(uuidV4());
    const res = await apiClient2.runTransactionV1({
      transactionConfig: {
        from: initialFundsAccount2,
        to: testAccount2.address,
        value: 10e6,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      web3SigningCredential: {
        ethAccount: initialFundsAccount2,
        secret: besuTestLedger2.getGenesisAccountPrivKey(),
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(res).toBeTruthy();
    expect(res.status).toBeGreaterThan(199);
    expect(res.status).toBeLessThan(300);
  });
});
