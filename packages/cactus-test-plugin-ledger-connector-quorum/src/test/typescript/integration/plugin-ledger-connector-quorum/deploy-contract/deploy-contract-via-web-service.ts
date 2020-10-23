// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import axios, { AxiosResponse } from "axios";
import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
} from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { PluginLedgerConnectorQuorum } from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import {
  ApiServer,
  ConfigService,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";
import { ICactusPlugin, PluginRegistry } from "@hyperledger/cactus-core-api";
import { PluginKVStorageMemory } from "@hyperledger/cactus-plugin-kv-storage-memory";
import {
  DefaultApi,
  Configuration,
  HealthCheckResponse,
} from "@hyperledger/cactus-api-client";

const log: Logger = LoggerProvider.getOrCreate({
  label: "test-deploy-contract-via-web-service",
  level: "trace",
});

tap.test(
  "pulls up API server and deploys contract via REST API",
  async (assert: any) => {
    // 1. Instantiate a ledger object
    const quorumTestLedger = new QuorumTestLedger();
    assert.tearDown(() => quorumTestLedger.stop());
    assert.tearDown(() => quorumTestLedger.destroy());
    // 2. Start the actual ledger
    await quorumTestLedger.start();

    // 3. Gather parameteres needed to run an embedded ApiServer which can connect to/interact with said ledger
    const rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();

    const configService = new ConfigService();
    const cactusApiServerOptions: ICactusApiServerOptions = configService.newExampleConfig();
    cactusApiServerOptions.configFile = "";
    cactusApiServerOptions.apiCorsDomainCsv = "*";
    cactusApiServerOptions.apiTlsEnabled = false;
    cactusApiServerOptions.apiPort = 0;
    const config = configService.newExampleConfigConvict(
      cactusApiServerOptions
    );
    const plugins: ICactusPlugin[] = [];

    const kvStoragePlugin = new PluginKVStorageMemory({ backend: new Map() });
    plugins.push(kvStoragePlugin);

    const ledgerConnectorQuorum = new PluginLedgerConnectorQuorum({
      rpcApiHttpHost,
    });
    plugins.push(ledgerConnectorQuorum);
    const pluginRegistry = new PluginRegistry({ plugins });

    const apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });
    assert.tearDown(() => apiServer.shutdown());

    // 4. Start the API server which now is connected to the quorum ledger
    const out = await apiServer.start();
    log.debug(`ApiServer.started OK:`, out);

    // 5. Find a high net worth account in the genesis object of the quorum ledger
    const quorumGenesisOptions: IQuorumGenesisOptions = await quorumTestLedger.getGenesisJsObject();
    assert.ok(quorumGenesisOptions);
    assert.ok(quorumGenesisOptions.alloc);

    const highNetWorthAccounts: string[] = Object.keys(
      quorumGenesisOptions.alloc
    ).filter((address: string) => {
      const anAccount: IAccount = quorumGenesisOptions.alloc[address];
      const balance: number = parseInt(anAccount.balance, 10);
      return balance > 10e7;
    });
    const [firstHighNetWorthAccount] = highNetWorthAccounts;

    // 6. Instantiate the SDK dynamically with whatever port the API server ended up bound to (port 0)
    const httpServer = apiServer.getHttpServerApi();
    const addressInfo: any = httpServer?.address();
    log.debug(`AddressInfo: `, addressInfo);
    const protocol = config.get("apiTlsEnabled") ? "https:" : "http:";
    const basePath = `${protocol}//${addressInfo.address}:${addressInfo.port}`;
    log.debug(`SDK base path: %s`, basePath);

    const configuration = new Configuration({ basePath });
    const api = new DefaultApi(configuration);

    // 7. Issue an API call to the API server via the SDK verifying that the SDK and the API server both work
    const healthcheckResponse: AxiosResponse<HealthCheckResponse> = await api.apiV1ApiServerHealthcheckGet();
    assert.ok(healthcheckResponse);
    assert.ok(healthcheckResponse.data);
    assert.ok(healthcheckResponse.data.success);
    assert.ok(healthcheckResponse.data.memoryUsage);
    assert.ok(healthcheckResponse.data.createdAt);

    // 8. Assemble request to invoke the deploy contract method of the quorum ledger connector plugin via the REST API
    const bodyObject = {
      ethAccountUnlockPassword: "",
      fromAddress: firstHighNetWorthAccount,
      contractJsonArtifact: HelloWorldContractJson,
    };
    const pluginId = ledgerConnectorQuorum.getId();
    const url = `${basePath}/api/v1/plugins/${pluginId}/contract/deploy`;
    // 9. Deploy smart contract by issuing REST API call
    // TODO: Make this part of the SDK so that manual request assembly is not required. Should plugins have their own SDK?
    const response2 = await axios.post(url, bodyObject, {});
    assert.ok(response2, "Response for contract deployment is truthy");
    assert.ok(
      response2.status > 199 && healthcheckResponse.status < 300,
      "Response status code for contract deployment is 2xx"
    );
    assert.end();
  }
);
