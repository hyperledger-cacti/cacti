/**
 * Property / fuzz tests for the untrusted-JSON boundary of the SATP
 * inspector.
 *
 * `apps/satp/transform.ts` parses raw gateway REST payloads (attacker-
 * controllable whenever the configured gateway URL is) into typed view
 * models. The invariant asserted here: for arbitrary hostile input the
 * transforms either produce valid typed output or degrade gracefully -
 * they never throw uncontrolled, never leak NaN/Infinity into typed
 * numeric fields, never emit arrays/primitives where an object is typed,
 * and never let a JSON payload pollute Object.prototype.
 *
 * Uses fast-check (seeded for reproducibility) plus deterministic
 * adversarial cases. Run with: `yarn workspace
 * @hyperledger-cacti/cacti-ledger-browser test:unit`.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  buildGatewayPairStats,
  buildGatewayStats,
  buildMessageLog,
  buildMessageTypeStats,
  buildSessionDetail,
  buildSessionRows,
  buildTimeline,
  collectLatestClaims,
  deriveFailureInfo,
  groupAuditEntriesBySession,
  matchAuditSessionId,
  parseSessionSnapshot,
  satpStateLabel,
  type SatpAuditEntryInput,
  type SatpSessionSnapshot,
} from "../../../main/typescript/apps/satp/transform";

/** Fixed seed so shrinking + corpus are reproducible run-to-run. */
const FC_PARAMS = { seed: 20260918, numRuns: 300 } as const;

/** Numbers a hostile gateway may deliver, incl. non-finite outliers. */
const arbNumber: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -1e12, max: 1e12 }),
  fc.constant(0),
  fc.constant(-0),
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY),
  fc.double({ min: -1e12, max: 1e12 }),
);

/** Adversarial strings: random, full-unicode, control chars, huge. */
const arbString: fc.Arbitrary<string> = fc.oneof(
  fc.string({ maxLength: 64 }),
  fc.fullUnicodeString({ maxLength: 64 }),
  fc.constant("\u0000\u0001\t\n\r \u202E\uFEFF"),
  fc.constant("x".repeat(1_000_000)),
);

const arbSnapshotString: fc.Arbitrary<string> = fc.oneof(
  arbString,
  fc.json({ maxDepth: 3 }),
  // JSON has no NaN/Infinity literals but 1e999 parses to Infinity.
  fc.constant('{"state": 1e999, "errorCode": {"code": 1e999}}'),
  fc.constant('{"__proto__": {"polluted": true}}'),
);

const arbSessionLog: fc.Arbitrary<SatpAuditEntryInput["session"]> = fc.record({
  sessionId: arbString,
  type: arbString,
  key: fc.option(arbString, { nil: undefined }),
  operation: fc.option(arbString, { nil: undefined }),
  timestamp: fc.option(arbString, { nil: undefined }),
  data: fc.option(arbSnapshotString, { nil: undefined }),
  sequenceNumber: fc.option(arbNumber, { nil: undefined }),
});

const arbAuditEntry: fc.Arbitrary<SatpAuditEntryInput> = fc.record({
  auditEntryId: fc.option(arbString, { nil: undefined }),
  timestamp: arbNumber,
  session: arbSessionLog,
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

describe("parseSessionSnapshot fuzzing", () => {
  it("returns undefined or a plain object for any input string, never throws", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (raw) => {
        const snapshot = parseSessionSnapshot(raw);
        if (snapshot !== undefined) {
          expect(isPlainObject(snapshot)).toBe(true);
        }
      }),
      FC_PARAMS,
    );
  });

  it("returns undefined or a plain object for arbitrary JSON documents", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (json) => {
        const snapshot = parseSessionSnapshot(JSON.stringify(json));
        if (json !== null && isPlainObject(json)) {
          expect(snapshot).toBeDefined();
          expect(isPlainObject(snapshot)).toBe(true);
        } else {
          expect(snapshot).toBeUndefined();
        }
      }),
      FC_PARAMS,
    );
  });

  it("never emits corrupted typed data from numbers that parse to NaN/Infinity", () => {
    // `1e999` is valid JSON that JavaScript parses to Infinity.
    const snapshot = parseSessionSnapshot(
      '{"state": 1e999, "lastSequenceNumber": 1e999}',
    );
    expect(snapshot).toBeDefined();
    expect(snapshot?.state).toBe(Number.POSITIVE_INFINITY);
    // The state label degrades to a plain string - never a throw or NaN leak.
    expect(satpStateLabel(snapshot?.state)).toBe("UNKNOWN_Infinity");
    expect(satpStateLabel(Number.NaN)).toBe("UNKNOWN_NaN");
    expect(deriveFailureInfo(snapshot).failed).toBe(false);
  });

  it("rejects malformed JSON (controlled error -> undefined)", () => {
    for (const raw of [
      "{",
      "not-json{",
      "[1,2,3]",
      "null",
      '"string"',
      "42",
      '{"state": NaN}', // NaN is not valid JSON
      '{"state": Infinity}', // Infinity is not valid JSON
      '{"state": undefined}',
    ]) {
      expect(parseSessionSnapshot(raw)).toBeUndefined();
    }
  });

  it("is not vulnerable to prototype pollution via __proto__ keys", () => {
    const snapshot = parseSessionSnapshot(
      '{"__proto__": {"polluted": true}, "state": 2}',
    );
    expect(snapshot).toBeDefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("polluted");
    // The __proto__ key is a regular own property of the parsed object.
    expect(Object.keys(snapshot ?? {})).toContain("__proto__");
  });

  it("handles adversarial strings (control chars, unicode, very long)", () => {
    const adversarial = [
      '{"sessionId": "\\u0000\\u0001\\u0002"}',
      '{"sessionId": "' + "x".repeat(1_000_000) + '"}',
      '{"senderGatewayNetworkId": "\\u202Egnp.retfas"}',
      '{"digitalAssetId": "🎨💎\uD83D\uDE00"}',
      '{"sourceBasePath": "line1\\nline2\\ttab"}',
      JSON.stringify({ state: 2, hashes: { "\u0000": "\u0000" } }),
    ];
    for (const raw of adversarial) {
      const snapshot = parseSessionSnapshot(raw);
      if (snapshot !== undefined) {
        expect(isPlainObject(snapshot)).toBe(true);
      }
    }
    // A 1 MB snapshot string parses without throwing.
    expect(
      parseSessionSnapshot('{"sessionId": "' + "y".repeat(1_000_000) + '"}'),
    ).toBeDefined();
  });

  it("tolerates null-prototype snapshot objects passed directly", () => {
    const snapshot = Object.create(null) as SatpSessionSnapshot;
    snapshot.state = 5;
    snapshot.errorCode = { code: 1 };

    const info = deriveFailureInfo(snapshot);
    expect(info.failed).toBe(true);
    expect(info.stateLabel).toBe("ERROR");
    expect(info.errorDetail).toBe(JSON.stringify({ code: 1 }));

    const events = buildTimeline([
      {
        auditEntryId: "e1",
        timestamp: 1000,
        session: { sessionId: "s", type: "T", sequenceNumber: 0 },
      },
    ]);
    // No snapshot in entries; claims merge over null-proto is not reachable
    // through JSON but must not throw for direct callers either.
    expect(collectLatestClaims(events)).toEqual({});
  });
});

describe("buildTimeline / buildSessionDetail fuzzing", () => {
  it("preserves event count and emits only finite numbers or undefined", () => {
    fc.assert(
      fc.property(fc.array(arbAuditEntry, { maxLength: 32 }), (entries) => {
        const events = buildTimeline(entries);
        expect(events).toHaveLength(entries.length);
        for (const event of events) {
          expect(isFiniteNumber(event.sequenceNumber)).toBe(true);
          if (event.timestampMs !== undefined) {
            expect(isFiniteNumber(event.timestampMs)).toBe(true);
          }
          if (event.snapshot !== undefined) {
            expect(isPlainObject(event.snapshot)).toBe(true);
          }
          expect(typeof event.type).toBe("string");
          expect(typeof event.operation).toBe("string");
        }
      }),
      FC_PARAMS,
    );
  });

  it("degrades non-finite sequence numbers and timestamps to the fallbacks", () => {
    const events = buildTimeline([
      {
        timestamp: Number.NaN,
        session: { sessionId: "s1", type: "T", sequenceNumber: Number.NaN },
      },
      {
        timestamp: Number.POSITIVE_INFINITY,
        session: {
          sessionId: "s2",
          type: "T",
          sequenceNumber: Number.NEGATIVE_INFINITY,
          timestamp: "garbage",
        },
      },
      {
        timestamp: 5,
        session: {
          sessionId: "s3",
          type: "T",
          sequenceNumber: Number.POSITIVE_INFINITY,
        },
      },
    ]);
    expect(events.map((event) => event.sequenceNumber)).toEqual([0, 0, 0]);
    expect(events[0].timestampMs).toBeUndefined();
    expect(events[1].timestampMs).toBeUndefined();
    expect(events[2].timestampMs).toBe(5);
  });

  it("buildSessionDetail never throws and keeps the requested session id", () => {
    fc.assert(
      fc.property(
        arbString,
        fc.array(arbAuditEntry, { maxLength: 32 }),
        (sessionId, entries) => {
          const detail = buildSessionDetail(sessionId, entries);
          expect(detail.sessionId).toBe(sessionId);
          expect(detail.events).toHaveLength(entries.length);
          if (detail.latestSnapshot !== undefined) {
            expect(isPlainObject(detail.latestSnapshot)).toBe(true);
          }
        },
      ),
      FC_PARAMS,
    );
  });
});

describe("buildSessionRows fuzzing", () => {
  it("emits rows with valid typed fields for arbitrary gateway data", () => {
    fc.assert(
      fc.property(
        fc.array(arbString, { maxLength: 8 }),
        fc.array(arbAuditEntry, { maxLength: 32 }),
        (sessionIds, auditEntries) => {
          const rows = buildSessionRows({
            sessionIds,
            statuses: {},
            auditEntries,
          });

          for (const row of rows) {
            expect(typeof row.sessionId).toBe("string");
            expect(isFiniteNumber(row.eventCount)).toBe(true);
            if (row.lastActivityMs !== undefined) {
              expect(isFiniteNumber(row.lastActivityMs)).toBe(true);
            }
            if (row.startTimeMs !== undefined) {
              expect(isFiniteNumber(row.startTimeMs)).toBe(true);
            }
            for (const label of [
              row.stateLabel,
              row.sourceLedger,
              row.destinationLedger,
              row.senderGateway,
              row.recipientGateway,
              row.assetId,
            ]) {
              if (label !== undefined) {
                expect(typeof label).toBe("string");
              }
            }
          }
        },
      ),
      FC_PARAMS,
    );
  });

  it("keeps invalid startTime from corrupting typed output", () => {
    const rows = buildSessionRows({
      sessionIds: ["s1"],
      statuses: {
        s1: {
          status: "DONE",
          substatus: "COMPLETED",
          stage: "STAGE_3",
          startTime: "not-a-timestamp",
        },
      },
      auditEntries: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].startTimeMs).toBeUndefined();
    expect(rows[0].status).toBe("DONE");
  });
});

describe("message log / aggregate fuzzing", () => {
  it("buildMessageLog emits only finite numbers or undefined", () => {
    fc.assert(
      fc.property(fc.array(arbAuditEntry, { maxLength: 32 }), (entries) => {
        for (const entry of buildMessageLog(entries)) {
          expect(isFiniteNumber(entry.sequenceNumber)).toBe(true);
          if (entry.timestampMs !== undefined) {
            expect(isFiniteNumber(entry.timestampMs)).toBe(true);
          }
        }
      }),
      FC_PARAMS,
    );
  });

  it("buildMessageTypeStats counts are consistent and timestamps finite", () => {
    fc.assert(
      fc.property(fc.array(arbAuditEntry, { maxLength: 32 }), (entries) => {
        const stats = buildMessageTypeStats(entries);
        const total = stats.reduce((sum, stat) => sum + stat.count, 0);
        expect(total).toBe(entries.length);
        for (const stat of stats) {
          expect(isFiniteNumber(stat.count)).toBe(true);
          if (stat.lastTimestampMs !== undefined) {
            expect(isFiniteNumber(stat.lastTimestampMs)).toBe(true);
          }
        }
      }),
      FC_PARAMS,
    );
  });

  it("buildGatewayStats / buildGatewayPairStats stay typed and bounded", () => {
    fc.assert(
      fc.property(fc.array(arbAuditEntry, { maxLength: 32 }), (entries) => {
        for (const stat of buildGatewayStats(entries)) {
          expect(typeof stat.gatewayId).toBe("string");
          const counted =
            stat.completedCount + stat.failedCount + stat.ongoingCount;
          expect(counted).toBeLessThanOrEqual(stat.sessionIds.length);
          if (stat.lastActivityMs !== undefined) {
            expect(isFiniteNumber(stat.lastActivityMs)).toBe(true);
          }
        }
        for (const pair of buildGatewayPairStats(entries)) {
          expect(typeof pair.senderGateway).toBe("string");
          expect(typeof pair.recipientGateway).toBe("string");
          if (pair.lastActivityMs !== undefined) {
            expect(isFiniteNumber(pair.lastActivityMs)).toBe(true);
          }
          for (const ledger of pair.ledgers) {
            expect(typeof ledger).toBe("string");
          }
        }
      }),
      FC_PARAMS,
    );
  });
});

describe("grouping / matching fuzzing", () => {
  it("groupAuditEntriesBySession keeps all entries and string keys", () => {
    fc.assert(
      fc.property(fc.array(arbAuditEntry, { maxLength: 32 }), (entries) => {
        const groups = groupAuditEntriesBySession(entries);
        let grouped = 0;
        for (const [key, list] of groups) {
          expect(typeof key).toBe("string");
          grouped += list.length;
        }
        expect(grouped).toBe(entries.length);
      }),
      FC_PARAMS,
    );
  });

  it("matchAuditSessionId returns a member of the list or undefined", () => {
    fc.assert(
      fc.property(
        fc.array(arbString, { maxLength: 8 }),
        arbString,
        (auditIds, sessionId) => {
          const match = matchAuditSessionId(auditIds, sessionId);
          if (match !== undefined) {
            expect(auditIds).toContain(match);
          }
          // Empty audit IDs never prefix-match anything.
          if (sessionId.length > 0 && !auditIds.includes(sessionId)) {
            for (const auditId of auditIds) {
              if (auditId.length === 0) {
                expect(match).not.toBe(auditId);
              }
            }
          }
        },
      ),
      FC_PARAMS,
    );
  });

  it("deriveFailureInfo stays typed for arbitrary snapshots", () => {
    fc.assert(
      fc.property(
        fc.jsonValue(),
        fc.record({
          status: fc.option(arbString, { nil: undefined }),
        }),
        (stateValue, status) => {
          const snapshot: SatpSessionSnapshot = {
            state: stateValue as number,
          };
          const info = deriveFailureInfo(snapshot, status);
          expect(typeof info.failed).toBe("boolean");
          if (info.errorDetail !== undefined) {
            expect(typeof info.errorDetail).toBe("string");
          }
        },
      ),
      FC_PARAMS,
    );
  });
});
