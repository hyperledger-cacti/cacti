/**
 * Unit tests for the v13 crash-recovery RPC services and rollback
 * dispatch, focused on crash/restart edge cases that the v02 suites
 * (deleted in commit 9b046ec8b) attempted to cover while skipped:
 *
 * - duplicate recovery messages (idempotent acks) after a crash;
 * - sequence-number semantics of log recovery;
 * - crash-mid-rollback convergence: the counterparty processes a signed
 *   RollbackRequest by executing its own rollback strategy and acking;
 * - rollback-start dispatch (RollbackStrategyFactory) per crashed stage;
 * - session terminal-state guards (COMPLETED/REJECTED) enforced by
 *   `SATPSession.verify`.
 *
 * Complements `integration/recovery/recovery-crash-v13.test.ts`, which
 * pins the signature-verification semantics of the same services.
 */
import { create } from "@bufbuild/protobuf";
import {
  JsObjectSigner,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import { v4 as uuidv4 } from "uuid";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import type { Knex } from "knex";
import { knex } from "knex";
import { LockType } from "../../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
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
  RollbackStateSchema,
  type RollbackState,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/service/crash_recovery_pb";
import { SATP_CORE_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { SessionType } from "../../../../main/typescript/core/session-utils";
import type { SATPLogger as Logger } from "../../../../main/typescript/core/satp-logger";
import { SessionDataNotLoadedCorrectlyError } from "../../../../main/typescript/core/errors/satp-service-errors";
import { CrashRecoveryClientService } from "../../../../main/typescript/core/crash-management/client-service";
import { CrashRecoveryServerService } from "../../../../main/typescript/core/crash-management/server-service";
import { RollbackStrategyFactory } from "../../../../main/typescript/core/crash-management/rollback/rollback-strategy-factory";
import { Stage0RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage3-rollback-strategy";
import type { BridgeManagerClientInterface } from "../../../../main/typescript/cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { KnexLocalLogRepository } from "../../../../main/typescript/database/repository/knex-local-log-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import type { LocalLog } from "../../../../main/typescript/core/types";
import {
  bufArray2HexStr,
  getSatpLogKey,
  verifySignature,
} from "../../../../main/typescript/utils/gateway-utils";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

// No-op logger: the crash services only emit trace/debug logs here.
const logger = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as Logger;

const clientKeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const serverKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

const clientSigner = new JsObjectSigner({
  privateKey: new Uint8Array(clientKeyPair.privateKey),
});
const serverSigner = new JsObjectSigner({
  privateKey: new Uint8Array(serverKeyPair.privateKey),
});

const clientPubkey = bufArray2HexStr(clientKeyPair.publicKey);
const serverPubkey = bufArray2HexStr(serverKeyPair.publicKey);

const SESSION_ID = uuidv4();

/**
 * Session crashed mid-stage-1: stage 0 complete, stage 1 partially
 * hashed (client crashed after the transfer proposal).
 */
function makeSessionData(role: Type, sessionId = SESSION_ID): SessionData {
  return create(SessionDataSchema, {
    id: sessionId,
    version: SATP_CORE_VERSION,
    role,
    state: State.ONGOING,
    lastSequenceNumber: role === Type.CLIENT ? BigInt(1) : BigInt(2),
    lastMessageReceivedTimestamp: Date.now().toString(),
    clientGatewayPubkey: clientPubkey,
    serverGatewayPubkey: serverPubkey,
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

describe("v13 crash-recovery duplicate/idempotency handling", () => {
  let knexInstance: Knex;
  let serverLogRepository: KnexLocalLogRepository;
  let serverService: CrashRecoveryServerService;
  let clientService: CrashRecoveryClientService;

  beforeAll(async () => {
    knexInstance = knex({
      client: "sqlite3",
      connection: ":memory:",
      useNullAsDefault: true,
    });
    serverLogRepository = new KnexLocalLogRepository({
      client: "sqlite3",
      connection: ":memory:",
      useNullAsDefault: true,
    });
    await serverLogRepository.migrate();

    const serverSession = SATPSession.recreateSession(
      makeSessionData(Type.SERVER),
      monitorService,
    );
    const sessions = new Map<string, SATPSession>();
    sessions.set(SESSION_ID, serverSession);

    const serverSessionData = serverSession.getServerSessionData();
    const serverLogEntry: LocalLog = {
      sessionId: SESSION_ID,
      type: "stage1",
      key: getSatpLogKey(SESSION_ID, "stage1", "done"),
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(serverSessionData)!,
      sequenceNumber: Number(serverSessionData.lastSequenceNumber),
    };
    await serverLogRepository.create(serverLogEntry);

    const bridgesManagerStub = {
      rollBack: () => undefined,
    } as unknown as BridgeManagerClientInterface;

    serverService = new CrashRecoveryServerService(
      bridgesManagerStub,
      serverLogRepository,
      sessions,
      serverSigner,
      logger,
      monitorService,
    );

    clientService = new CrashRecoveryClientService(
      logger,
      clientSigner,
      monitorService,
    );
  });

  afterAll(async () => {
    await serverLogRepository.destroy();
    await knexInstance.destroy();
  });

  it("answers duplicate RecoverRequest deliveries identically (idempotent ack)", async () => {
    const recoverRequest = await clientService.createRecoverRequest(
      makeSessionData(Type.CLIENT),
    );

    const first = await serverService.handleRecover(recoverRequest);
    const second = await serverService.handleRecover(recoverRequest);

    for (const response of [first, second]) {
      expect(response.sessionId).toBe(SESSION_ID);
      expect(response.recoveredLogs).toHaveLength(1);
      expect(verifySignature(serverSigner, response, serverPubkey)).toBe(true);
    }
    // The same (sequence-filtered) logs are returned both times: a
    // redelivery after a client crash neither loses nor duplicates data.
    expect(first.recoveredLogs[0].key).toBe(second.recoveredLogs[0].key);
    expect(first.recoveredLogs[0].sequenceNumber).toBe(
      second.recoveredLogs[0].sequenceNumber,
    );
  });

  it("returns no logs for a RecoverRequest beyond the server's last sequence number", async () => {
    const clientSessionData = makeSessionData(Type.CLIENT);
    // A client that already persisted more work than the server has
    // must not be rolled backwards; nothing up to sequence 999 exists.
    clientSessionData.lastSequenceNumber = BigInt(999);

    const recoverRequest =
      await clientService.createRecoverRequest(clientSessionData);

    await expect(serverService.handleRecover(recoverRequest)).rejects.toThrow(
      /No logs Found/,
    );
  });

  it("acks duplicate RecoverSuccessRequest deliveries (idempotent ack)", async () => {
    const recoverSuccessRequest =
      await clientService.createRecoverSuccessRequest(
        makeSessionData(Type.CLIENT),
      );

    const first = await serverService.handleRecoverSuccess(
      recoverSuccessRequest,
    );
    const second = await serverService.handleRecoverSuccess(
      recoverSuccessRequest,
    );

    for (const response of [first, second]) {
      expect(response.sessionId).toBe(SESSION_ID);
      expect(response.received).toBe(true);
      expect(verifySignature(serverSigner, response, serverPubkey)).toBe(true);
    }
  });

  it("processes a signed RollbackRequest by executing the counterparty strategy and acks", async () => {
    const rollbackState: RollbackState = create(RollbackStateSchema, {
      sessionId: SESSION_ID,
      status: "COMPLETED",
      rollbackLogEntries: [],
    });
    const rollbackRequest = await clientService.createRollbackRequest(
      makeSessionData(Type.CLIENT),
      rollbackState,
    );

    const ack = await serverService.handleRollback(rollbackRequest);

    // The server executed its own stage-1 rollback (no on-chain actions
    // required at this stage) and confirms completion to the client.
    expect(ack.sessionId).toBe(SESSION_ID);
    expect(ack.success).toBe(true);
    expect(ack.actionsPerformed).toContain("NO_ACTION_REQUIRED_SERVER");
    expect(verifySignature(serverSigner, ack, serverPubkey)).toBe(true);
  });

  it("rejects a RollbackRequest signed with the wrong key (fail closed)", async () => {
    const rollbackState: RollbackState = create(RollbackStateSchema, {
      sessionId: SESSION_ID,
      status: "COMPLETED",
      rollbackLogEntries: [],
    });
    const rollbackRequest = await clientService.createRollbackRequest(
      makeSessionData(Type.CLIENT),
      rollbackState,
    );
    // Re-sign with the SERVER's key: the server verifies rollback
    // requests against the CLIENT gateway public key, so this forgery
    // must be rejected.
    rollbackRequest.clientSignature = bufArray2HexStr(
      serverSigner.sign(
        safeStableStringify({ ...rollbackRequest, clientSignature: "" }),
      ),
    );

    await expect(serverService.handleRollback(rollbackRequest)).rejects.toThrow(
      /signature/i,
    );
  });
});

describe("v13 RollbackStrategyFactory dispatch (ported from deleted v02 suite)", () => {
  let factory: RollbackStrategyFactory;

  beforeAll(() => {
    const bridgesManagerStub = {
      rollBack: () => undefined,
    } as unknown as BridgeManagerClientInterface;
    factory = new RollbackStrategyFactory(
      bridgesManagerStub,
      logger,
      monitorService,
    );
  });

  it("dispatches Stage0 when stage 0 is absent or partially complete", () => {
    const noHashes = create(SessionDataSchema, {
      id: "s1",
      hashes: create(MessageStagesHashesSchema, {}),
    });
    expect(factory.createStrategy(noHashes)).toBeInstanceOf(
      Stage0RollbackStrategy,
    );

    const partialStage0 = create(SessionDataSchema, {
      id: "s2",
      hashes: create(MessageStagesHashesSchema, {
        stage0: create(Stage0HashesSchema, {
          newSessionRequestMessageHash: "h1",
        }),
      }),
    });
    expect(factory.createStrategy(partialStage0)).toBeInstanceOf(
      Stage0RollbackStrategy,
    );
  });

  it("dispatches Stage1 when stage 0 is complete and stage 1 is partial", () => {
    const sessionData = create(SessionDataSchema, {
      id: "s3",
      hashes: create(MessageStagesHashesSchema, {
        stage0: create(Stage0HashesSchema, {
          newSessionRequestMessageHash: "h1",
          newSessionResponseMessageHash: "h2",
          preSatpTransferRequestMessageHash: "h3",
          preSatpTransferResponseMessageHash: "h4",
        }),
        stage1: create(Stage1HashesSchema, {
          transferProposalRequestMessageHash: "h1",
        }),
      }),
    });
    expect(factory.createStrategy(sessionData)).toBeInstanceOf(
      Stage1RollbackStrategy,
    );
  });

  it("dispatches Stage2 when stages 0-1 are complete and stage 2 is partial", () => {
    const sessionData = create(SessionDataSchema, {
      id: "s4",
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
        }),
      }),
    });
    expect(factory.createStrategy(sessionData)).toBeInstanceOf(
      Stage2RollbackStrategy,
    );
  });

  it("dispatches Stage3 when stages 0-2 are complete and stage 3 is partial", () => {
    const sessionData = create(SessionDataSchema, {
      id: "s5",
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
        }),
      }),
    });
    expect(factory.createStrategy(sessionData)).toBeInstanceOf(
      Stage3RollbackStrategy,
    );
  });

  it("refuses to roll back a session whose stages are all complete", () => {
    const sessionData = create(SessionDataSchema, {
      id: "s6",
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

    expect(() => factory.createStrategy(sessionData)).toThrow(
      "No rollback needed as all stages are complete.",
    );
  });
});

describe("session terminal-state guards (SATPSession.verify)", () => {
  /**
   * Fully populated session data so that `verify` reaches (and can
   * isolate) its terminal-state checks.
   */
  function makeVerifiableSessionData(state: State): SessionData {
    return create(SessionDataSchema, {
      id: uuidv4(),
      version: SATP_CORE_VERSION,
      role: Type.SERVER,
      state,
      digitalAssetId: uuidv4(),
      transferContextId: uuidv4(),
      senderGatewayNetworkId: "sender-network",
      recipientGatewayNetworkId: "recipient-network",
      clientGatewayPubkey: clientPubkey,
      serverGatewayPubkey: serverPubkey,
      senderGatewayOwnerId: "sender-owner",
      receiverGatewayOwnerId: "receiver-owner",
      signatureAlgorithm: "secp256k1",
      lockType: LockType.TIME_LOCK,
      lockExpirationTime: BigInt(1),
    });
  }

  it("rejects further processing of a COMPLETED session", () => {
    const session = SATPSession.recreateSession(
      makeVerifiableSessionData(State.COMPLETED),
      monitorService,
    );
    expect(() => session.verify("unit-test", SessionType.SERVER)).toThrow(
      SessionDataNotLoadedCorrectlyError,
    );
    // The completion opt-out is explicit: passing the flag admits the
    // already-completed state and processing may continue.
    expect(() =>
      session.verify("unit-test", SessionType.SERVER, false, true),
    ).not.toThrow();
  });

  it("rejects further processing of a REJECTED session", () => {
    const session = SATPSession.recreateSession(
      makeVerifiableSessionData(State.REJECTED),
      monitorService,
    );
    expect(() => session.verify("unit-test", SessionType.SERVER)).toThrow(
      /already completed/,
    );
    expect(() =>
      session.verify("unit-test", SessionType.SERVER, true),
    ).not.toThrow();
  });

  it("allows processing of an ONGOING session", () => {
    const session = SATPSession.recreateSession(
      makeVerifiableSessionData(State.ONGOING),
      monitorService,
    );
    expect(() => session.verify("unit-test", SessionType.SERVER)).not.toThrow();
  });
});
