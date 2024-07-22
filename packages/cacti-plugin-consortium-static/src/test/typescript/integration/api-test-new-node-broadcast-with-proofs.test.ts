import { AddressInfo } from "net";

import "jest-extended";
import { v4 as uuidV4 } from "uuid";
import { generateKeyPair, exportSPKI, exportPKCS8 } from "jose";

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
import { DefaultApi as ConsortiumStaticApi } from "../../../main/typescript";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  pruneDockerAllIfGithubAction,
  BesuTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";

import {
  IPluginConsortiumStaticOptions,
  PluginConsortiumStatic,
} from "../../../main/typescript";
import { K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";
import {
  IPolicyGroupOptions,
  PolicyGroup,
} from "../../../main/typescript/policy-model/policy-group";
import {
  generateES256JWK,
  issueOrgToken,
} from "../../../main/typescript/utils";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "Broadcasts new node request to all consortium";
const testCase1 = "Set Up Test ledgers, Consortium, Cactus Nodes";

describe(testCase, () => {
  const besuTestLedger1 = new BesuTestLedger();
  const besuTestLedger2 = new BesuTestLedger();
  let consortiumDatabase: ConsortiumDatabase;
  let mainApiClient: ApiClient;

  let keyPair1: any;
  let keyPair2: any;
  let keyPair3: any;
  let addressInfo1: AddressInfo;
  let addressInfo2: AddressInfo;
  let addressInfo3: AddressInfo;
  let httpServer1: any;
  let httpServer2: any;
  let httpServer3: any;

  let node1: CactusNode;
  let node2: CactusNode;
  let node3: CactusNode;
  let consortium: Consortium;
  let member1: ConsortiumMember;
  let member2: ConsortiumMember;

  let apiServer1: ApiServer;
  let apiServer2: ApiServer;
  let apiServer3: ApiServer;

  let pluginConsortiumStatic1: PluginConsortiumStatic;
  let pluginConsortiumStatic2: PluginConsortiumStatic;
  let pluginConsortiumStatic3: PluginConsortiumStatic;

  let entitiesJWK: any;
  let entity1JWK: any;
  let entity2JWK: any;

  const sourcePolicyOptions: IPolicyGroupOptions = {
    role: "Base",
    name: "Root Policy group",
    caption: "P Root",
    description: "This is a mock policy group with no use",
    id: "someId",
  };
  const secondPolicyOptions: IPolicyGroupOptions = {
    role: "second",
    name: "second Policy group",
    caption: "lvl 2",
    description: "This is a mock policy group with no use",
    id: "someId2",
  };
  const thirdPolicyOptions: IPolicyGroupOptions = {
    role: "third",
    name: "third Policy group",
    caption: "lvl 3",
    description: "This is a mock policy group with no use",
    id: "someId3",
  };
  const sourcePolicy1: PolicyGroup = new PolicyGroup(sourcePolicyOptions);
  const sourcePolicy2: PolicyGroup = new PolicyGroup(sourcePolicyOptions);
  const sourcePolicy3: PolicyGroup = new PolicyGroup(sourcePolicyOptions);
  const secondPolicy1: PolicyGroup = new PolicyGroup(secondPolicyOptions);
  const secondPolicy2: PolicyGroup = new PolicyGroup(secondPolicyOptions);
  const secondPolicy3: PolicyGroup = new PolicyGroup(secondPolicyOptions);
  const thirdPolicy1: PolicyGroup = new PolicyGroup(thirdPolicyOptions);
  const thirdPolicy2: PolicyGroup = new PolicyGroup(thirdPolicyOptions);
  const thirdPolicy3: PolicyGroup = new PolicyGroup(thirdPolicyOptions);

  secondPolicy1.addGroup(thirdPolicy1);
  sourcePolicy1.addGroup(secondPolicy1);

  secondPolicy2.addGroup(thirdPolicy2);
  sourcePolicy2.addGroup(secondPolicy2);

  secondPolicy3.addGroup(thirdPolicy3);
  sourcePolicy3.addGroup(secondPolicy3);

  const packageConfigs = {
    "@hyperledger/cactus-api-server": {
      apiTlsEnabled: false,
    },
  };

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

    httpServer1 = await Servers.startOnPreferredPort(4050);
    addressInfo1 = httpServer1.address() as AddressInfo;
    const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;

    httpServer2 = await Servers.startOnPreferredPort(4100);
    addressInfo2 = httpServer2.address() as AddressInfo;
    const node2Host = `http://${addressInfo2.address}:${addressInfo2.port}`;

    httpServer3 = await Servers.startOnPreferredPort(4150);
    addressInfo3 = httpServer2.address() as AddressInfo;
    const node3Host = `http://${addressInfo2.address}:${addressInfo2.port}`;

    keyPair1 = await generateKeyPair("ES256K");
    const pubKeyPem1 = await exportSPKI(keyPair1.publicKey);

    keyPair2 = await generateKeyPair("ES256K");
    const pubKeyPem2 = await exportSPKI(keyPair2.publicKey);

    keyPair3 = await generateKeyPair("ES256K");
    const pubKeyPem3 = await exportSPKI(keyPair3.publicKey);

    const consortiumId = uuidV4();
    const consortiumName = "Example Corp. & Friends Crypto Consortium";
    const memberId1 = uuidV4();
    const memberId2 = uuidV4();

    node1 = {
      nodeApiHost: node1Host,
      publicKeyPem: pubKeyPem1,
      consortiumId,
      id: uuidV4(),
      ledgerIds: [ledger1.id],
      memberId: memberId1,
      pluginInstanceIds: [],
    };

    member1 = {
      id: memberId1,
      name: "Example Corp 1",
      nodeIds: [node1.id],
    };

    entity1JWK = await generateES256JWK();

    node2 = {
      nodeApiHost: node2Host,
      publicKeyPem: pubKeyPem2,
      consortiumId,
      id: uuidV4(),
      ledgerIds: [ledger2.id],
      memberId: memberId2,
      pluginInstanceIds: [],
    };

    member2 = {
      id: memberId2,
      name: "Example Corp 2",
      nodeIds: [],
    };

    entity2JWK = await generateES256JWK();
    entitiesJWK = { [memberId1]: entity1JWK.pub, [memberId2]: entity2JWK.pub };

    node3 = {
      nodeApiHost: node3Host,
      publicKeyPem: pubKeyPem3,
      consortiumId,
      id: uuidV4(),
      ledgerIds: [ledger2.id],
      memberId: memberId2,
      pluginInstanceIds: [],
    };

    consortium = {
      id: consortiumId,
      mainApiHost: node1Host,
      name: consortiumName,
      memberIds: [member1.id, member2.id],
    };

    consortiumDatabase = {
      cactusNode: [node1],
      consortium: [consortium],
      consortiumMember: [member1, member2],
      ledger: [ledger1],
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
    await apiServer3.shutdown();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  test(testCase1, async () => {
    const rpcApiHttpHost1 = await besuTestLedger1.getRpcApiHttpHost();
    const rpcApiWsHost1 = await besuTestLedger1.getRpcApiWsHost();

    const rpcApiHttpHost2 = await besuTestLedger2.getRpcApiHttpHost();
    const rpcApiWsHost2 = await besuTestLedger2.getRpcApiWsHost();

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
      const pub = await exportSPKI(keyPair1.publicKey);

      const options: IPluginConsortiumStaticOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPairPem,
        keyPairPub: pub,
        consortiumDatabase: consortiumDatabase,
        node: node1,
        ledgers: [ledger1],
        pluginInstances: [],
        rootPolicyGroup: sourcePolicy1,
        packageConfigs,
        memberId: member1.id,
        logLevel,
        entitiesJWK,
      };
      pluginConsortiumStatic1 = new PluginConsortiumStatic(options);

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

      pluginRegistry.add(pluginConsortiumStatic1);
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

      const consortiumDatabase1 = {
        cactusNode: [],
        consortium: [],
        consortiumMember: [],
        ledger: [],
        pluginInstance: [],
      };

      const keyPairPem = await exportPKCS8(keyPair2.privateKey);
      const pub = await exportSPKI(keyPair2.publicKey);

      const options: IPluginConsortiumStaticOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPairPem,
        keyPairPub: pub,
        consortiumDatabase: consortiumDatabase1,
        node: node2,
        ledgers: [ledger2],
        rootPolicyGroup: sourcePolicy2,
        packageConfigs,
        pluginInstances: [],
        memberId: member2.id,
        logLevel,
        entitiesJWK,
      };
      pluginConsortiumStatic2 = new PluginConsortiumStatic(options);

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

      pluginRegistry.add(pluginConsortiumStatic2);
      pluginRegistry.add(pluginBesuConnector);

      apiServer2 = new ApiServer({
        httpServerApi: httpServer2,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer2.start();

      const consortApi = mainApiClient.extendWith(ConsortiumStaticApi);

      const jwt = await issueOrgToken(
        entity2JWK.priv,
        {
          iss: member2.name,
          exp: Date.now() + 5 * 60 * 1000, //expires in 5min
        },
        member2.id,
        pub,
      );
      await pluginConsortiumStatic2.joinConsortium(consortApi, jwt);

      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        " Total cactus node count\n" +
        "# TYPE " +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        " gauge\n" +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        '{type="' +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        '"} 2';
      const res1 = await pluginConsortiumStatic1.getPrometheusExporterMetrics();
      const res2 = await pluginConsortiumStatic2.getPrometheusExporterMetrics();
      expect(res1).toEqual(promMetricsOutput);
      expect(res2).toEqual(promMetricsOutput);
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

      const consortiumDatabase1 = {
        cactusNode: [],
        consortium: [],
        consortiumMember: [],
        ledger: [],
        pluginInstance: [],
      };

      const keyPairPem = await exportPKCS8(keyPair3.privateKey);
      const pub = await exportSPKI(keyPair3.publicKey);

      const options: IPluginConsortiumStaticOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPairPem,
        keyPairPub: pub,
        consortiumDatabase: consortiumDatabase1,
        node: node3,
        rootPolicyGroup: sourcePolicy3,
        packageConfigs,
        ledgers: [ledger2],
        pluginInstances: [],
        memberId: member2.id,
        logLevel,
        entitiesJWK,
      };
      pluginConsortiumStatic3 = new PluginConsortiumStatic(options);

      const configService = new ConfigService();
      const apiServerOptions = await configService.newExampleConfig();
      apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo3.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.grpcPort = 0;
      apiServerOptions.crpcPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      apiServerOptions.plugins = [];
      apiServerOptions.crpcPort = 0;
      const config =
        await configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumStatic3);
      pluginRegistry.add(pluginBesuConnector);

      apiServer3 = new ApiServer({
        httpServerApi: httpServer3,
        config: config.getProperties(),
        pluginRegistry,
      });

      await apiServer3.start();

      const consortApi = mainApiClient.extendWith(ConsortiumStaticApi);
      const jwt = await issueOrgToken(
        entity2JWK.priv,
        {
          iss: member2.name,
          exp: Date.now() + 5 * 60 * 1000, //expires in 5min
        },
        member2.id,
        pub,
      );
      await pluginConsortiumStatic3.joinConsortium(consortApi, jwt);
    }
    {
      //final test
      const res1 = await pluginConsortiumStatic1.getPrometheusExporterMetrics();
      const res2 = await pluginConsortiumStatic2.getPrometheusExporterMetrics();
      const res3 = await pluginConsortiumStatic3.getPrometheusExporterMetrics();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        " Total cactus node count\n" +
        "# TYPE " +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        " gauge\n" +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        '{type="' +
        K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT +
        '"} 3';

      //all plugins have consortium updated
      expect(res1.includes(promMetricsOutput)).toBeTruthy();
      expect(res2.includes(promMetricsOutput)).toBeTruthy();
      expect(res3.includes(promMetricsOutput)).toBeTruthy();
    }
  });
});
