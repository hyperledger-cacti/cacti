import { KnexAuditEntryRepository } from "../../../../main/typescript/database/repository/knex-audit-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import path from "path";
import fs from "fs";
import type { AuditRequest } from "../../../../main/typescript/generated/gateway-client/typescript-axios/api";
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
import { AuditEntryInvalidTimestampError } from "../../../../main/typescript/core/errors/satp-errors";

describe("Admin Audit Service Integration Tests", () => {
  let repository: KnexAuditEntryRepository;
  //let knexAuditClient: Knex;
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

  const dbPath = path.join(__dirname, "audit-test.sqlite");

  beforeAll(async () => {
    process.env.ENVIRONMENT = "test";
    const config: Knex.Config = {
      client: "sqlite3",
      connection: { filename: dbPath },
      useNullAsDefault: true,
    };

    repository = new KnexAuditEntryRepository(config);
    await repository.database.migrate.latest();

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
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
  });

  beforeEach(async () => {
    await repository.getAuditEntriesTable().del();
  });

  afterAll(async () => {
    if (gateway) {
      await gateway.shutdown();
    }
    await repository.destroy();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it("Given a valid AuditRequest, When calling performAudit, Then it should return a valid AuditResponse", async () => {
    // Given
    const timestamp = Date.now();

    const auditEntry: AuditEntry = {
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: timestamp,
    };
    await repository.create(auditEntry);

    const auditRequest: AuditRequest = {
      startTimestamp: new Date(timestamp).toISOString(),
      endTimestamp: new Date(Date.now()).toISOString(),
    };

    // When
    const auditResponse =
      await gateway.BLODispatcherInstance?.PerformAudit(auditRequest);

    // Then
    expect(await repository.database.schema.hasTable("audit_entries")).toBe(
      true,
    );
    expect(auditResponse).toBeDefined();
    expect(auditResponse!.startTimestamp).toEqual(auditRequest.startTimestamp);
    expect(auditResponse!.endTimestamp).toEqual(auditRequest.endTimestamp);
    expect(auditResponse!.auditEntries).toBeDefined();

    const entry = auditResponse!.auditEntries?.entries![0];
    expect(entry.auditEntryId).toEqual(auditEntry.auditEntryId);
    expect(entry.timestamp).toEqual(auditEntry.timestamp);
    expect(entry.session).toEqual(auditEntry.session);
  });

  it("Given valid timestamps with no matching entries, When calling performAudit, Then it should return an empty auditEntries array", async () => {
    // Given
    const request: AuditRequest = {
      startTimestamp: new Date(Date.now() - 100000).toISOString(),
      endTimestamp: new Date(Date.now() - 50000).toISOString(),
    };

    //When
    const response = await gateway.BLODispatcherInstance?.PerformAudit(request);

    //Then
    expect(response).toBeDefined();
    expect(response!.auditEntries?.entries).toBeDefined();
    expect(response!.auditEntries?.entries).toHaveLength(0);
  });

  it("Given invalid timestamp format, When calling performAudit, Then it should throw InvalidParameterError", async () => {
    // Given
    const request: AuditRequest = {
      startTimestamp: "invalid-date",
      endTimestamp: "also-invalid",
    };

    // When/Then
    await expect(
      gateway.BLODispatcherInstance?.PerformAudit(request),
    ).rejects.toThrow(AuditEntryInvalidTimestampError);
  });

  it("Given one invalid timestamp, When calling performAudit, Then it should throw InvalidParameterError", async () => {
    // Given
    const request: AuditRequest = {
      startTimestamp: new Date().toISOString(),
      endTimestamp: "invalid-date",
    };

    //When/Then
    await expect(
      gateway.BLODispatcherInstance?.PerformAudit(request),
    ).rejects.toThrow(AuditEntryInvalidTimestampError);
  });

  it("Given startTimestamp greater than endTimestamp, When calling performAudit, Then it should throw InvalidParameterError", async () => {
    // Given
    const now = Date.now();
    //When
    const request: AuditRequest = {
      startTimestamp: new Date(now + 1000).toISOString(),
      endTimestamp: new Date(now).toISOString(),
    };
    // Then
    await expect(
      gateway.BLODispatcherInstance?.PerformAudit(request),
    ).rejects.toThrow(AuditEntryInvalidTimestampError);
  });
});
