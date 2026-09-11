import { KnexAuditEntryRepository } from "../../../../main/typescript/database/repository/knex-audit-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import path from "path";
import { promises as fsPromises } from "fs";
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
} from "@hyperledger-cacti/cactus-core-api";
import { PluginFactorySATPGateway } from "../../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import type { SATPGatewayConfig } from "../../../../main/typescript/plugin-satp-hermes-gateway";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { SATP_PROTOCOL_MAP } from "../../../../main/typescript/core/satp-protocol-map";
import { Knex } from "knex";

describe("Session Proofs Endpoint Integration Tests", () => {
  let repository: KnexAuditEntryRepository;
  let gateway: SATPGateway;
  const monitorService = MonitorService.createOrGetMonitorService({
    enabled: false,
  });

  const mockLocalLog: LocalLog = {
    sessionId: "session-proofs-123",
    type: "state-change",
    key: "log-002",
    operation: "commit-ready",
    timestamp: "2026-04-02T12:00:00.000Z",
    data: JSON.stringify({ assetId: "asset-1", status: "unlocked" }),
    sequenceNumber: 2,
  };
  const ontologiesPath = path.join(__dirname, "../../../ontologies");

  const dbPath = path.join(__dirname, "session-proofs-test.sqlite");
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
    await repository.getSessionProofsTable().del();

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
    await repository.getSessionProofsTable().del();
    if (gateway) {
      await gateway.shutdown();
    }
  });

  afterAll(async () => {
    await repository.destroy();
    await fsPromises.unlink(dbPath).catch(() => undefined);
  });

  it("Given persisted proofs for a session, When calling getSessionProofs with its ID, Then return the proofs and 200 OK response", async () => {
    // Given
    const auditEntry: AuditEntry = {
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: Date.parse("2026-04-02T12:00:00.000Z"),
      proofs: [],
    };
    await repository.create(auditEntry);

    const proof = {
      sessionId: mockLocalLog.sessionId,
      step: SATP_PROTOCOL_MAP[2].steps.find(
        (s) => s.tag === "checkLockAssertionRequest",
      )!,
      claim: JSON.stringify({ receipt: "MOCK_LOCK_RECEIPT" }),
      signedClaim: "MOCK_LOCK_CLAIM_SIGNATURE",
    };
    await repository.createProof(proof);

    const api = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const response = await api.getSessionProofs(mockLocalLog.sessionId);

    // Then
    expect(response.status).toBe(200);
    expect(response.data.proofs).toBeDefined();
    expect(response.data.proofs).toHaveLength(1);
    const returned = response.data.proofs[0];
    expect(returned.sessionId).toEqual(mockLocalLog.sessionId);
    expect(returned.claim).toEqual(proof.claim);
    expect(returned.signedClaim).toEqual(proof.signedClaim);
    expect(returned.step.tag).toEqual("checkLockAssertionRequest");
  });

  it("Given proofs for multiple sessions, When calling getSessionProofs with comma-separated IDs, Then return proofs for all requested sessions", async () => {
    // Given
    const otherSessionId = "session-proofs-456";
    const proof1 = {
      sessionId: mockLocalLog.sessionId,
      step: SATP_PROTOCOL_MAP[2].steps.find(
        (s) => s.tag === "checkLockAssertionRequest",
      )!,
      claim: JSON.stringify({ receipt: "MOCK_LOCK_RECEIPT_1" }),
      signedClaim: "MOCK_LOCK_CLAIM_SIGNATURE_1",
    };
    const proof2 = {
      sessionId: otherSessionId,
      step: SATP_PROTOCOL_MAP[3].steps.find(
        (s) => s.tag === "checkCommitFinalAssertionRequest",
      )!,
      claim: JSON.stringify({ receipt: "MOCK_BURN_RECEIPT_2" }),
      signedClaim: "MOCK_BURN_CLAIM_SIGNATURE_2",
    };
    await repository.createProof(proof1);
    await repository.createProof(proof2);

    const api = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const response = await api.getSessionProofs(
      `${mockLocalLog.sessionId},${otherSessionId}`,
    );

    // Then
    expect(response.status).toBe(200);
    expect(response.data.proofs).toHaveLength(2);
    expect(response.data.proofs.map((p) => p.sessionId).sort()).toEqual(
      [mockLocalLog.sessionId, otherSessionId].sort(),
    );
  });

  it("Given a session with no persisted proofs, When calling getSessionProofs, Then return 200 and an empty proofs array", async () => {
    // Given
    const api = new AdminApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    // When
    const response = await api.getSessionProofs("no-such-session");

    // Then
    expect(response.status).toBe(200);
    expect(response.data.proofs).toEqual([]);
  });
});
