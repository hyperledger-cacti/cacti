import "jest-extended";
import { mkdtempSync, rmSync } from "fs";
import * as os from "os";
import * as path from "path";
import {
  Containers,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import {
  type LogLevelDesc,
  LoggerProvider,
} from "@hyperledger-cacti/cactus-common";
import { ApiServer } from "@hyperledger-cacti/cactus-cmd-api-server";
import { ApiClient } from "@hyperledger-cacti/cactus-api-client";
import knex from "knex";

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
import { getFreePorts } from "../../test-utils";
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
    const [serverPort, clientPort] = await getFreePorts(2);
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
        gatewayServerPort: serverPort,
        gatewayClientPort: clientPort,
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity.gatewayServerPort).toBe(serverPort);
    expect(identity.gatewayClientPort).toBe(clientPort);
    expect(identity.address).toBe("https://localhost");
    await gateway.startup();
    await gateway.shutdown();
  });

  it("shutdown hooks work", async () => {
    const [serverPort, clientPort] = await getFreePorts(2);
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
        gatewayServerPort: serverPort,
        gatewayClientPort: clientPort,
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
    const [serverPort, clientPort] = await getFreePorts(2);
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
        gatewayServerPort: serverPort,
        gatewayClientPort: clientPort,
        address: "http://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity.gatewayServerPort).toBe(serverPort);
    expect(identity.gatewayClientPort).toBe(clientPort);
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

    // Regression check: shutdown() must release the GOL server port too, not
    // just the OApiServer — otherwise a new gateway can't rebind the same port.
    const gateway2 = await factory.create({
      instanceId: "gateway-orchestrator-instance-id-2",
      pluginRegistry: new PluginRegistry(),
      gid: {
        id: "mockID2",
        name: "CustomGateway2",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        proofID: "mockProofID11",
        gatewayServerPort: serverPort,
        gatewayClientPort: clientPort,
        address: "http://localhost",
      },
      monitorService: monitorService,
    });
    await expect(gateway2.startup()).resolves.toBeUndefined();
    await gateway2.shutdown();
  });

  test("createDBRepository migrates all four databases", async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "satp-db-test-"));
    const dbPaths = {
      local: path.join(tmpDir, "local.sqlite3"),
      remote: path.join(tmpDir, "remote.sqlite3"),
      audit: path.join(tmpDir, "audit.sqlite3"),
      oracle: path.join(tmpDir, "oracle.sqlite3"),
    };

    const sqliteConfig = (filename: string) => ({
      client: "sqlite3",
      connection: { filename },
      useNullAsDefault: true,
    });

    const options: SATPGatewayConfig = {
      instanceId: "gateway-db-migration-test",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
        id: "mockID",
        name: "DBMigrationGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        gatewayServerPort: 13020,
        gatewayClientPort: 13021,
        address: "http://localhost",
      },
      localRepository: sqliteConfig(dbPaths.local),
      remoteRepository: sqliteConfig(dbPaths.remote),
      auditRepository: sqliteConfig(dbPaths.audit),
      oracleLogRepository: sqliteConfig(dbPaths.oracle),
      monitorService: monitorService,
    };

    const gateway = await factory.create(options);
    await gateway.startup();
    await gateway.shutdown();

    const expectedTables: Record<string, string> = {
      [dbPaths.local]: "logs",
      [dbPaths.remote]: "remote-logs",
      [dbPaths.audit]: "audit_entries",
      [dbPaths.oracle]: "oracle_logs",
    };

    for (const [filename, expectedTable] of Object.entries(expectedTables)) {
      const db = knex({
        client: "sqlite3",
        connection: { filename },
        useNullAsDefault: true,
      });
      try {
        const hasTable = await db.schema.hasTable(expectedTable);
        expect(hasTable).toBeTrue();
      } finally {
        await db.destroy();
      }
    }

    rmSync(tmpDir, { recursive: true });
  });

  test("shutdown destroys all repositories even without startup", async () => {
    const sqliteConfig = (filename: string) => ({
      client: "sqlite3",
      connection: { filename },
      useNullAsDefault: true,
    });

    const options: SATPGatewayConfig = {
      instanceId: "gateway-db-shutdown-test",
      pluginRegistry: new PluginRegistry(),
      logLevel: logLevel,
      gid: {
        id: "mockID",
        name: "DBShutdownGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        gatewayServerPort: 13030,
        gatewayClientPort: 13031,
        address: "http://localhost",
      },
      localRepository: sqliteConfig(":memory:"),
      remoteRepository: sqliteConfig(":memory:"),
      auditRepository: sqliteConfig(":memory:"),
      oracleLogRepository: sqliteConfig(":memory:"),
      monitorService: monitorService,
    };

    const gateway = await factory.create(options);

    await gateway.shutdown();

    await expect(gateway.localRepository!.migrate()).rejects.toThrow();
    await expect(gateway.remoteRepository!.migrate()).rejects.toThrow();
    await expect(gateway.auditRepository.migrate()).rejects.toThrow();
    await expect(gateway.oracleLogRepository.migrate()).rejects.toThrow();
  });

  test("Gateway launches without database config", async () => {
    const [serverPort, clientPort] = await getFreePorts(2);
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
        gatewayServerPort: serverPort,
        gatewayClientPort: clientPort,
        address: "http://localhost",
      },
      monitorService: monitorService,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity.gatewayServerPort).toBe(serverPort);
    expect(identity.gatewayClientPort).toBe(clientPort);
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
