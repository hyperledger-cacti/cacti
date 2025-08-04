import "jest-extended";
import net from "net";
import {
  startDockerComposeService,
  stopDockerComposeService,
  BesuTestEnvironment,
  EthereumTestEnvironment,
  getTransactRequest,
} from "../../test-utils";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Knex, knex } from "knex";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  TokenType,
} from "../../../../main/typescript";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import axios from "axios";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { knexLocalInstance } from "../../../../main/typescript/database/knexfile";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { TokenType as TokenTypeMain } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { SupportedContractTypes as SupportedEthereumContractTypes } from "../../environments/ethereum-test-environment";
import { SupportedContractTypes as SupportedBesuContractTypes } from "../../environments/ethereum-test-environment";

const PROMETHEUS_URL = "http://localhost:9090";
const LOKI_URL = "http://localhost:3100";
const TEMPO_URL = "http://localhost:3200";
const TIMEOUT = 900000; // 15 minutes

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: true,
});

let knexSourceRemoteClient: Knex;
let knexLocalClient: Knex;
let ethereumEnv: EthereumTestEnvironment;
let besuEnv: BesuTestEnvironment;
let gateway: SATPGateway;

const queryPrometheus = async (metricName: string) => {
  const end = Math.floor(Date.now() / 1000); // now in seconds
  const start = end - 60 * 60; // 1 hour ago
  const step = "10s";

  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: {
        query: metricName,
        start,
        end,
        step,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching metric:", error);
    throw error;
  }
};

function waitForPort(port: number, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const socket = new net.Socket();
      socket
        .setTimeout(1000)
        .once("error", () => retry())
        .once("timeout", () => retry())
        .connect(port, "localhost", () => {
          socket.end();
          resolve();
        });

      function retry() {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 500);
        }
      }
    };

    check();
  });
}

async function waitForMetric(metric: string, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await queryPrometheus(metric);
    if (result.data.result.length > 0) {
      return result;
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error(`Metric ${metric} not found after retries`);
}

/**
 * Executes a transfer of tokens.
 *
 * @param amount - The total amount to transfer.
 * @param transfers - The number of transfers to make.
 * @param amountPerTransfer - The amount to transfer in each individual transfer.
 * @returns {Promise<void>} A promise that resolves when the transfer is complete.
 */
async function executeTransfer(
  amount = "100",
  transfers = 1,
  amountPerTransfer = "100",
) {
  await besuEnv.mintTokens(amount, TokenTypeMain.NONSTANDARD_FUNGIBLE);
  await besuEnv.checkBalance(
    besuEnv.getTestFungibleContractName(),
    besuEnv.getTestFungibleContractAddress(),
    besuEnv.getTestFungibleContractAbi(),
    besuEnv.getTestOwnerAccount(),
    amount,
    besuEnv.getTestOwnerSigningCredential(),
  );

  const factoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };
  const factory = new PluginFactorySATPGateway(factoryOptions);

  const gatewayIdentity = {
    id: "mockID",
    name: "CustomGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    proofID: "mockProofID10",
    address: "http://localhost" as Address,
  } as GatewayIdentity;

  const migrationSource = await createMigrationSource();
  knexLocalClient = knex({
    ...knexLocalInstance.default,
    migrations: {
      migrationSource: migrationSource,
    },
  });
  knexSourceRemoteClient = knex({
    ...knexRemoteInstance.default,
    migrations: {
      migrationSource: migrationSource,
    },
  });
  await knexSourceRemoteClient.migrate.latest();

  const besuNetworkOptions = besuEnv.createBesuConfig();
  const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

  const ontologiesPath = path.join(__dirname, "../../../ontologies");

  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    gid: gatewayIdentity,
    ccConfig: {
      bridgeConfig: [besuNetworkOptions, ethereumNetworkOptions],
    },
    localRepository: knexLocalInstance.default,
    remoteRepository: knexRemoteInstance.default,
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    ontologyPath: ontologiesPath,
    monitorService: monitorService,
  };
  gateway = await factory.create(options);
  expect(gateway).toBeInstanceOf(SATPGateway);

  const identity = gateway.Identity;
  // default servers
  expect(identity.gatewayServerPort).toBe(3010);
  expect(identity.gatewayClientPort).toBe(3011);
  expect(identity.address).toBe("http://localhost");
  await gateway.startup();

  const dispatcher = gateway.BLODispatcherInstance;

  expect(dispatcher).toBeTruthy();
  const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
    networkId: besuEnv.network,
    tokenType: TokenType.Fungible,
  });

  if (!reqApproveBesuAddress?.approveAddress) {
    throw new Error("Approve address is undefined");
  }

  expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

  await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

  if (reqApproveBesuAddress?.approveAddress) {
    await besuEnv.approveAssets(
      reqApproveBesuAddress.approveAddress,
      amount,
      TokenTypeMain.NONSTANDARD_FUNGIBLE,
    );
  } else {
    throw new Error("Approve address is undefined");
  }

  log.debug(`Approved ${amount} amount to the Besu Bridge Address`);

  const reqApproveEthereumAddress = await dispatcher?.GetApproveAddress({
    networkId: ethereumEnv.network,
    tokenType: TokenType.Fungible,
  });

  expect(reqApproveEthereumAddress?.approveAddress).toBeDefined();

  if (!reqApproveEthereumAddress?.approveAddress) {
    throw new Error("Approve address is undefined");
  }

  await ethereumEnv.giveRoleToBridge(reqApproveEthereumAddress?.approveAddress);

  const req = getTransactRequest(
    "mockContext",
    besuEnv,
    ethereumEnv,
    amountPerTransfer,
    amountPerTransfer,
  );

  for (let i = 0; i < transfers; i++) {
    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);
  }
}

beforeAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      console.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  // Start environments
  const erc20TokenContract = "SATPContract";
  ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
    {
      logLevel,
    },
    [
      {
        assetType: SupportedEthereumContractTypes.FUNGIBLE,
        contractName: erc20TokenContract,
      },
    ],
  );
  log.info("Ethereum Ledger started successfully");
  await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);

  besuEnv = await BesuTestEnvironment.setupTestEnvironment(
    {
      logLevel,
    },
    [
      {
        assetType: SupportedBesuContractTypes.FUNGIBLE,
        contractName: erc20TokenContract,
      },
    ],
  );
  console.info("Besu Ledger started successfully");
  await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  // Start monitoring system
  startDockerComposeService("otel-lgtm");
  await executeTransfer("100", 1, "100");
}, TIMEOUT);

afterEach(async () => {
  if (knexLocalClient) {
    await knexLocalClient.destroy();
  }
  if (knexSourceRemoteClient) {
    await knexSourceRemoteClient.destroy();
  }
}, TIMEOUT);

afterAll(async () => {
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();

  if (gateway) {
    await gateway.shutdown();
  }
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  stopDockerComposeService("otel-lgtm");
}, TIMEOUT);

describe("otel-lgtm captures information when a transaction occurs", () => {
  it("otel-lgtm ports should be open", async () => {
    await Promise.all([
      waitForPort(4000),
      waitForPort(4317),
      waitForPort(4318),
      waitForPort(9090),
      waitForPort(3100),
      waitForPort(3200),
    ]);
  });
  it("should capture the transaction metrics using prometheus", async () => {
    // Wait for metrics to be captured
    await new Promise((res) => setTimeout(res, 15000));

    const result = await waitForMetric("initiated_transactions_total");

    const initiatedTransactionsMetric = result.data.result.find(
      (metric: { metric: { __name__: string } }) =>
        metric.metric.__name__ === "initiated_transactions_total",
    );

    // Make sure the metric exists
    expect(initiatedTransactionsMetric).toBeDefined();

    // Check if it has at least one value equal to "1"
    const hasValueOne = initiatedTransactionsMetric.values.some(
      ([, value]: [number, string]) => value === "1",
    );

    expect(hasValueOne).toBe(true);
    //If using these links, please comment the function stopDockerComposeService
    //http://localhost:4000/a/grafana-metricsdrilldown-app/drilldown?nativeHistogramMetric=&layout=grid&filters-rule=&filters-prefix=&filters-suffix=&from=now-6h&to=now&timezone=browser&var-filters=&var-labelsWingman=%28none%29&search_txt=&var-metrics-reducer-sort-by=default&var-ds=prometheus&var-other_metric_filters=
  });

  it("should capture the transaction logs using Loki", async () => {
    const lokiUrl = `${LOKI_URL}/loki/api/v1/query_range`;
    const end = Math.floor(Date.now() / 1000); // now in seconds
    const start = end - 60 * 60; // 1 hour ago
    const params = {
      query: '{service_name="Satp-Hermes-Gateway"}',
      start: start,
      end: end,
      limit: 1000,
      direction: "BACKWARD",
    };

    const response = await axios.get(lokiUrl, { params });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("data");
    expect(response.data.data).toHaveProperty("result");

    const results = response.data.data.result;
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const hasMessage = results.some((stream: { values: [string, string][] }) =>
      stream.values?.some(([, message]) => {
        try {
          const parsed = JSON.parse(message);
          return parsed.length > 0 && parsed[0].trim() !== "";
        } catch {
          return message.trim() !== "";
        }
      }),
    );

    expect(hasMessage).toBe(true);
    //If using these links, please comment the function stopDockerComposeService
    //http://localhost:4000/a/grafana-lokiexplore-app/explore?patterns=%5B%5D&var-primary_label=service_name%7C%3D~%7C.%2B&from=now-6h&to=now&timezone=browser&var-lineFormat=&var-ds=loki&var-filters=&var-fields=&var-levels=&var-metadata=&var-jsonFields=&var-all-fields=&var-patterns=&var-lineFilterV2=&var-lineFilters=&var-filters_replica=
  });
  it("should capture the transaction traces using Tempo", async () => {
    const tempoUrl = `${TEMPO_URL}/api/search`;

    const response = await axios.get(tempoUrl, {});

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("traces");
    expect(response.data).toHaveProperty("metrics");

    const results = response.data.traces;
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    //If using these links, please comment the function stopDockerComposeService
    //http://localhost:4000/a/grafana-exploretraces-app/explore?from=now-3h&to=now&timezone=browser&var-ds=tempo&var-primarySignal=nestedSetParent%3C0&var-filters=&var-metric=rate&var-groupBy=resource.service.name&var-spanListColumns=&var-latencyThreshold=&var-partialLatencyThreshold=&actionView=breakdown
  });
});
