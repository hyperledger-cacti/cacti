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
  DefaultApi as QuorumApi,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import {
  pruneDockerAllIfGithubAction,
  QuorumTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";

import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
} from "@hyperledger/cactus-plugin-consortium-manual";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "Routes to correct node based on ledger ID";
const testCase1 = "Set Up Test ledgers, Consortium, Cactus Nodes";
const testCase2 = "ApiClient #1 Routes based on Ledger ID #1";
const testCase3 = "ApiClient #1 Routes based on Ledger ID #2";

describe(testCase, () => {
  const quorumTestLedger1 = new QuorumTestLedger();
  const quorumTestLedger2 = new QuorumTestLedger();
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

  const ledger1: Ledger = {
    id: "my_cool_ledger_that_i_want_to_transact_on",
    ledgerType: LedgerType.Quorum2X,
  };
  const ledger2: Ledger = {
    id: "other_ledger_that_is_just_taking_up_space",
    ledgerType: LedgerType.Quorum2X,
  };

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy;
  });

  //scope just for the awaits
  // test(testCase, async (t: Test) => {
  beforeAll(async () => {
    await quorumTestLedger1.start();
    await quorumTestLedger2.start();

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
    await quorumTestLedger1.stop();
    await quorumTestLedger1.destroy();
    await quorumTestLedger2.stop();
    await quorumTestLedger2.destroy();
    await apiServer1.shutdown();
    await apiServer2.shutdown();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  test(testCase1, async () => {
    const rpcApiHttpHost1 = await quorumTestLedger1.getRpcApiHttpHost();

    const { alloc } = await quorumTestLedger1.getGenesisJsObject();

    initialFundsAccount1 = Object.keys(alloc).find(
      (addr) => parseInt(alloc[addr].balance, 10) > 10e7,
    ) as string;

    const rpcApiHttpHost2 = await quorumTestLedger2.getRpcApiHttpHost();
    initialFundsAccount2 = Object.keys(alloc).find(
      (addr) => parseInt(alloc[addr].balance, 10) > 10e7,
    ) as string;

    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const pluginQuorumConnector = new PluginLedgerConnectorQuorum({
        instanceId: uuidV4(),
        rpcApiHttpHost: rpcApiHttpHost1,
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
      apiServerOptions.apiTlsEnabled = false;
      const config = await configService.newExampleConfigConvict(
        apiServerOptions,
      );

      pluginRegistry.add(pluginConsortiumManual);
      pluginRegistry.add(pluginQuorumConnector);

      apiServer1 = new ApiServer({
        httpServerApi: httpServer1,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer1.start();
    }

    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const pluginQuorumConnector = new PluginLedgerConnectorQuorum({
        instanceId: uuidV4(),
        rpcApiHttpHost: rpcApiHttpHost2,
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
      apiServerOptions.apiTlsEnabled = false;
      const config = await configService.newExampleConfigConvict(
        apiServerOptions,
      );

      pluginRegistry.add(pluginConsortiumManual);
      pluginRegistry.add(pluginQuorumConnector);

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
    const apiClient1 = await mainApiClient.ofLedger(ledger1.id, QuorumApi, {});
    const testAccount1 = new Web3().eth.accounts.create(uuidV4());
    const res = await apiClient1.runTransactionV1({
      transactionConfig: {
        from: initialFundsAccount1,
        to: testAccount1.address,
        value: 10e6,
      },
      web3SigningCredential: {
        ethAccount: initialFundsAccount1,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    expect(res).toBeTruthy();
    expect(res.status).toBeGreaterThan(199);
    expect(res.status).toBeLessThan(300);
  });

  test(testCase3, async () => {
    const apiClient2 = await mainApiClient.ofLedger(ledger2.id, QuorumApi, {});
    const testAccount2 = new Web3().eth.accounts.create(uuidV4());
    const res = await apiClient2.runTransactionV1({
      transactionConfig: {
        from: initialFundsAccount2,
        to: testAccount2.address,
        value: 10e6,
      },
      web3SigningCredential: {
        ethAccount: initialFundsAccount2,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(res).toBeTruthy();
    expect(res.status).toBeGreaterThan(199);
    expect(res.status).toBeLessThan(300);
  });
});
