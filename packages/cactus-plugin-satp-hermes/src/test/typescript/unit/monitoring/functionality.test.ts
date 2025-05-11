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
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
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
import {
  knexClientConnection,
  knexSourceRemoteConnection,
} from "../../knex.config";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import axios from "axios";

const PROMETHEUS_URL = "http://localhost:9090";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let knexSourceRemoteInstance: Knex;
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
  ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
    contractName: erc20TokenContract,
    logLevel,
  });
  log.info("Ethereum Ledger started successfully");
  await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);

  besuEnv = await BesuTestEnvironment.setupTestEnvironment({
    contractName: erc20TokenContract,
    logLevel,
  });
  console.info("Besu Ledger started successfully");
  await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  // Start monitoring system
  startDockerComposeService("otel-lgtm");
});

afterAll(async () => {
  if (gateway) {
    if (knexSourceRemoteInstance) {
      await knexSourceRemoteInstance.destroy();
    }
  }

  await gateway.shutdown();
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  stopDockerComposeService("otel-lgtm");
});

describe("otel-lgtm captures metrics when a transaction occurs", () => {
  it("otel-lgtm ports should be open", async () => {
    await Promise.all([
      waitForPort(4000),
      waitForPort(4317),
      waitForPort(4318),
      waitForPort(9090),
    ]);
  });
  it("should capture the transaction metrics using prometheus", async () => {
    // Add 100 tokens to the Besu account
    await besuEnv.mintTokens("100");
    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
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

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

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
      localRepository: knexClientConnection,
      remoteRepository: knexSourceRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
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
      tokenType: TokenType.NonstandardFungible,
    });

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "100");
    } else {
      throw new Error("Approve address is undefined");
    }

    log.debug("Approved 100 amount to the Besu Bridge Address");

    const reqApproveEthereumAddress = await dispatcher?.GetApproveAddress({
      networkId: ethereumEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });

    expect(reqApproveEthereumAddress?.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress?.approveAddress,
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      ethereumEnv,
      "100",
      "100",
    );

    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      reqApproveEthereumAddress?.approveAddress,
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");

    // Wait for metrics to be captured
    await new Promise((res) => setTimeout(res, 15000));

    const result = await waitForMetric("initiated_transfers");
    expect(result.status).toBe("success");
  });
});
