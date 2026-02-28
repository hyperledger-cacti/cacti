import { KnexAuditEntryRepository } from "../../../../main/typescript/database/repository/knex-audit-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import path from "path";
import fs from "fs";
import { Configuration, AdminApi } from "../../../../main/typescript";
import { SATPGateway } from "../../../../main/typescript";
import type {
  Address,
  AuditEntry,
  LocalLog,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import { v4 as uuidv4 } from "uuid";
import {
  type IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { PluginFactorySATPGateway } from "../../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import { PluginRegistry } from "@hyperledger/cactus-core";
import type { SATPGatewayConfig } from "../../../../main/typescript/plugin-satp-hermes-gateway";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { Knex } from "knex";

describe("Audit Endpoint Integration Tests", () => {
  let repository: KnexAuditEntryRepository;
  let gateway: SATPGateway;
  const monitorService = MonitorService.createOrGetMonitorService({
    enabled: false,
  });

  const mockLocalLog: LocalLog = {
    sessionId: "session-123",
    type: "state-change",
    key: "log-002",
    operation: "commit-ready",
    timestamp: (Date.now() + 1000).toString(),
    data: JSON.stringify({ assetId: "asset-1", status: "unlocked" }),
    sequenceNumber: 2,
  };
  const ontologiesPath = path.join(__dirname, "../../../ontologies");

  const dbPath = path.join(__dirname, "audit-test.sqlite");
  const config: Knex.Config = {
    client: "sqlite3",
    connection: { filename: dbPath },
    useNullAsDefault: true,
  };

  beforeAll(async () => {
    process.env.ENVIRONMENT = "test";
    repository = new KnexAuditEntryRepository(config);
    await repository.database.migrate.latest();
  });

  beforeEach(async () => {
    await repository.getAuditEntriesTable().del();

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

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      auditRepository: config,
      pluginRegistry: new PluginRegistry({
        plugins: [],
      }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    await gateway.onPluginInit();
    await gateway.getOrCreateHttpServer();
  });

  afterEach(async () => {
    await repository.getAuditEntriesTable().del();
    if (gateway) {
      await gateway.shutdown();
    }
  });

  afterAll(async () => {
    await repository.destroy();
    fs.unlinkSync(dbPath);
  });

  it("Given valid StartTimestampAndEndTimestamp, When calling an available audit endpoint, Then return Audit data and 200 OK response", async () => {
    // Given
    const timestamp = Date.now();

    const auditEntry: AuditEntry = {
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: timestamp,
    };
    await repository.create(auditEntry);

    const identity = gateway.Identity;
    const startTimestamp = new Date(timestamp).toISOString();
    const endTimestamp = new Date(Date.now()).toISOString();

    const SATPGatewayAdminApi: AdminApi = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const auditResponse = await SATPGatewayAdminApi.performAudit(
      startTimestamp,
      endTimestamp,
    );

    // Then
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.data).toBeDefined();
    expect(auditResponse.data.startTimestamp).toEqual(startTimestamp);
    expect(auditResponse.data.endTimestamp).toEqual(endTimestamp);
    expect(auditResponse.data.auditEntries).toBeDefined();
    expect(auditResponse.data.auditEntries.entries.length).toBe(1);
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.gatewayOapiPort).toBe(4010);
    expect(identity.address).toBe("http://localhost");
  });

  it("Given startTimestamp equal to endTimestamp, When calling audit endpoint, Then return 200 and possibly matching entries", async () => {
    // Given
    const timestamp = Date.now();

    await repository.create({
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp,
    });

    const isoTimestamp = new Date(timestamp).toISOString();

    const api = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const auditResponse = await api.performAudit(isoTimestamp, isoTimestamp);

    //Then
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.data.startTimestamp).toEqual(isoTimestamp);
    expect(auditResponse.data.endTimestamp).toEqual(isoTimestamp);
    expect(auditResponse.data.auditEntries).toBeDefined();
    expect(auditResponse.data.auditEntries.entries.length).toBe(1);
  });

  it("Given valid range with no matching entries, Then return 200 and empty auditEntries", async () => {
    // Given
    const now = Date.now();

    const api = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const response = await api.performAudit(
      new Date(now - 100000).toISOString(),
      new Date(now - 50000).toISOString(),
    );

    // Then
    expect(response.status).toBe(200);
    expect(response.data.auditEntries.entries.length).toBe(0);
  });

  it("Given multiple entries, Then only entries within range are returned", async () => {
    // Given
    const now = Date.now();

    const insideTimestamp = now;
    const outsideTimestamp = now - 100000;

    await repository.create({
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: insideTimestamp,
    });

    await repository.create({
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: outsideTimestamp,
    });

    const api = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const response = await api.performAudit(
      new Date(now - 1000).toISOString(),
      new Date(now + 1000).toISOString(),
    );

    // Then
    expect(response.status).toBe(200);
    expect(response.data.auditEntries.entries.length).toBe(1);
  });

  it("Given invalid timestamp format, When calling audit endpoint, Then return 400 Bad Request", async () => {
    // Given
    const SATPGatewayAdminApi: AdminApi = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    const invalidStartTimestamp = "INVALID_TIMESTAMP";
    const invalidEndTimestamp = "ANOTHER_INVALID_TIMESTAMP";

    try {
      // When
      await SATPGatewayAdminApi.performAudit(
        invalidStartTimestamp,
        invalidEndTimestamp,
      );

      fail("Request should have thrown AxiosError");
    } catch (error: any) {
      // Then
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
      expect(error.response.data).toBeDefined();
      expect(error.response.data.error).toBe("InvalidParameter");
    }
  });

  it("Given startTimestamp greater than endTimestamp, When calling audit endpoint, Then return 400 Bad Request", async () => {
    // Given
    const SATPGatewayAdminApi: AdminApi = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    const timestamp = Date.now();

    const startTimestamp = new Date(timestamp + 10000).toISOString();
    const endTimestamp = new Date(timestamp).toISOString();

    try {
      // When
      await SATPGatewayAdminApi.performAudit(startTimestamp, endTimestamp);

      // Then
      fail("Request should have thrown an HTTP 400 Error");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toBeDefined();
      expect(error.response.data.error).toBe("InvalidParameter");
    }
  });
});
