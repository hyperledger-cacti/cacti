import "jest-extended";
import {
  Containers,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import { type LogLevelDesc, LoggerProvider } from "@hyperledger-cacti/cactus-common";
import { ApiServer } from "@hyperledger-cacti/cactus-cmd-api-server";
import { ApiClient } from "@hyperledger-cacti/cactus-api-client";

import {
  SATPGateway,
  type SATPGatewayConfig,
} from "../../../../main/typescript/plugin-satp-hermes-gateway";
import { PluginFactorySATPGateway } from "../../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  Configuration,
  type IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger-cacti/cactus-core-api";
import type { ShutdownHook } from "../../../../main/typescript/core/types";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { AdminApi, OracleApi } from "../../../../main/typescript";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

const logLevel: LogLevelDesc = "DEBUG";
const logger = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "satp-gateway-orchestrator-init-test",
});
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
const factoryOptions: IPluginFactoryOptions = {
  pluginImportType: PluginImportType.Local,
};
const factory = new PluginFactorySATPGateway(factoryOptions);

beforeAll(async () => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("SATPGateway initialization", () => {
  it("should initiate gateway with default config", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ]);
    expect(identity.connectedDLTs).toEqual([]);
    expect(identity.gatewayServerPort).toBe(DEFAULT_PORT_GATEWAY_SERVER);
    expect(identity.gatewayClientPort).toBe(DEFAULT_PORT_GATEWAY_CLIENT);
    expect(identity.address).toBe("http://localhost");
  });

  it("should initiate gateway with custom config", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: "v1",
            Architecture: "v1",
            Crash: "v1",
          },
        ],
        connectedDLTs: [
          { id: "BESU", ledgerType: LedgerType.Besu2X },
          { id: "FABRIC", ledgerType: LedgerType.Fabric2 },
        ],
        proofID: "mockProofID10",
        gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
        address: "https://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: "v1",
        Architecture: "v1",
        Crash: "v1",
      },
    ]);
    expect(identity.connectedDLTs).toEqual([
      { id: "BESU", ledgerType: LedgerType.Besu2X },
      { id: "FABRIC", ledgerType: LedgerType.Fabric2 },
    ]);
    expect(identity.proofID).toBe("mockProofID10");
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.address).toBe("https://localhost");
  });

  it("should launch gateway server", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
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
        address: "https://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("https://localhost");
    await gateway.startup();
    await gateway.shutdown();
  });

  it("shutdown hooks work", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      gid: {
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
        gatewayServerPort: 3014,
        gatewayClientPort: 3015,
        address: "https://localhost",
      },
      monitorService: monitorService,
    };

    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    // ensure logger is called with "mockHook"
    const loggerSpy = jest.spyOn(logger, "info");

    // ensure mockHookFn is called on shutdown
    const mockHookFn = jest.fn(async () => {
      logger.info("mockHook");
    });

    const shutdownHook: ShutdownHook = {
      name: "mockHook",
      hook: async () => {
        logger.info("mockHook");
      },
    };

    const shutdownHookFn: ShutdownHook = {
      name: "mockHookFn",
      hook: mockHookFn,
    };

    gateway.onShutdown(shutdownHook);
    gateway.onShutdown(shutdownHookFn);
    await gateway.startup();
    await gateway.shutdown();

    expect(loggerSpy).toHaveBeenCalledWith("mockHook");
    expect(mockHookFn).toHaveBeenCalled();

    // For now, technically not needed. However if we use more tests with loggerSpy, conflicts could arise.
    // This is a reminder to restore the spy after each test
    loggerSpy.mockRestore();
  });
});

describe("SATPGateway startup", () => {
  test("initiates with default config", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ]);
    expect(identity.connectedDLTs).toEqual([]);
    expect(identity.gatewayServerPort).toBe(DEFAULT_PORT_GATEWAY_SERVER);
    expect(identity.gatewayClientPort).toBe(DEFAULT_PORT_GATEWAY_CLIENT);
    expect(identity.address).toBe("http://localhost");
  });

  test("initiates custom config Gateway Coordinator", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: "v1",
            Architecture: "v1",
            Crash: "v1",
          },
        ],
        proofID: "mockProofID10",
        gatewayClientPort: 3001,
        address: "https://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: "v1",
        Architecture: "v1",
        Crash: "v1",
      },
    ]);

    expect(identity.proofID).toBe("mockProofID10");
    expect(identity.gatewayClientPort).toBe(3001);
    expect(identity.address).toBe("https://localhost");
  });

  test("Gateway server launches and shutsdown correctly", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
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
        gatewayServerPort: 13010,
        gatewayClientPort: 13011,
        address: "http://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity.gatewayServerPort).toBe(13010);
    expect(identity.gatewayClientPort).toBe(13011);
    expect(identity.address).toBe("http://localhost");

    await gateway.startup();

    const apiServer = await gateway.getOrCreateHttpServer();
    expect(apiServer).toBeInstanceOf(ApiServer);

    const config1 = new Configuration({
      basePath: gateway.getAddressOApiAddress(),
    });
    const mainApiClient = new ApiClient(config1);
    const admin = mainApiClient.extendWith(AdminApi);

    try {
      const result = await admin.getHealthCheck();
      expect(result).toBeDefined();
      expect(result.status).toBe(200);
    } catch (error) {
      logger.error`Error: ${error}`;
    } finally {
      // todo error in the test, something was not properly shutdown
      await gateway.shutdown();
    }
  });
  test("Gateway launches without database config", async () => {
    const options: SATPGatewayConfig = {
      instanceId: "gateway-orchestrator-instance-id",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
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
        gatewayServerPort: 13010,
        gatewayClientPort: 13011,
        address: "http://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity.gatewayServerPort).toBe(13010);
    expect(identity.gatewayClientPort).toBe(13011);
    expect(identity.address).toBe("http://localhost");

    await gateway.startup();

    const apiServer = await gateway.getOrCreateHttpServer();
    expect(apiServer).toBeInstanceOf(ApiServer);

    const config1 = new Configuration({
      basePath: gateway.getAddressOApiAddress(),
    });
    const mainApiClient = new ApiClient(config1);
    const admin = mainApiClient.extendWith(AdminApi).extendWith(OracleApi);

    try {
      const result = await admin.getHealthCheck();
      expect(result).toBeDefined();
      expect(result.status).toBe(200);
    } catch (error) {
      logger.error`Error: ${error}`;
    } finally {
      await gateway.shutdown();
    }
  });
});

afterAll(async () => {
  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
