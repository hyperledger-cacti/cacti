import "jest-extended";
import { create } from "@bufbuild/protobuf";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { Stage0RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage3-rollback-strategy";
import { SATPLoggerProvider as LoggerProvider } from "../../../../main/typescript/core/satp-logger-provider";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { BridgeManagerClientInterface } from "../../../../main/typescript/cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import {
  RollbackLogEntrySchema,
  RollbackStateSchema,
  type RollbackState,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import { SATPStage } from "../../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";

// cleanup() does not call bridgeManager, so an empty stub is sufficient.
const stubBridgeManager = {} as unknown as BridgeManagerClientInterface;

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate(
  { level: logLevel, label: "RollbackCleanupUnitTest" },
  monitorService,
);

const SESSION_ID = "rollback-cleanup-unit-session";

const buildSession = (): SATPSession => {
  const session = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
    monitorService,
  });
  session.getClientSessionData().id = SESSION_ID;
  return session;
};

const buildState = (currentStage: string): RollbackState =>
  create(RollbackStateSchema, {
    sessionId: SESSION_ID,
    currentStage,
    rollbackLogEntries: [],
    status: "COMPLETED",
    details: "",
  });

const buildFailingSession = (): SATPSession =>
  ({
    getSessionId: () => {
      throw new Error("simulated session failure");
    },
  }) as unknown as SATPSession;

afterAll(async () => {
  await monitorService.shutdown();
});

describe("rollback cleanup() success paths", () => {
  it("Stage0RollbackStrategy.cleanup appends CLEANUP_STAGE_0 SUCCESS entry", async () => {
    const strategy = new Stage0RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[1]);

    const result = await strategy.cleanup(buildSession(), state);

    expect(result).toBe(state);
    expect(result.details).toContain(SESSION_ID);
    expect(result.details).toContain("Stage 0 cleanup completed");
    expect(result.rollbackLogEntries).toHaveLength(1);
    const entry = result.rollbackLogEntries[0];
    expect(entry.action).toEqual("CLEANUP_STAGE_0");
    expect(entry.status).toEqual("SUCCESS");
    expect(entry.sessionId).toEqual(SESSION_ID);
    expect(entry.stage).toEqual(SATPStage[1]);
    expect(entry.timestamp).toBeString();
  });

  it("Stage1RollbackStrategy.cleanup appends CLEANUP_STAGE_1 SUCCESS entry", async () => {
    const strategy = new Stage1RollbackStrategy(log, monitorService);
    const state = buildState(SATPStage[2]);

    const result = await strategy.cleanup(buildSession(), state);

    expect(result.details).toContain("Stage 1 cleanup completed");
    expect(result.rollbackLogEntries).toHaveLength(1);
    const entry = result.rollbackLogEntries[0];
    expect(entry.action).toEqual("CLEANUP_STAGE_1");
    expect(entry.status).toEqual("SUCCESS");
    expect(entry.sessionId).toEqual(SESSION_ID);
    expect(entry.stage).toEqual(SATPStage[2]);
  });

  it("Stage2RollbackStrategy.cleanup appends CLEANUP_STAGE_2 SUCCESS entry", async () => {
    const strategy = new Stage2RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[3]);

    const result = await strategy.cleanup(buildSession(), state);

    expect(result.details).toContain("Stage 2 cleanup completed");
    expect(result.rollbackLogEntries).toHaveLength(1);
    const entry = result.rollbackLogEntries[0];
    expect(entry.action).toEqual("CLEANUP_STAGE_2");
    expect(entry.status).toEqual("SUCCESS");
    expect(entry.sessionId).toEqual(SESSION_ID);
    expect(entry.stage).toEqual(SATPStage[3]);
  });

  it("Stage3RollbackStrategy.cleanup appends CLEANUP_STAGE_3 SUCCESS entry", async () => {
    const strategy = new Stage3RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[4]);

    const result = await strategy.cleanup(buildSession(), state);

    expect(result.details).toContain("Stage 3 cleanup completed");
    expect(result.rollbackLogEntries).toHaveLength(1);
    const entry = result.rollbackLogEntries[0];
    expect(entry.action).toEqual("CLEANUP_STAGE_3");
    expect(entry.status).toEqual("SUCCESS");
    expect(entry.sessionId).toEqual(SESSION_ID);
    expect(entry.stage).toEqual(SATPStage[4]);
  });

  it("preserves existing rollbackLogEntries when cleaning up", async () => {
    const strategy = new Stage1RollbackStrategy(log, monitorService);
    const state = buildState(SATPStage[2]);
    state.rollbackLogEntries.push(
      create(RollbackLogEntrySchema, {
        sessionId: SESSION_ID,
        stage: SATPStage[2],
        timestamp: new Date().toISOString(),
        action: "PRE_EXISTING_ACTION",
        status: "SUCCESS",
        details: "earlier rollback step",
      }),
    );

    const result = await strategy.cleanup(buildSession(), state);

    expect(result.rollbackLogEntries).toHaveLength(2);
    expect(result.rollbackLogEntries[0].action).toEqual("PRE_EXISTING_ACTION");
    expect(result.rollbackLogEntries[1].action).toEqual("CLEANUP_STAGE_1");
  });
});

describe("rollback cleanup() guard clauses", () => {
  it("returns the state unchanged when session is missing", async () => {
    const strategy = new Stage0RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[1]);

    const result = await strategy.cleanup(
      undefined as unknown as SATPSession,
      state,
    );

    expect(result).toBe(state);
    expect(result.rollbackLogEntries).toHaveLength(0);
    expect(result.details).toEqual("");
  });
});

describe("rollback cleanup() failure paths", () => {
  it("Stage0 records a CLEANUP_STAGE_0 FAILED entry when getSessionId throws", async () => {
    const strategy = new Stage0RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[1]);

    const result = await strategy.cleanup(buildFailingSession(), state);

    expect(result.rollbackLogEntries).toHaveLength(1);
    const entry = result.rollbackLogEntries[0];
    expect(entry.action).toEqual("CLEANUP_STAGE_0");
    expect(entry.status).toEqual("FAILED");
    expect(entry.details).toContain("simulated session failure");
    expect(result.details).toContain("Stage 0 cleanup failed");
  });

  it("Stage1 records a CLEANUP_STAGE_1 FAILED entry when getSessionId throws", async () => {
    const strategy = new Stage1RollbackStrategy(log, monitorService);
    const state = buildState(SATPStage[2]);

    const result = await strategy.cleanup(buildFailingSession(), state);

    expect(result.rollbackLogEntries).toHaveLength(1);
    expect(result.rollbackLogEntries[0].action).toEqual("CLEANUP_STAGE_1");
    expect(result.rollbackLogEntries[0].status).toEqual("FAILED");
    expect(result.details).toContain("Stage 1 cleanup failed");
  });

  it("Stage2 records a CLEANUP_STAGE_2 FAILED entry when getSessionId throws", async () => {
    const strategy = new Stage2RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[3]);

    const result = await strategy.cleanup(buildFailingSession(), state);

    expect(result.rollbackLogEntries).toHaveLength(1);
    expect(result.rollbackLogEntries[0].action).toEqual("CLEANUP_STAGE_2");
    expect(result.rollbackLogEntries[0].status).toEqual("FAILED");
    expect(result.details).toContain("Stage 2 cleanup failed");
  });

  it("Stage3 records a CLEANUP_STAGE_3 FAILED entry when getSessionId throws", async () => {
    const strategy = new Stage3RollbackStrategy(
      stubBridgeManager,
      log,
      monitorService,
    );
    const state = buildState(SATPStage[4]);

    const result = await strategy.cleanup(buildFailingSession(), state);

    expect(result.rollbackLogEntries).toHaveLength(1);
    expect(result.rollbackLogEntries[0].action).toEqual("CLEANUP_STAGE_3");
    expect(result.rollbackLogEntries[0].status).toEqual("FAILED");
    expect(result.details).toContain("Stage 3 cleanup failed");
  });
});
