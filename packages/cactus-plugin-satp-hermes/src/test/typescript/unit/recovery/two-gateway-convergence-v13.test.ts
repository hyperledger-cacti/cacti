/**
 * Two-gateway crash-recovery convergence loop, ported from the deleted v02
 * suites `integration/recovery/recovery-stage-{1,2,3}.test.ts` (all
 * `describe.skip` at their deletion in commit 9b046ec8b) and run on an
 * in-process connect transport harness (see
 * `two-gateway-connect-harness.ts`) — no docker, no ports.
 *
 * Ported scenarios (stage-appropriate for the v13 recovery flow):
 * - a client gateway that crashed mid-stage-N (stale, partial log) runs the
 *   recovery loop against the server gateway over the crash channel and
 *   both sides converge to the same hashes, processed timestamps, and
 *   signatures for every completed stage, with the client reaching the
 *   RECOVERED terminal state;
 * - the converged signatures are the producing gateways' real secp256k1
 *   signatures and verify cryptographically on the recovered state;
 * - the recovered log is durably persisted in the client's local log
 *   repository (the client's crash checkpoint moves to the server's "done");
 * - the RecoverRequest / RecoverSuccessRequest / RecoverResponse wire
 *   traffic is signed and the signatures verify with the sending gateway's
 *   pinned public key.
 *
 * New fail-closed scenarios (divergence handling the v02 suites never
 * covered end-to-end):
 * - a RecoverRequest tampered with en route is rejected by the server
 *   (signature verification happens inside the loop) and the client session
 *   does not converge;
 * - a client that is ahead of the server (higher sequence number) gets no
 *   logs and is not rolled backwards.
 *
 * Round 4 scenarios (client-side RecoverResponse enforcement + hostile
 * deliveries through the harness):
 * - a RecoverResponse whose serverSignature is forged in flight is rejected
 *   by the CLIENT (the crash-manager enforces verifySignature against the
 *   server's pinned key): nothing is applied or persisted and the loop
 *   escalates to the signed rollback flow;
 * - a RecoverResponse whose recovered logs were reordered in flight is
 *   rejected wholesale (payload mutation breaks the server signature) —
 *   out-of-order logs are never applied;
 * - an out-of-order RecoverSuccessRequest arriving before any recover
 *   exchange is tolerated (verified + acked idempotently, no state change)
 *   and the loop still converges afterwards;
 * - the same RecoverRequest delivered twice yields idempotent server
 *   answers and a single clean convergence (no duplicate application);
 * - a burst of recovery requests for multiple interleaved sessions through
 *   the same crash channel converges each session to its own server state
 *   with no cross-session interference.
 *
 * Dropped from the deleted v02 suites (by design, see
 * plan/WORKLOG-satpv13-adversarial-review.md F7):
 * - the 5 s wall-clock sleeps waiting for the crash cron — replaced by a
 *   direct `checkAndResolveCrash` invocation (cron wiring deliberately
 *   untested);
 * - full `SATPGateway` instances — v13 production refuses to construct a
 *   gateway with crash recovery enabled, so the harness composes the same
 *   components at the same wiring points;
 * - bridge-facing rollback assertions — v13 rollback is stubbed
 *   (NO_ACTION_REQUIRED_*) and covered only as stubs elsewhere.
 */
import type { Interceptor } from "@connectrpc/connect";
import type { Client as PromiseConnectClient } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  CrashRecoveryService,
  type RecoverRequest,
  type RecoverResponse,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/service/crash_recovery_pb";
import {
  SessionDataSchema,
  State,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import {
  JsObjectSigner,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import {
  bufArray2HexStr,
  verifySignature,
} from "../../../../main/typescript/utils/gateway-utils";
import {
  createWiredGatewayPair,
  makeStageFixture,
  insertStageLog,
  shutdownGatewayPair,
  SERVER_GATEWAY_ID,
  type GatewayPair,
  type StageFixture,
} from "./two-gateway-connect-harness";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";

const monitorService: MonitorService = MonitorService.createOrGetMonitorService(
  {
    enabled: false,
  },
);
monitorService.init();

function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/** Verify a fixture-style signature over a message hash. */
function verifyHashSignature(
  signer: JsObjectSigner,
  hash: string,
  signatureHex: string,
  pubKeyHex: string,
): boolean {
  return signer.verify(
    hash,
    hexToUint8Array(signatureHex),
    hexToUint8Array(pubKeyHex),
  );
}

/** Dynamic per-stage view of a hashes/timestamps/signatures container. */
function stageOf(
  container: unknown,
  stageKey: string,
): Record<string, unknown> {
  const stages = container as Record<string, Record<string, unknown>>;
  return stages[stageKey] ?? {};
}

/** Snapshot helper: deterministic digest of a session data sub-object. */
function digestOf(value: unknown): string {
  return safeStableStringify(value)!;
}

/**
 * Fetch the side's live session data from the crash manager's session map.
 * The client role holds client session data, the server role holds server
 * session data (each gateway reconstructs its own role from its logs).
 */
function getSessionData(
  side: "client" | "server",
  crashManager: CrashManager,
  sessionId: string,
): ReturnType<SATPSession["getClientSessionData"]> {
  const session = crashManager.sessions.get(sessionId);
  expect(session).toBeDefined();
  return side === "client"
    ? session!.getClientSessionData()
    : session!.getServerSessionData();
}

/**
 * The deleted v02 suites waited on a 5 s sleep for the crash cron to pick
 * the session up; here the recovery check is invoked directly (the cron
 * wiring stays deliberately untested — see worklog F7).
 */
async function restartAndCheck(pair: GatewayPair, fixture: StageFixture) {
  // Both gateways restart: each rebuilds its session from its own logs
  // (the same reconstruction path the CrashManager runs on startup).
  await pair.client.crashManager.recoverSessions();
  await pair.server.crashManager.recoverSessions();
  // Keep the (real) crash schedulers quiet for determinism; the test
  // triggers the recovery check explicitly and cleans up in afterEach.
  pair.client.crashManager.pauseScheduler();
  pair.server.crashManager.pauseScheduler();

  const clientSession = pair.client.crashManager.sessions.get(
    fixture.sessionId,
  );
  expect(clientSession).toBeDefined();
  await pair.client.crashManager.checkAndResolveCrash(clientSession!);
}

/**
 * The wire-level signature contract of one full convergence loop: the
 * client signs what it sends, the server signs what it sends back, and
 * every signature verifies with the sending gateway's pinned public key.
 */
function expectSignedWireTraffic(pair: GatewayPair, fixture: StageFixture) {
  expect(pair.client.wire.recoverRequests).toHaveLength(1);
  const recoverRequest = pair.client.wire.recoverRequests[0];
  expect(recoverRequest.sessionId).toBe(fixture.sessionId);
  expect(
    verifySignature(pair.client.signer, recoverRequest, pair.client.pubKey),
  ).toBe(true);

  expect(pair.client.wire.recoverResponses).toHaveLength(1);
  expect(
    verifySignature(
      pair.server.signer,
      pair.client.wire.recoverResponses[0],
      pair.server.pubKey,
    ),
  ).toBe(true);

  expect(pair.client.wire.recoverSuccessRequests).toHaveLength(1);
  expect(
    verifySignature(
      pair.client.signer,
      pair.client.wire.recoverSuccessRequests[0],
      pair.client.pubKey,
    ),
  ).toBe(true);

  expect(pair.client.wire.recoverSuccessResponses).toHaveLength(1);
  expect(
    verifySignature(
      pair.server.signer,
      pair.client.wire.recoverSuccessResponses[0],
      pair.server.pubKey,
    ),
  ).toBe(true);
}

describe("v13 two-gateway crash-recovery convergence loop (in-process connect transport)", () => {
  let pair: GatewayPair;

  afterEach(async () => {
    if (pair) {
      await shutdownGatewayPair(pair);
      pair = undefined as unknown as GatewayPair;
    }
  });

  /**
   * The ported core scenario of the deleted v02 recovery-stage-N suites:
   * divergent gateways converge to identical stage state, signatures
   * verify, and the client session reaches RECOVERED.
   */
  async function expectStageConvergence(
    crashedStage: 1 | 2 | 3,
  ): Promise<void> {
    pair = await createWiredGatewayPair(monitorService);
    const fixture = makeStageFixture(
      crashedStage,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );

    // Client crashed mid-stage-N: its local log is a partial operation and
    // carries only the stale, incomplete session state.
    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );
    // Server completed stage N: its local log is a done operation and is
    // the authoritative state.
    const serverDoneLog = await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );

    await restartAndCheck(pair, fixture);

    const stageKey = `stage${crashedStage}`;
    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    const serverData = getSessionData(
      "server",
      pair.server.crashManager,
      fixture.sessionId,
    );

    // 1. The client session reached the terminal RECOVERED state.
    expect(clientData.state).toBe(State.RECOVERED);
    // The server session stays the authoritative ONGOING state (the
    // RecoverSuccess ack does not mutate server session state in v13).
    expect(serverData.state).toBe(State.ONGOING);

    // 2. Digest-level convergence: both gateways now hold identical
    // hashes, processed timestamps, and signatures for the whole session.
    expect(digestOf(clientData.hashes)).toBe(digestOf(serverData.hashes));
    expect(digestOf(clientData.processedTimestamps)).toBe(
      digestOf(serverData.processedTimestamps),
    );
    expect(digestOf(clientData.signatures)).toBe(
      digestOf(serverData.signatures),
    );

    // 3. Stage spot checks: the message the client was missing (the
    // server-originated receipt) is present and matches the server.
    const clientStageHashes = stageOf(clientData.hashes, stageKey);
    const serverStageHashes = stageOf(serverData.hashes, stageKey);
    expect(clientStageHashes[`${fixture.crashedRequest.field}Hash`]).toBe(
      fixture.crashedRequest.hash,
    );
    expect(clientStageHashes[`${fixture.crashedReceipt.field}Hash`]).toBe(
      fixture.crashedReceipt.hash,
    );
    expect(clientStageHashes[`${fixture.crashedReceipt.field}Hash`]).toBe(
      serverStageHashes[`${fixture.crashedReceipt.field}Hash`],
    );

    // 4. The converged signatures are real and verify cryptographically:
    // the client's request signature with the client key, the recovered
    // server receipt signature with the server key.
    const clientStageSignatures = stageOf(clientData.signatures, stageKey);
    expect(
      verifyHashSignature(
        pair.client.signer,
        fixture.crashedRequest.hash,
        clientStageSignatures[
          `${fixture.crashedRequest.field}Signature`
        ] as string,
        pair.client.pubKey,
      ),
    ).toBe(true);
    expect(
      verifyHashSignature(
        pair.server.signer,
        fixture.crashedReceipt.hash,
        clientStageSignatures[
          `${fixture.crashedReceipt.field}Signature`
        ] as string,
        pair.server.pubKey,
      ),
    ).toBe(true);

    // 5. Convergence is durable: the client persisted the recovered
    // server log, so its crash checkpoint moved to the server's "done".
    const clientLatestLog = await pair.client.localRepository.readLastestLog(
      fixture.sessionId,
    );
    expect(clientLatestLog.operation).toBe("done");
    const persistedCopy = await pair.client.localRepository.readById(
      serverDoneLog.key,
    );
    expect(persistedCopy).toBeDefined();
    expect(persistedCopy.data).toBe(serverDoneLog.data);

    // 6. Every message that traveled the crash channel was signed by its
    // origin gateway and verifies with the pinned key.
    expectSignedWireTraffic(pair, fixture);
  }

  it("converges a stage-1-crashed client to the server state (port of deleted recovery-stage-1)", async () => {
    await expectStageConvergence(1);
  });

  it("converges a stage-2-crashed client to the server state (port of deleted recovery-stage-2)", async () => {
    await expectStageConvergence(2);
  });

  it("converges a stage-3-crashed client to the server state (port of deleted recovery-stage-3)", async () => {
    await expectStageConvergence(3);
  });

  it("fails closed when the RecoverRequest is tampered with en route", async () => {
    // Tamper with the request after signing, exactly where an in-flight
    // attacker would sit: the server must reject it inside the recovery
    // loop and the client session must not converge.
    const tamperSequenceNumber: Interceptor = (next) => async (req) => {
      // The proto rpc name is Recover.
      if (req.method.name.toLowerCase() === "recover") {
        (req.message as RecoverRequest).sequenceNumber = 999;
      }
      return await next(req);
    };

    pair = await createWiredGatewayPair(monitorService, {
      clientToServerInterceptors: [tamperSequenceNumber],
    });
    const fixture = makeStageFixture(
      1,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );

    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );
    await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );

    await pair.client.crashManager.recoverSessions();
    await pair.server.crashManager.recoverSessions();
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    const clientSession = pair.client.crashManager.sessions.get(
      fixture.sessionId,
    )!;
    // The server verifies the RecoverRequest signature before answering,
    // so the tampered delivery is rejected inside the loop.
    await expect(
      pair.client.crashManager.checkAndResolveCrash(clientSession),
    ).rejects.toThrow(/Recovery failed/);

    // The request traveled, but no signed answer ever came back.
    expect(pair.client.wire.recoverRequests).toHaveLength(1);
    expect(pair.client.wire.recoverResponses).toHaveLength(0);

    // The client session kept its stale state: no receipt hash (the proto3
    // scalar stays at its empty default), no RECOVERED transition.
    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    expect(clientData.state).toBe(State.ONGOING);
    expect(
      stageOf(clientData.hashes, "stage1")[
        "transferProposalReceiptMessageHash"
      ],
    ).toBe("");

    // Nothing was persisted locally either: the crash checkpoint is still
    // the client's own partial log.
    const clientLatestLog = await pair.client.localRepository.readLastestLog(
      fixture.sessionId,
    );
    expect(clientLatestLog.operation).toBe("partial");
  });

  it("does not roll a client ahead of the server backwards (no logs beyond its sequence)", async () => {
    pair = await createWiredGatewayPair(monitorService);
    const fixture = makeStageFixture(
      1,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );
    // The client persisted far more work than the server ever saw.
    fixture.clientSessionData.lastSequenceNumber = BigInt(999);
    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );
    await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );

    await pair.client.crashManager.recoverSessions();
    await pair.server.crashManager.recoverSessions();
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    const clientSession = pair.client.crashManager.sessions.get(
      fixture.sessionId,
    )!;
    await expect(
      pair.client.crashManager.checkAndResolveCrash(clientSession),
    ).rejects.toThrow(/Recovery failed/);

    // The server verified the client's signed request and only then found
    // no logs beyond sequence 999 — a stale-server divergence is answered
    // with a failure, never with data the client would roll back to.
    expect(pair.client.wire.recoverRequests).toHaveLength(1);
    expect(pair.client.wire.recoverRequests[0].sequenceNumber).toBe(999);
    expect(
      verifySignature(
        pair.client.signer,
        pair.client.wire.recoverRequests[0],
        pair.client.pubKey,
      ),
    ).toBe(true);
    expect(pair.client.wire.recoverResponses).toHaveLength(0);

    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    expect(clientData.state).toBe(State.ONGOING);
    const clientLatestLog = await pair.client.localRepository.readLastestLog(
      fixture.sessionId,
    );
    expect(clientLatestLog.operation).toBe("partial");
  });

  // -------------------------------------------------------------------------
  // Round 4: client-side RecoverResponse enforcement (the crash-manager
  // processRecoverRequest fix) + hostile-delivery robustness through the
  // harness.
  // -------------------------------------------------------------------------

  it("client rejects a RecoverResponse whose serverSignature was forged en route (fail closed)", async () => {
    // An in-flight attacker on the server -> client leg replaces the
    // server's signature with one it can produce. The message stays
    // perfectly well-formed — only the signing key is wrong. Client-side
    // enforcement (verifySignature against the pinned server key, result
    // enforced) must catch exactly this; before the fix the verification
    // result was discarded, so this forgery was applied.
    const attackerKeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const attackerPubKey = bufArray2HexStr(attackerKeyPair.publicKey);
    const attackerSigner = new JsObjectSigner({
      privateKey: new Uint8Array(attackerKeyPair.privateKey),
    });

    const forgeServerSignature: Interceptor = (next) => async (req) => {
      const response = await next(req);
      if (req.method.name.toLowerCase() === "recover") {
        const message = response.message as RecoverResponse;
        // Sign exactly the way the server does: blank the signature field,
        // sign the canonical serialization, set the field.
        message.serverSignature = "";
        message.serverSignature = bufArray2HexStr(
          attackerSigner.sign(safeStableStringify(message)),
        );
      }
      return response;
    };

    pair = await createWiredGatewayPair(monitorService, {
      clientToServerInterceptors: [forgeServerSignature],
    });
    const fixture = makeStageFixture(
      1,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );
    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );
    const serverDoneLog = await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );

    await pair.client.crashManager.recoverSessions();
    await pair.server.crashManager.recoverSessions();
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    const clientSession = pair.client.crashManager.sessions.get(
      fixture.sessionId,
    )!;
    // Resolves: the client-side rejection makes handleRecovery return
    // false, the loop retries until maxRetries and then escalates to the
    // signed rollback flow — the same fail-closed escalation every other
    // client-side processing failure takes.
    await pair.client.crashManager.checkAndResolveCrash(clientSession);

    // maxRetries (3) attempts, each answered with a well-formed response
    // whose signature verifies ONLY under the attacker's key.
    expect(pair.client.wire.recoverRequests).toHaveLength(3);
    expect(pair.client.wire.recoverResponses).toHaveLength(3);
    for (const response of pair.client.wire.recoverResponses) {
      expect(response.serverSignature).not.toBe("");
      expect(
        verifySignature(pair.server.signer, response, pair.server.pubKey),
      ).toBe(false);
      expect(
        verifySignature(pair.client.signer, response, attackerPubKey),
      ).toBe(true);
    }

    // Fail closed: the forged logs were never applied to the session.
    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    expect(clientData.state).toBe(State.ONGOING);
    expect(
      stageOf(clientData.hashes, "stage1")[
        "transferProposalReceiptMessageHash"
      ],
    ).toBe("");

    // ... and never persisted either: the checkpoint is still the client's
    // own partial log and the server's done log never landed locally.
    const clientLatestLog = await pair.client.localRepository.readLastestLog(
      fixture.sessionId,
    );
    expect(clientLatestLog.operation).toBe("partial");
    expect(
      await pair.client.localRepository.readById(serverDoneLog.key),
    ).toBeUndefined();

    // The enforced rejection escalated to the rollback flow over the wire,
    // signed by the client and acked by the server.
    expect(pair.client.wire.rollbackRequests).toHaveLength(1);
    expect(
      verifySignature(
        pair.client.signer,
        pair.client.wire.rollbackRequests[0],
        pair.client.pubKey,
      ),
    ).toBe(true);
    expect(pair.client.wire.rollbackResponses).toHaveLength(1);
    expect(pair.client.wire.rollbackResponses[0].success).toBe(true);
  });

  it("rejects a RecoverResponse whose recovered logs arrive out of order (payload tamper breaks the signature)", async () => {
    // The server answers with its log history beyond the client's
    // checkpoint: an intermediate snapshot (sequence 2) plus the
    // authoritative done log (sequence 3). An in-flight attacker reorders
    // the recoveredLogs array before delivery: replaying the logs out of
    // order would re-apply a stale snapshot over the newer state. The
    // reordering is a payload mutation, so the serverSignature no longer
    // matches and the client must reject the WHOLE response — it never
    // applies a subset of an unverifiable response.
    const reorderLogs: Interceptor = (next) => async (req) => {
      const response = await next(req);
      if (req.method.name.toLowerCase() === "recover") {
        (response.message as RecoverResponse).recoveredLogs.reverse();
      }
      return response;
    };

    pair = await createWiredGatewayPair(monitorService, {
      clientToServerInterceptors: [reorderLogs],
    });
    const fixture = makeStageFixture(
      1,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );

    const earlierSnapshot = create(
      SessionDataSchema,
      fixture.serverSessionData,
    );
    earlierSnapshot.lastSequenceNumber = BigInt(2);
    // Distinct log key from the done entry (log keys are
    // {sessionId}-{stage}-{operation}): a mid-stage checkpoint plus the
    // completed stage.
    await insertStageLog(
      pair.server.localRepository,
      earlierSnapshot,
      "partial",
    );
    // The authoritative done checkpoint is one sequence beyond the
    // intermediate snapshot.
    fixture.serverSessionData.lastSequenceNumber = BigInt(3);
    const serverDoneLog = await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );
    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );

    await pair.client.crashManager.recoverSessions();
    await pair.server.crashManager.recoverSessions();
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    const clientSession = pair.client.crashManager.sessions.get(
      fixture.sessionId,
    )!;
    await pair.client.crashManager.checkAndResolveCrash(clientSession);

    // The reordering really happened on the wire — and it invalidated the
    // server signature over the payload.
    expect(pair.client.wire.recoverResponses).toHaveLength(3);
    const received = pair.client.wire.recoverResponses[0];
    expect(received.recoveredLogs.map((log) => log.sequenceNumber)).toEqual([
      3, 2,
    ]);
    expect(
      verifySignature(pair.server.signer, received, pair.server.pubKey),
    ).toBe(false);

    // Fail closed: NEITHER log was applied. No stale snapshot rolled the
    // client backwards and the done log never reached the repository.
    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    expect(clientData.state).toBe(State.ONGOING);
    expect(
      stageOf(clientData.hashes, "stage1")[
        "transferProposalReceiptMessageHash"
      ],
    ).toBe("");
    const clientLatestLog = await pair.client.localRepository.readLastestLog(
      fixture.sessionId,
    );
    expect(clientLatestLog.operation).toBe("partial");
    expect(
      await pair.client.localRepository.readById(serverDoneLog.key),
    ).toBeUndefined();
    expect(pair.client.wire.rollbackRequests).toHaveLength(1);
  });

  it("tolerates an out-of-order RecoverSuccessRequest before any recover exchange", async () => {
    // A RecoverSuccessRequest arrives BEFORE any RecoverRequest/Response
    // exchange (e.g. replayed after a gateway restart lost its in-flight
    // state). The protocol tolerates it: the server verifies the client's
    // signature, acks idempotently, and changes no state — and a normal
    // recovery loop afterwards still converges cleanly.
    pair = await createWiredGatewayPair(monitorService);
    const fixture = makeStageFixture(
      1,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );
    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );
    await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );

    await pair.client.crashManager.recoverSessions();
    await pair.server.crashManager.recoverSessions();
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    const serverDataBefore = getSessionData(
      "server",
      pair.server.crashManager,
      fixture.sessionId,
    );
    const serverDigestBefore = digestOf(serverDataBefore.hashes);

    const handler = pair.client.crashManager["crashRecoveryHandler"]!;
    const earlySuccess = await handler.sendRecoverSuccessRequest(
      fixture.clientSessionData,
    );
    const channel = pair.client.orchestrator
      .getChannels()
      .get(SERVER_GATEWAY_ID)!;
    const crashClient = channel.clients.get("crash") as PromiseConnectClient<
      typeof CrashRecoveryService
    >;
    const earlyAck = await crashClient.recoverSuccess(earlySuccess);

    expect(earlyAck.received).toBe(true);
    expect(
      verifySignature(pair.server.signer, earlyAck, pair.server.pubKey),
    ).toBe(true);

    // The out-of-order ack changed nothing on the server.
    const serverDataAfter = getSessionData(
      "server",
      pair.server.crashManager,
      fixture.sessionId,
    );
    expect(digestOf(serverDataAfter.hashes)).toBe(serverDigestBefore);
    expect(serverDataAfter.state).toBe(State.ONGOING);

    // The loop still converges normally afterwards.
    const clientSession = pair.client.crashManager.sessions.get(
      fixture.sessionId,
    )!;
    await pair.client.crashManager.checkAndResolveCrash(clientSession);

    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    expect(clientData.state).toBe(State.RECOVERED);
    expect(digestOf(clientData.hashes)).toBe(serverDigestBefore);
    expect(pair.client.wire.recoverRequests).toHaveLength(1);
    // the early ack plus the loop's own ack
    expect(pair.client.wire.recoverSuccessRequests).toHaveLength(2);
  });

  it("delivers the same RecoverRequest twice: idempotent server answers, single clean convergence", async () => {
    // The first delivery's ack may get lost, so the wire redelivers the
    // exact same signed RecoverRequest. The server must handle the replay
    // idempotently (verify + fetch, no state change, fresh valid answer)
    // and the client must still converge exactly once off the first answer.
    let recoverDeliveries = 0;
    const replayedAnswers: RecoverResponse[] = [];
    const duplicateDelivery: Interceptor = (next) => async (req) => {
      if (req.method.name.toLowerCase() === "recover") {
        const first = await next(req);
        const second = await next(req);
        recoverDeliveries += 2;
        replayedAnswers.push(second.message as RecoverResponse);
        return first;
      }
      return await next(req);
    };

    pair = await createWiredGatewayPair(monitorService, {
      clientToServerInterceptors: [duplicateDelivery],
    });
    const fixture = makeStageFixture(
      1,
      { pubKey: pair.client.pubKey, signer: pair.client.signer },
      { pubKey: pair.server.pubKey, signer: pair.server.signer },
    );
    await insertStageLog(
      pair.client.localRepository,
      fixture.clientSessionData,
      "partial",
      new Date(Date.now() - 5_000).toISOString(),
    );
    await insertStageLog(
      pair.server.localRepository,
      fixture.serverSessionData,
      "done",
    );

    await pair.client.crashManager.recoverSessions();
    await pair.server.crashManager.recoverSessions();
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    const serverDataBefore = getSessionData(
      "server",
      pair.server.crashManager,
      fixture.sessionId,
    );
    const serverDigestBefore = digestOf(serverDataBefore.hashes);

    const clientSession = pair.client.crashManager.sessions.get(
      fixture.sessionId,
    )!;
    await pair.client.crashManager.checkAndResolveCrash(clientSession);

    // The replay really reached the server handler twice.
    expect(recoverDeliveries).toBe(2);

    // Both server answers are signed and identical in content: handling a
    // duplicate is idempotent (signature check + log fetch only).
    const firstAnswer = pair.client.wire.recoverResponses[0];
    expect(
      verifySignature(pair.server.signer, firstAnswer, pair.server.pubKey),
    ).toBe(true);
    expect(
      verifySignature(
        pair.server.signer,
        replayedAnswers[0],
        pair.server.pubKey,
      ),
    ).toBe(true);
    expect(digestOf(replayedAnswers[0].recoveredLogs)).toBe(
      digestOf(firstAnswer.recoveredLogs),
    );
    expect(replayedAnswers[0].sessionId).toBe(fixture.sessionId);

    // The duplicate delivery did not corrupt the server's state.
    expect(
      digestOf(
        getSessionData("server", pair.server.crashManager, fixture.sessionId)
          .hashes,
      ),
    ).toBe(serverDigestBefore);

    // The client consumed exactly one answer: one recover exchange, one
    // signed success ack, converged state, and exactly one persisted done
    // log (no duplicate application into the repository).
    expect(pair.client.wire.recoverRequests).toHaveLength(1);
    expect(pair.client.wire.recoverSuccessRequests).toHaveLength(1);
    const clientData = getSessionData(
      "client",
      pair.client.crashManager,
      fixture.sessionId,
    );
    expect(clientData.state).toBe(State.RECOVERED);
    expect(digestOf(clientData.hashes)).toBe(serverDigestBefore);
    const clientLogs =
      await pair.client.localRepository.readLogsMoreRecentThanTimestamp("0");
    expect(clientLogs.filter((log) => log.operation === "done")).toHaveLength(
      1,
    );
  });

  it("recovers a burst of interleaved sessions through one crash channel without cross-session interference", async () => {
    pair = await createWiredGatewayPair(monitorService);
    const fixtures = [
      makeStageFixture(
        1,
        { pubKey: pair.client.pubKey, signer: pair.client.signer },
        { pubKey: pair.server.pubKey, signer: pair.server.signer },
      ),
      makeStageFixture(
        3,
        { pubKey: pair.client.pubKey, signer: pair.client.signer },
        { pubKey: pair.server.pubKey, signer: pair.server.signer },
      ),
    ];

    for (const fixture of fixtures) {
      await insertStageLog(
        pair.client.localRepository,
        fixture.clientSessionData,
        "partial",
        new Date(Date.now() - 5_000).toISOString(),
      );
      await insertStageLog(
        pair.server.localRepository,
        fixture.serverSessionData,
        "done",
      );
    }

    // v13 CrashManager.recoverSessions() rebuilds only the first log's
    // session on restart (a production single-session restart limitation,
    // out of scope here) — reconstruct both sessions through the same
    // public recreate path the manager itself uses.
    for (const fixture of fixtures) {
      pair.client.crashManager.sessions.set(
        fixture.sessionId,
        SATPSession.recreateSession(fixture.clientSessionData, monitorService),
      );
      pair.server.crashManager.sessions.set(
        fixture.sessionId,
        SATPSession.recreateSession(fixture.serverSessionData, monitorService),
      );
    }
    pair.client.crashManager.pauseScheduler();
    pair.server.crashManager.pauseScheduler();

    // Interleaved burst: both sessions recover concurrently through the
    // same crash channel client.
    await Promise.all(
      fixtures.map((fixture) =>
        pair.client.crashManager.checkAndResolveCrash(
          pair.client.crashManager.sessions.get(fixture.sessionId)!,
        ),
      ),
    );

    for (const fixture of fixtures) {
      const clientData = getSessionData(
        "client",
        pair.client.crashManager,
        fixture.sessionId,
      );
      const serverData = getSessionData(
        "server",
        pair.server.crashManager,
        fixture.sessionId,
      );
      const other = fixtures.find(
        (candidate) => candidate.sessionId !== fixture.sessionId,
      )!;
      const otherServerData = getSessionData(
        "server",
        pair.server.crashManager,
        other.sessionId,
      );

      expect(clientData.state).toBe(State.RECOVERED);
      // Each session converged to ITS OWN server state — and provably not
      // to the other session's.
      expect(digestOf(clientData.hashes)).toBe(digestOf(serverData.hashes));
      expect(digestOf(clientData.processedTimestamps)).toBe(
        digestOf(serverData.processedTimestamps),
      );
      expect(digestOf(clientData.signatures)).toBe(
        digestOf(serverData.signatures),
      );
      expect(digestOf(clientData.hashes)).not.toBe(
        digestOf(otherServerData.hashes),
      );

      // Durable per-session checkpoint: each session persisted its own
      // server done log.
      const clientLatestLog = await pair.client.localRepository.readLastestLog(
        fixture.sessionId,
      );
      expect(clientLatestLog.operation).toBe("done");
    }

    // Exactly one recover exchange per session, each carrying its own id.
    expect(pair.client.wire.recoverRequests).toHaveLength(2);
    expect(
      new Set(pair.client.wire.recoverRequests.map((msg) => msg.sessionId)),
    ).toEqual(new Set(fixtures.map((fixture) => fixture.sessionId)));
    expect(pair.client.wire.recoverSuccessRequests).toHaveLength(2);
    expect(
      new Set(
        pair.client.wire.recoverSuccessRequests.map((msg) => msg.sessionId),
      ),
    ).toEqual(new Set(fixtures.map((fixture) => fixture.sessionId)));
  });
});
