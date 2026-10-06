/**
 * Unit tests for the v13 `CrashManager` state machine.
 *
 * Ports the still-valuable scenarios of the v02 crash-management suites
 * deleted in commit 9b046ec8b (unit/crash-management/scenarios.test.ts
 * and cron-job.test.ts — both `describe.skip` at deletion) to the v13
 * APIs, as active (non-skipped) tests:
 *
 * - session reconstruction from the local log repository on restart;
 * - crash detection from an incomplete log operation -> recovery ->
 *   RECOVERED terminal state;
 * - escalation to rollback when recovery attempts are exhausted;
 * - counterparty-timeout detection from a stale "done" log;
 * - rollback-start failure containment (no viable strategy / failing
 *   strategy execution must not throw out of the crash manager);
 * - the full rollback flow delivering a signed RollbackRequest over the
 *   crash channel.
 *
 * Scheduler-driven behavior is exercised synchronously via
 * `checkAndResolveCrash` to keep these tests fast and deterministic.
 */
import { jest } from "@jest/globals";
import { create } from "@bufbuild/protobuf";
import {
  JsObjectSigner,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import { v4 as uuidv4 } from "uuid";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  MessageStagesHashesSchema,
  SessionData,
  SessionDataSchema,
  Stage0HashesSchema,
  Stage1HashesSchema,
  Stage2HashesSchema,
  Stage3HashesSchema,
  State,
  Type,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import {
  RollbackResponseSchema,
  RollbackStateSchema,
  type RollbackRequest,
  type RollbackState,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/service/crash_recovery_pb";
import { SATP_CORE_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import {
  GatewayCredential,
  SupportedSigningAlgorithms,
  type Address,
  type GatewayIdentity,
  type LocalLog,
} from "../../../../main/typescript/core/types";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";
import type { ICrashRecoveryManagerOptions } from "../../../../main/typescript/services/gateway/crash-manager";
import {
  GatewayOrchestrator,
  type IGatewayOrchestratorOptions,
} from "../../../../main/typescript/services/gateway/gateway-orchestrator";
import type { SATPCrossChainManager } from "../../../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import { KnexLocalLogRepository } from "../../../../main/typescript/database/repository/knex-local-log-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import {
  bufArray2HexStr,
  getSatpLogKey,
  verifySignature,
} from "../../../../main/typescript/utils/gateway-utils";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const clientKeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const counterpartyKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

const clientSigner = new JsObjectSigner({
  privateKey: new Uint8Array(clientKeyPair.privateKey),
});
const clientPubkey = bufArray2HexStr(clientKeyPair.publicKey);
const counterpartyPubkey = bufArray2HexStr(counterpartyKeyPair.publicKey);

const LOCAL_GATEWAY: GatewayIdentity = {
  id: "local-gateway",
  name: "LocalGateway",
  version: [{ Core: SATP_CORE_VERSION, Architecture: "v09", Crash: "v06" }],
  address: "http://localhost" as Address,
  connectedDLTs: [],
  credentials: {
    [GatewayCredential.CLAIM_SIGNATURE]: {
      purpose: GatewayCredential.CLAIM_SIGNATURE,
      algorithm: SupportedSigningAlgorithms.SECP256K1,
      publicKey: clientPubkey,
    },
  },
};

/**
 * Session crashed mid-stage-1 (stage 0 complete, stage 1 partially
 * hashed) — the same fixture shape the recovery RPC tests use.
 */
function makeSessionData(
  opts: { maxTimeout?: string; maxRetries?: string } = {},
): SessionData {
  return create(SessionDataSchema, {
    id: uuidv4(),
    role: Type.CLIENT,
    state: State.ONGOING,
    maxTimeout: opts.maxTimeout ?? "10000",
    maxRetries: opts.maxRetries ?? "3",
    lastSequenceNumber: BigInt(1),
    lastMessageReceivedTimestamp: Date.now().toString(),
    clientGatewayPubkey: clientPubkey,
    serverGatewayPubkey: counterpartyPubkey,
    recipientGatewayNetworkId: "recipient-network",
    hashes: create(MessageStagesHashesSchema, {
      stage0: create(Stage0HashesSchema, {
        newSessionRequestMessageHash: "h1",
        newSessionResponseMessageHash: "h2",
        preSatpTransferRequestMessageHash: "h3",
        preSatpTransferResponseMessageHash: "h4",
      }),
      stage1: create(Stage1HashesSchema, {
        transferProposalRequestMessageHash: "h5",
      }),
    }),
  });
}

function completedHashesSessionData(sessionId: string): SessionData {
  return create(SessionDataSchema, {
    id: sessionId,
    role: Type.CLIENT,
    state: State.ONGOING,
    maxTimeout: "10000",
    maxRetries: "3",
    lastSequenceNumber: BigInt(8),
    clientGatewayPubkey: clientPubkey,
    serverGatewayPubkey: counterpartyPubkey,
    hashes: create(MessageStagesHashesSchema, {
      stage0: create(Stage0HashesSchema, {
        newSessionRequestMessageHash: "h1",
        newSessionResponseMessageHash: "h2",
        preSatpTransferRequestMessageHash: "h3",
        preSatpTransferResponseMessageHash: "h4",
      }),
      stage1: create(Stage1HashesSchema, {
        transferProposalRequestMessageHash: "h1",
        transferProposalReceiptMessageHash: "h2",
        transferProposalRejectMessageHash: "h3",
        transferCommenceRequestMessageHash: "h4",
        transferCommenceResponseMessageHash: "h5",
      }),
      stage2: create(Stage2HashesSchema, {
        lockAssertionRequestMessageHash: "h1",
        lockAssertionReceiptMessageHash: "h2",
      }),
      stage3: create(Stage3HashesSchema, {
        commitPreparationRequestMessageHash: "h1",
        commitReadyResponseMessageHash: "h2",
        commitFinalAssertionRequestMessageHash: "h3",
        commitFinalAcknowledgementReceiptResponseMessageHash: "h4",
        transferCompleteMessageHash: "h5",
        transferCompleteResponseMessageHash: "h6",
      }),
    }),
  });
}

async function insertLog(
  repository: KnexLocalLogRepository,
  sessionData: SessionData,
  operation: string,
  timestamp = new Date().toISOString(),
): Promise<LocalLog> {
  const logEntry: LocalLog = {
    sessionId: sessionData.id,
    type: "stage1",
    key: getSatpLogKey(sessionData.id, "stage1", operation),
    operation,
    timestamp,
    data: safeStableStringify(sessionData)!,
    sequenceNumber: Number(sessionData.lastSequenceNumber),
  };
  await repository.create(logEntry);
  return logEntry;
}

describe("v13 CrashManager state machine (ported from deleted v02 suites)", () => {
  let localRepository: KnexLocalLogRepository;
  let orchestrator: GatewayOrchestrator;
  let crashManager: CrashManager;

  beforeAll(async () => {
    localRepository = new KnexLocalLogRepository({
      client: "sqlite3",
      connection: ":memory:",
      useNullAsDefault: true,
    });
    await localRepository.migrate();

    orchestrator = new GatewayOrchestrator({
      logLevel: "silent",
      localGateway: LOCAL_GATEWAY,
      counterPartyGateways: [],
      signer: clientSigner,
      monitorService,
    } satisfies IGatewayOrchestratorOptions);

    const options: ICrashRecoveryManagerOptions = {
      instanceId: "crash-manager-unit-test",
      logLevel: "silent",
      // Only getClientBridgeManagerInterface() is consumed; the bridge
      // paths under test here are the stage-1 no-op strategy and the
      // injected strategies below.
      ccManager: {
        getClientBridgeManagerInterface: () => undefined,
      } as unknown as SATPCrossChainManager,
      orchestrator,
      localRepository,
      signer: clientSigner,
      monitorService,
    };
    crashManager = new CrashManager(options);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    crashManager.sessions.clear();
  });

  afterAll(async () => {
    crashManager.stopScheduler();
    await localRepository.destroy();
    monitorService.shutdown();
  });

  it("reconstructs the session from local logs on restart (recoverSessions)", async () => {
    const sessionData = makeSessionData();
    await insertLog(localRepository, sessionData, "done");

    await crashManager.recoverSessions();

    const recovered = crashManager.sessions.get(sessionData.id);
    expect(recovered).toBeDefined();
    const recoveredData = recovered!.getClientSessionData();
    expect(recoveredData.id).toBe(sessionData.id);
    expect(recoveredData.state).toBe(State.ONGOING);
    expect(recoveredData.clientGatewayPubkey).toBe(clientPubkey);
    expect(recoveredData.serverGatewayPubkey).toBe(counterpartyPubkey);
  });

  it("does not recover or roll back when the last log is a recent done operation", async () => {
    const sessionData = makeSessionData();
    const session = SATPSession.recreateSession(sessionData, monitorService);
    crashManager.sessions.set(sessionData.id, session);
    await insertLog(localRepository, sessionData, "done");

    const handleRecoverySpy = jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(() => Promise.resolve(true));
    const initiateRollbackSpy = jest
      .spyOn(crashManager, "initiateRollback")
      .mockImplementation(() => Promise.resolve(true));

    await crashManager.checkAndResolveCrash(session);

    expect(handleRecoverySpy).not.toHaveBeenCalled();
    expect(initiateRollbackSpy).not.toHaveBeenCalled();
  });

  it("detects a crash from an incomplete operation, recovers, and reaches RECOVERED", async () => {
    const sessionData = makeSessionData();
    const session = SATPSession.recreateSession(sessionData, monitorService);
    crashManager.sessions.set(sessionData.id, session);
    await insertLog(localRepository, sessionData, "init");

    const handleRecoverySpy = jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(() => Promise.resolve(true));
    const resumeSchedulerSpy = jest.spyOn(crashManager, "resumeScheduler");

    await crashManager.checkAndResolveCrash(session);

    expect(handleRecoverySpy).toHaveBeenCalledTimes(1);
    expect(resumeSchedulerSpy).toHaveBeenCalled();
    // Terminal RECOVERED state is recorded on the live session data.
    expect(session.getClientSessionData().state).toBe(State.RECOVERED);
  });

  it("escalates to rollback when recovery attempts are exhausted", async () => {
    const sessionData = makeSessionData({ maxRetries: "1" });
    const session = SATPSession.recreateSession(sessionData, monitorService);
    crashManager.sessions.set(sessionData.id, session);
    await insertLog(localRepository, sessionData, "init");

    jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(() => Promise.resolve(false));
    const initiateRollbackSpy = jest
      .spyOn(crashManager, "initiateRollback")
      .mockImplementation(() => Promise.resolve(true));
    const resumeSchedulerSpy = jest.spyOn(crashManager, "resumeScheduler");

    await crashManager.checkAndResolveCrash(session);

    expect(initiateRollbackSpy).toHaveBeenCalledTimes(1);
    // The scheduler paused for the rollback must be resumed again even
    // though the recovery itself failed (no stuck-paused crash watcher).
    expect(resumeSchedulerSpy).toHaveBeenCalled();
  });

  it("detects a counterparty timeout from a stale done log and initiates rollback", async () => {
    const sessionData = makeSessionData({ maxTimeout: "1000" });
    const session = SATPSession.recreateSession(sessionData, monitorService);
    crashManager.sessions.set(sessionData.id, session);
    const stale = new Date(Date.now() - 10_000).toISOString();
    await insertLog(localRepository, sessionData, "done", stale);

    const initiateRollbackSpy = jest
      .spyOn(crashManager, "initiateRollback")
      .mockImplementation(() => Promise.resolve(true));

    await crashManager.checkAndResolveCrash(session);

    expect(initiateRollbackSpy).toHaveBeenCalledTimes(1);
  });

  it("contains rollback-start failure when no strategy applies (all stages complete)", async () => {
    const sessionData = completedHashesSessionData(uuidv4());
    const session = SATPSession.recreateSession(sessionData, monitorService);

    // All stages complete -> RollbackStrategyFactory throws; the crash
    // manager must contain the failure instead of throwing.
    await expect(
      crashManager.initiateRollback(session, sessionData, true),
    ).resolves.toBe(false);
  });

  it("contains rollback-start failure when the strategy execution throws", async () => {
    const sessionData = makeSessionData();
    const session = SATPSession.recreateSession(sessionData, monitorService);

    const originalFactory = crashManager["factory"];
    (crashManager as unknown as { factory: unknown }).factory = {
      createStrategy: () => ({
        execute: () => Promise.reject(new Error("bridge exploded")),
        cleanup: (_session: SATPSession, state: RollbackState) =>
          Promise.resolve(state),
      }),
    };

    try {
      await expect(
        crashManager.initiateRollback(session, sessionData, true),
      ).resolves.toBe(false);
    } finally {
      (crashManager as unknown as { factory: unknown }).factory =
        originalFactory;
    }
  });

  it("delivers a signed RollbackRequest to the counterparty on the crash channel", async () => {
    const sessionData = makeSessionData();
    const session = SATPSession.recreateSession(sessionData, monitorService);

    const rollbackRequests: RollbackRequest[] = [];
    const fakeCrashClient = {
      rollback: async (req: RollbackRequest) => {
        rollbackRequests.push(req);
        return create(RollbackResponseSchema, {
          sessionId: sessionData.id,
          success: true,
        });
      },
    };
    const fakeChannel = {
      toGatewayID: "counterparty-gateway",
      clients: new Map([["crash", fakeCrashClient]]),
    };
    const getChannelSpy = jest.spyOn(orchestrator, "getChannel");
    getChannelSpy.mockReturnValue(
      fakeChannel as unknown as ReturnType<GatewayOrchestrator["getChannel"]>,
    );
    jest.spyOn(orchestrator, "getGatewayIdentity").mockReturnValue({
      id: "counterparty-gateway",
    } as GatewayIdentity);

    const originalFactory = crashManager["factory"];
    (crashManager as unknown as { factory: unknown }).factory = {
      createStrategy: () => ({
        execute: () =>
          Promise.resolve(
            create(RollbackStateSchema, {
              sessionId: sessionData.id,
              status: "COMPLETED",
              rollbackLogEntries: [],
            }),
          ),
        cleanup: (_session: SATPSession, state: RollbackState) =>
          Promise.resolve(state),
      }),
    };

    try {
      const success = await crashManager.initiateRollback(
        session,
        sessionData,
        true,
      );
      expect(success).toBe(true);
      expect(rollbackRequests).toHaveLength(1);

      const request = rollbackRequests[0];
      expect(request.sessionId).toBe(sessionData.id);
      expect(request.success).toBe(true);
      // The rollback request must carry a signature the counterparty can
      // verify against the LOCAL (client) gateway public key.
      expect(verifySignature(clientSigner, request, clientPubkey)).toBe(true);
    } finally {
      (crashManager as unknown as { factory: unknown }).factory =
        originalFactory;
    }
  });
});
