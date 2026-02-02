import { KnexAuditEntryRepository } from "../../../../main/typescript/database/repository/knex-audit-repository";
import { knexAuditInstance } from "../../../../main/typescript/database/knexfile-audit";
import { BLODispatcher } from "../../../../main/typescript/api1/dispatcher";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { GatewayOrchestrator } from "../../../../main/typescript/services/gateway/gateway-orchestrator";
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { SATPCrossChainManager } from "../../../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import type { SATPLogger as Logger } from "../../../../main/typescript/core/satp-logger";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

import type {
  AuditRequest,
  AuditResponse,
} from "../../../../main/typescript/generated/gateway-client/typescript-axios/api";
import { SATPGateway } from "../../../../main/typescript";
import type {
  Address,
  AuditEntry,
  Audit,
  LocalLog,
  GatewayIdentity,
  SupportedSigningAlgorithms,
} from "../../../../main/typescript/core/types";
import { v4 as uuidv4 } from "uuid";
import { type LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
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
import { Knex, knex } from "knex";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";

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

  beforeAll(async () => {
    const migrationSource = await createMigrationSource();
    const config: Knex.Config = {
      client: "sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
      migrations: {
        migrationSource,
      },
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
      auditRepository: knexAuditInstance.default,
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
  });

  it("Given a valid AuditRequest, When calling performAudit, Then it should return a valid AuditResponse", async () => {
    // Given
    const timestamp = new Date().getTime();

    const auditEntry: AuditEntry = {
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: timestamp.toString(),
    };
    await repository.create(auditEntry);

    const auditRequest: AuditRequest = {
      startTimestamp: timestamp,
      endTimestamp: Date.now(),
    };

    // When
    const auditResponse =
      await gateway.BLODispatcherInstance?.PerformAudit(auditRequest);

    // Then
    expect(auditResponse).toBeDefined();
    expect(auditResponse!.startTimestamp).toEqual(auditRequest.startTimestamp);
    expect(auditResponse!.endTimestamp).toEqual(auditRequest.endTimestamp);
    expect(auditResponse!.sessions).toBeDefined();
    expect(auditResponse!.sessions![0]).toEqual(auditEntry.session.toString());
  });

  it("Given a invalid AuditRequest, When calling performAudit, Then it should return an empty AuditResponse", async () => {
    // Given
    // When
    // Then
  });
});
