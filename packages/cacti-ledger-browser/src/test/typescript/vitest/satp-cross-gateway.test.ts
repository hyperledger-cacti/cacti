/**
 * Cross-gateway merging and the session-level helpers behind the session
 * detail view: merged session rows, gateway role, asset summary, PromQL
 * selector, stage/outcome per gateway, message annotations.
 */
import { describe, expect, it } from "vitest";

import { mergeGatewaySessionRows } from "../../../main/typescript/apps/satp/sessions-view";
import {
  collectSessionAssets,
  deriveGatewayRole,
  deriveLocalGatewayId,
  promSessionSelector,
  summarizeAsset,
  type SatpSessionRow,
} from "../../../main/typescript/apps/satp/transform";
import {
  furthestStage,
  parseStatusStage,
  sideOutcome,
} from "../../../main/typescript/apps/satp/components/DualGatewayFlowCard";
import {
  annotateSnapshot,
  isEvidenceKind,
} from "../../../main/typescript/apps/satp/message-annotations";

const row = (overrides: Partial<SatpSessionRow>): SatpSessionRow => ({
  sessionId: "s-1",
  eventCount: 0,
  hasRollback: false,
  ...overrides,
});

describe("mergeGatewaySessionRows", () => {
  it("merges the same session from two gateways into one row", () => {
    const merged = mergeGatewaySessionRows([
      {
        gatewayName: "Origin",
        rows: [
          row({
            eventCount: 5,
            status: "PENDING",
            stateLabel: "ONGOING",
            startTimeMs: 100,
            lastActivityMs: 500,
            sourceLedger: "Besu",
          }),
        ],
      },
      {
        gatewayName: "Destination",
        rows: [
          row({
            eventCount: 2,
            status: "DONE",
            destinationLedger: "Fabric",
            startTimeMs: 50,
            lastActivityMs: 900,
            hasRollback: true,
          }),
        ],
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      sessionId: "s-1",
      // the gateway with more events wins per field ...
      status: "PENDING",
      stateLabel: "ONGOING",
      sourceLedger: "Besu",
      // ... gaps are filled from the other gateway
      destinationLedger: "Fabric",
      eventCount: 7,
      startTimeMs: 50,
      lastActivityMs: 900,
      hasRollback: true,
      observedOn: ["Origin", "Destination"],
    });
  });

  it("keeps sessions seen on one gateway only and sorts by activity", () => {
    const merged = mergeGatewaySessionRows([
      {
        gatewayName: "A",
        rows: [row({ sessionId: "old", lastActivityMs: 1 })],
      },
      {
        gatewayName: "B",
        rows: [row({ sessionId: "new", lastActivityMs: 9 })],
      },
    ]);
    expect(merged.map((entry) => [entry.sessionId, entry.observedOn])).toEqual([
      ["new", ["B"]],
      ["old", ["A"]],
    ]);
  });
});

describe("deriveGatewayRole / deriveLocalGatewayId", () => {
  it("maps proto session.Type: CLIENT starts the transfer, SERVER is the counterparty", () => {
    const snapshot = {
      senderGatewayNetworkId: "S",
      recipientGatewayNetworkId: "R",
    };
    expect(deriveGatewayRole({ ...snapshot, role: 1 })).toBe("client");
    expect(deriveGatewayRole({ ...snapshot, role: 2 })).toBe("server");
    expect(deriveGatewayRole({ ...snapshot, role: 0 })).toBeUndefined();
    expect(deriveLocalGatewayId({ ...snapshot, role: 1 })).toBe("S");
    expect(deriveLocalGatewayId({ ...snapshot, role: 2 })).toBe("R");
    expect(deriveLocalGatewayId(snapshot)).toBeUndefined();
  });
});

describe("summarizeAsset / collectSessionAssets", () => {
  it("reads the serialized Asset fields", () => {
    expect(
      summarizeAsset({
        tokenId: "SATPToken",
        amount: 100,
        owner: "0xabc",
        networkId: { id: "BesuLedgerTestNetwork", type: "BESU_2X" },
      }),
    ).toEqual({
      tokenId: "SATPToken",
      amount: "100",
      owner: "0xabc",
      contractName: undefined,
      contractAddress: undefined,
      networkId: "BesuLedgerTestNetwork",
      tokenType: undefined,
    });
    expect(summarizeAsset(undefined)).toBeUndefined();
    expect(summarizeAsset({})).toBeUndefined();
    expect(summarizeAsset("asset")).toBeUndefined();
  });

  it("keeps the latest asset of each side across the timeline", () => {
    const assets = collectSessionAssets([
      {
        type: "A",
        sequenceNumber: 1,
        operation: "",
        snapshot: { senderAsset: { amount: "1" } },
      },
      {
        type: "B",
        sequenceNumber: 2,
        operation: "",
        snapshot: { receiverAsset: { amount: "2" } },
      },
      { type: "C", sequenceNumber: 3, operation: "", snapshot: {} },
    ]);
    expect(assets.sender?.amount).toBe("1");
    expect(assets.receiver?.amount).toBe("2");
  });
});

describe("promSessionSelector", () => {
  it("builds a sessionId label matcher", () => {
    expect(promSessionSelector("abc-1")).toBe('{sessionId="abc-1"}');
  });

  it("escapes quotes and backslashes so the ID cannot break out", () => {
    const selector = promSessionSelector('x"} or vector(1) or {a="\\');
    expect(selector).toBe('{sessionId="x\\"} or vector(1) or {a=\\"\\\\"}');
  });
});

describe("parseStatusStage / furthestStage / sideOutcome", () => {
  it("parses /status stage values", () => {
    expect(parseStatusStage("STAGE_2")).toBe(2);
    expect(parseStatusStage("3")).toBe(3);
    expect(parseStatusStage(undefined)).toBeUndefined();
    expect(parseStatusStage("unknown")).toBeUndefined();
  });

  it("takes the furthest stage from /status or the audit log, ignoring rollbacks", () => {
    expect(
      furthestStage(
        { stage: "STAGE_1" },
        {
          sessionId: "s",
          events: [
            { type: "LOCK_ASSERT", sequenceNumber: 1, operation: "" },
            {
              type: "TRANSFER_ROLLBACK_COMMIT",
              sequenceNumber: 2,
              operation: "",
            },
          ],
        },
      ),
    ).toBe(2);
  });

  it("reports DONE as completed (the /status enum has no COMPLETED status)", () => {
    expect(sideOutcome({ status: "DONE" })).toBe("completed");
    expect(sideOutcome({ status: "FAILED" })).toBe("failed");
    expect(sideOutcome({ status: "PENDING" })).toBe("in-flight");
    expect(sideOutcome(undefined, undefined)).toBe("unknown");
  });
});

describe("annotateSnapshot", () => {
  it("annotates fields and flags hashes, signatures and claims as evidence", () => {
    const fields = annotateSnapshot({
      transferContextId: "ctx",
      lastMessageHash: "0xa1b2c3",
      lockAssertionClaim: { receipt: "r" },
      serverGatewayPubkey: "0x04d5e6",
      customSignatureField: "sig",
      empty: "",
      nothing: null,
    });
    const byField = Object.fromEntries(
      fields.map((field) => [field.field, field]),
    );
    expect(byField.transferContextId.kind).toBe("identity");
    expect(byField.lastMessageHash.kind).toBe("hash");
    expect(byField.lastMessageHash.note).toMatch(/hash chain/);
    expect(byField.lockAssertionClaim.kind).toBe("claim");
    expect(byField.lockAssertionClaim.value).toContain('"receipt": "r"');
    expect(byField.customSignatureField.kind).toBe("signature");
    expect(byField.empty).toBeUndefined();
    expect(byField.nothing).toBeUndefined();
    expect(fields[0].kind).toBe("identity");
    expect(isEvidenceKind("hash")).toBe(true);
    expect(isEvidenceKind("identity")).toBe(false);
  });
});
