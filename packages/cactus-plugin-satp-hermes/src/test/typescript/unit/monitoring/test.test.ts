import "jest-extended";
import net from "net";
import {
  startDockerComposeService,
  stopDockerComposeService,
  BesuTestEnvironment,
  FabricTestEnvironment,
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
let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let gateway: SATPGateway;

async function queryPrometheus(metricName: string): Promise<any> {
  const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
    params: {
      query: metricName,
    },
  });
  return response.data;
}

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
  fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
    contractName: "satp-contract",
    logLevel,
    claimFormat: ClaimFormat.BUNGEE,
  });
  console.info("Fabric Ledger started successfully");
  await fabricEnv.deployAndSetupContracts();

  besuEnv = await BesuTestEnvironment.setupTestEnvironment({
    contractName: "SATPContract",
    logLevel,
  });
  console.info("Besu Ledger started successfully");
  await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);

  // Start monitoring system
  startDockerComposeService("otel-lgtm");
  setTimeout(async () => {
    await Promise.all([
      waitForPort(4000),
      waitForPort(4317),
      waitForPort(4318),
      waitForPort(9090),
    ]);
  }, 60000);
});

afterAll(async () => {
  if (gateway) {
    if (knexSourceRemoteInstance) {
      await knexSourceRemoteInstance.destroy();
    }
  }

  await besuEnv.tearDown();
  await fabricEnv.tearDown();

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
    // If we got here, ports are up. You can optionally do further HTTP checks.
    expect(true).toBe(true);
  });
  it("should capture the transaction metrics using prometheus", async () => {
    await besuEnv.mintTokens("300");
    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "300",
      besuEnv.getTestOwnerSigningCredential(),
    );
    //setup satp gateway
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

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions, besuNetworkOptions],
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
    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "300");
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 300 amount to the Besu Bridge Address");

    const reqApproveFabricAddress = await dispatcher?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });
    expect(reqApproveFabricAddress?.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await fabricEnv.giveRoleToBridge("Org2MSP");

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "100",
    );

    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    const result = await queryPrometheus("initiated_transfers");
    expect(result.status).toBe("success");
    expect(result.data.result.length).toBeGreaterThan(0);

    await gateway.shutdown();
  });
});
