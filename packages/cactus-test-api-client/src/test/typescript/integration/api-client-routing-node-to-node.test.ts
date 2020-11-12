import { AddressInfo } from "net";

import test, { Test } from "tape";
import { v4 as uuidV4 } from "uuid";
import { JWK } from "jose";
import Web3 from "web3";

import { ApiClient } from "@hyperledger/cactus-api-client";
import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import {
  PluginRegistry,
  Consortium,
  Ledger,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import {
  DefaultApi as QuorumApi,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import { QuorumTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";

import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
} from "@hyperledger/cactus-plugin-consortium-manual";

test("Routes to correct node based on ledger ID", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";

  const ledger1: Ledger = {
    id: "my_cool_ledger_that_i_want_to_transact_on",
    ledgerType: LedgerType.QUORUM2X,
  };

  const ledger2: Ledger = {
    id: "other_ledger_that_is_just_taking_up_space",
    ledgerType: LedgerType.QUORUM2X,
  };

  const httpServer1 = await Servers.startOnPreferredPort(4050);
  const addressInfo1 = httpServer1.address() as AddressInfo;
  const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;

  const httpServer2 = await Servers.startOnPreferredPort(4100);
  const addressInfo2 = httpServer2.address() as AddressInfo;
  const node2Host = `http://${addressInfo2.address}:${addressInfo2.port}`;

  const testAccount1 = new Web3().eth.accounts.create(uuidV4());
  let initialFundsAccount1: string;
  const testAccount2 = new Web3().eth.accounts.create(uuidV4());
  let initialFundsAccount2: string;

  const keyPair1 = await JWK.generate("EC", "secp256k1");
  const pubKeyPem1 = keyPair1.toPEM(false);

  const keyPair2 = await JWK.generate("EC", "secp256k1");
  const pubKeyPem2 = keyPair2.toPEM(false);

  const consortiumId = uuidV4();
  const consortiumName = "Example Corp. & Friends Crypto Consortium";
  const memberId1 = uuidV4();
  const memberId2 = uuidV4();
  const consortium: Consortium = {
    id: consortiumId,
    mainApiHost: node1Host,
    name: consortiumName,
    members: [
      {
        id: memberId1,
        name: "Example Corp 1",
        nodes: [
          {
            nodeApiHost: node1Host,
            publicKeyPem: pubKeyPem1,
            consortiumId,
            id: uuidV4(),
            ledgers: [ledger1],
            memberId: memberId1,
            plugins: [],
          },
        ],
      },
      {
        id: memberId2,
        name: "Example Corp 2",
        nodes: [
          {
            nodeApiHost: node2Host,
            publicKeyPem: pubKeyPem2,
            consortiumId,
            id: uuidV4(),
            ledgers: [ledger2],
            memberId: memberId2,
            plugins: [],
          },
        ],
      },
    ],
  };
  const mainApiClient = new ApiClient({ basePath: consortium.mainApiHost });

  test("Set Up Test ledgers, Consortium, Cactus Nodes", async (t2: Test) => {
    const quorumTestLedger1 = new QuorumTestLedger();
    await quorumTestLedger1.start();
    test.onFinish(async () => {
      await quorumTestLedger1.stop();
      await quorumTestLedger1.destroy();
    });
    const rpcApiHttpHost1 = await quorumTestLedger1.getRpcApiHttpHost();

    const { alloc } = await quorumTestLedger1.getGenesisJsObject();

    initialFundsAccount1 = Object.keys(alloc).find(
      (addr) => parseInt(alloc[addr].balance, 10) > 10e7
    ) as string;

    const quorumTestLedger2 = new QuorumTestLedger();
    await quorumTestLedger2.start();
    test.onFinish(async () => {
      await quorumTestLedger2.stop();
      await quorumTestLedger2.destroy();
    });
    const rpcApiHttpHost2 = await quorumTestLedger2.getRpcApiHttpHost();
    initialFundsAccount2 = Object.keys(alloc).find(
      (addr) => parseInt(alloc[addr].balance, 10) > 10e7
    ) as string;

    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const pluginQuorumConnector = new PluginLedgerConnectorQuorum({
        instanceId: uuidV4(),
        rpcApiHttpHost: rpcApiHttpHost1,
        logLevel,
        pluginRegistry: new PluginRegistry(),
      });

      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPair1.toPEM(true),
        consortium,
        logLevel,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);

      const configService = new ConfigService();
      const apiServerOptions = configService.newExampleConfig();
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo1.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      const config = configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);
      pluginRegistry.add(pluginQuorumConnector);

      const apiServer = new ApiServer({
        httpServerApi: httpServer1,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer.start();
      test.onFinish(() => apiServer.shutdown());
    }

    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const pluginQuorumConnector = new PluginLedgerConnectorQuorum({
        instanceId: uuidV4(),
        rpcApiHttpHost: rpcApiHttpHost2,
        logLevel,
        pluginRegistry: new PluginRegistry(),
      });

      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPair2.toPEM(true),
        consortium,
        logLevel,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);

      const configService = new ConfigService();
      const apiServerOptions = configService.newExampleConfig();
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo2.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      const config = configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);
      pluginRegistry.add(pluginQuorumConnector);

      const apiServer = new ApiServer({
        httpServerApi: httpServer2,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer.start();
      test.onFinish(() => apiServer.shutdown());
    }

    t2.end();
  });

  test("ApiClient #1 Routes based on Ledger ID #1", async (t2: Test) => {
    const apiClient1 = await mainApiClient.ofLedger(ledger1.id, QuorumApi);

    // send money to the test account on ledger 1
    const res = await apiClient1.apiV1QuorumRunTransaction({
      transactionConfig: {
        from: initialFundsAccount1,
        to: testAccount1.address,
        value: 10e6,
      },
      web3SigningCredential: {
        ethAccount: initialFundsAccount1,
        secret: "",
        type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
      },
    });

    t2.ok(res, "Test account #1 initial funds response OK");
    t2.ok(res.status > 199, "Test account #1 initial funds status > 199 OK");
    t2.ok(res.status < 300, "Test account #1 initial funds status < 300 OK");

    t2.end();
  });

  test("ApiClient #1 Routes based on Ledger ID #2", async (t2: Test) => {
    const apiClient2 = await mainApiClient.ofLedger(ledger2.id, QuorumApi);

    // send money to the test account on ledger 1
    const res = await apiClient2.apiV1QuorumRunTransaction({
      transactionConfig: {
        from: initialFundsAccount2,
        to: testAccount2.address,
        value: 10e6,
      },
      web3SigningCredential: {
        ethAccount: initialFundsAccount2,
        secret: "",
        type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
      },
    });

    t2.ok(res, "Test account #2 initial funds response OK");
    t2.ok(res.status > 199, "Test account #2 initial funds status > 199 OK");
    t2.ok(res.status < 300, "Test account #2 initial funds status < 300 OK");

    t2.end();
  });

  t.end();
});
