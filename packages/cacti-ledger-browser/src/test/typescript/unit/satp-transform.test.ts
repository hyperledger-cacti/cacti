import {
  buildGatewayPairStats,
  buildGatewayStats,
  buildMessageTypeStats,
  buildSessionDetail,
  collectLatestClaims,
  buildSessionRows,
  buildTimeline,
  deriveFailureInfo,
  deriveStage,
  groupAuditEntriesBySession,
  isRollbackType,
  matchAuditSessionId,
  parseSessionSnapshot,
  satpStateLabel,
  type SatpAuditEntryInput,
} from "./../../../main/typescript/apps/satp/transform";

function makeAuditEntry(
  sessionId: string,
  sequenceNumber: number,
  data?: string,
  timestamp = 1700000000000 + sequenceNumber,
): SatpAuditEntryInput {
  return {
    auditEntryId: `${sessionId}-${sequenceNumber}`,
    timestamp,
    session: {
      sessionId,
      type: `TYPE_${sequenceNumber}`,
      key: `${sessionId}-${sequenceNumber}-key`,
      operation: "test",
      timestamp: String(timestamp),
      data,
      sequenceNumber,
    },
  };
}

describe("SATP transform helpers", () => {
  describe("parseSessionSnapshot", () => {
    it("parses a serialized SessionData snapshot", () => {
      const snapshot = parseSessionSnapshot(
        JSON.stringify({
          transferContextId: "ctx-1",
          digitalAssetId: "asset-1",
          state: 2,
        }),
      );

      expect(snapshot?.transferContextId).toBe("ctx-1");
      expect(snapshot?.digitalAssetId).toBe("asset-1");
      expect(snapshot?.state).toBe(2);
    });

    it("returns undefined for undefined or malformed data", () => {
      expect(parseSessionSnapshot(undefined)).toBeUndefined();
      expect(parseSessionSnapshot("")).toBeUndefined();
      expect(parseSessionSnapshot("not-json{")).toBeUndefined();
      expect(parseSessionSnapshot("[1,2,3]")).toBeUndefined();
    });
  });

  describe("satpStateLabel", () => {
    it("maps protobuf State enum numbers to labels", () => {
      expect(satpStateLabel(1)).toBe("ONGOING");
      expect(satpStateLabel(2)).toBe("COMPLETED");
      expect(satpStateLabel(5)).toBe("ERROR");
      expect(satpStateLabel(7)).toBe("RECOVERING");
    });

    it("returns undefined for missing state and a fallback for unknown values", () => {
      expect(satpStateLabel(undefined)).toBeUndefined();
      expect(satpStateLabel(99)).toBe("UNKNOWN_99");
    });
  });

  describe("buildTimeline", () => {
    it("sorts events by sequence number and parses snapshots", () => {
      const events = buildTimeline([
        makeAuditEntry("s1", 2, JSON.stringify({ state: 2 })),
        makeAuditEntry("s1", 0, JSON.stringify({ state: 1 })),
        makeAuditEntry("s1", 1),
      ]);

      expect(events.map((event) => event.sequenceNumber)).toEqual([0, 1, 2]);
      expect(events[0].snapshot?.state).toBe(1);
      expect(events[1].snapshot).toBeUndefined();
      expect(events[0].timestampMs).toBeDefined();
    });
  });

  describe("buildSessionDetail", () => {
    it("exposes the snapshot of the highest numbered event carrying one", () => {
      const detail = buildSessionDetail("s1", [
        makeAuditEntry("s1", 0, JSON.stringify({ state: 1 })),
        makeAuditEntry("s1", 1),
        makeAuditEntry("s1", 2, JSON.stringify({ state: 2 })),
      ]);

      expect(detail.sessionId).toBe("s1");
      expect(detail.latestSnapshot?.state).toBe(2);
    });
  });

  describe("groupAuditEntriesBySession", () => {
    it("groups entries by their audit session id", () => {
      const groups = groupAuditEntriesBySession([
        makeAuditEntry("ctx-1#a", 0),
        makeAuditEntry("ctx-1#a", 1),
        makeAuditEntry("ctx-2#b", 0),
      ]);

      expect(groups.get("ctx-1#a")).toHaveLength(2);
      expect(groups.get("ctx-2#b")).toHaveLength(1);
    });
  });

  describe("matchAuditSessionId", () => {
    const auditIds = ["ctx-1#suffix-1", "ctx-2#suffix-2"];

    it("returns exact matches", () => {
      expect(matchAuditSessionId(auditIds, "ctx-1#suffix-1")).toBe(
        "ctx-1#suffix-1",
      );
    });

    it("matches audit ids that carry a correlation suffix", () => {
      expect(matchAuditSessionId(auditIds, "ctx-1")).toBe("ctx-1#suffix-1");
    });

    it("matches when the requested id carries the suffix", () => {
      expect(matchAuditSessionId(["ctx-1"], "ctx-1#suffix-1")).toBe("ctx-1");
    });

    it("returns undefined when nothing matches", () => {
      expect(matchAuditSessionId(auditIds, "ctx-3")).toBeUndefined();
    });
  });

  describe("collectLatestClaims", () => {
    it("merges claims across the timeline, latest event wins", () => {
      const events = buildTimeline([
        makeAuditEntry(
          "s1",
          1,
          JSON.stringify({ lockAssertionClaim: { claimId: "old-lock" } }),
        ),
        makeAuditEntry(
          "s1",
          2,
          JSON.stringify({ transferInitClaims: [{ claimId: "init" }] }),
        ),
        makeAuditEntry(
          "s1",
          3,
          JSON.stringify({ lockAssertionClaim: { claimId: "new-lock" } }),
        ),
        makeAuditEntry("s1", 4),
      ]);

      const claims = collectLatestClaims(events);

      expect(claims.transferInitClaims).toEqual([{ claimId: "init" }]);
      expect(claims.lockAssertionClaim).toEqual({ claimId: "new-lock" });
      expect(claims.mintAssertionClaim).toBeUndefined();
    });
  });

  describe("deriveFailureInfo", () => {
    it("flags failed and rejected session states", () => {
      expect(deriveFailureInfo({ state: 5 }).failed).toBe(true);
      expect(deriveFailureInfo({ state: 3 }).failed).toBe(true);
      expect(deriveFailureInfo({ state: 4 }).failed).toBe(true);
    });

    it("does not flag ongoing or completed sessions", () => {
      expect(deriveFailureInfo({ state: 1 }).failed).toBe(false);
      expect(deriveFailureInfo({ state: 2 }).failed).toBe(false);
      expect(deriveFailureInfo({ state: 7 }).failed).toBe(false);
    });

    it("flags sessions whose status endpoint reports FAILED", () => {
      expect(deriveFailureInfo(undefined, { status: "FAILED" }).failed).toBe(
        true,
      );
    });

    it("stringifies structured error details", () => {
      const info = deriveFailureInfo({
        state: 5,
        errorCode: { code: 500, message: "boom" },
      });

      expect(info.stateLabel).toBe("ERROR");
      expect(info.errorDetail).toBe(
        JSON.stringify({ code: 500, message: "boom" }),
      );
    });
  });

  describe("buildSessionRows", () => {
    const auditEntries = [
      makeAuditEntry("ctx-1#sfx", 0, JSON.stringify({ state: 1 }), 1000),
      makeAuditEntry(
        "ctx-1#sfx",
        1,
        JSON.stringify({
          state: 2,
          sourceBasePath: "besu-network-a",
          recipientBasePath: "fabric-network-b",
          senderGatewayNetworkId: "gw-sender",
          recipientGatewayNetworkId: "gw-recipient",
          digitalAssetId: "asset-42",
        }),
        2000,
      ),
      makeAuditEntry("ctx-2#sfx", 0, JSON.stringify({ state: 1 }), 3000),
    ];

    it("joins session ids, statuses and audit data into rows", () => {
      const rows = buildSessionRows({
        sessionIds: ["ctx-1", "ctx-2", "ctx-3"],
        statuses: {
          "ctx-1": { status: "DONE", substatus: "COMPLETED", stage: "STAGE_3" },
          "ctx-3": {
            status: "PENDING",
            substatus: "WAIT_SOURCE_CONFIRMATIONS",
          },
        },
        auditEntries,
      });

      expect(rows).toHaveLength(3);

      const row1 = rows.find((row) => row.sessionId === "ctx-1");
      expect(row1?.status).toBe("DONE");
      expect(row1?.substatus).toBe("COMPLETED");
      expect(row1?.stage).toBe("STAGE_3");
      expect(row1?.eventCount).toBe(2);
      expect(row1?.lastActivityMs).toBe(2000);
      expect(row1?.stateLabel).toBe("COMPLETED");
      expect(row1?.sourceLedger).toBe("besu-network-a");
      expect(row1?.destinationLedger).toBe("fabric-network-b");
      expect(row1?.senderGateway).toBe("gw-sender");
      expect(row1?.recipientGateway).toBe("gw-recipient");
      expect(row1?.assetId).toBe("asset-42");

      const row3 = rows.find((row) => row.sessionId === "ctx-3");
      expect(row3?.status).toBe("PENDING");
      expect(row3?.eventCount).toBe(0);
      expect(row3?.lastActivityMs).toBeUndefined();
    });

    it("sorts rows by most recent activity first", () => {
      const rows = buildSessionRows({
        sessionIds: ["ctx-1", "ctx-2"],
        statuses: {},
        auditEntries,
      });

      expect(rows.map((row) => row.sessionId)).toEqual(["ctx-2", "ctx-1"]);
    });
  });
});

describe("deriveStage / isRollbackType", () => {
  it("attributes message types to protocol stages", () => {
    expect(deriveStage("INIT_RECEIPT")).toBe(0);
    expect(deriveStage("TRANSFER_PROPOSAL")).toBe(1);
    expect(deriveStage("TRANSFER_COMMENCE")).toBe(1);
    expect(deriveStage("LOCK_ASSERTION")).toBe(2);
    expect(deriveStage("COMMIT_FINAL_ASSERTION")).toBe(3);
    expect(deriveStage("MINT_ASSERTION")).toBe(3);
    expect(deriveStage("SOMETHING_ELSE")).toBeUndefined();
  });

  it("flags rollback steps", () => {
    expect(isRollbackType("ROLLBACK_COMMIT_FINAL")).toBe(true);
    expect(isRollbackType("COMMIT_FINAL_ASSERTION")).toBe(false);
  });
});

describe("buildMessageTypeStats", () => {
  it("aggregates counts and session spread per message type", () => {
    const entries = [
      makeAuditEntry("s1", 1, undefined, 1000),
      makeAuditEntry("s1", 2, undefined, 2000),
      makeAuditEntry("s2", 1, undefined, 3000),
    ];
    // give types meaning
    entries[0].session.type = "TRANSFER_PROPOSAL";
    entries[1].session.type = "LOCK_ASSERTION";
    entries[2].session.type = "TRANSFER_PROPOSAL";

    const stats = buildMessageTypeStats(entries);

    const proposal = stats.find((s) => s.type === "TRANSFER_PROPOSAL");
    expect(proposal?.count).toBe(2);
    expect(proposal?.sessionCount).toBe(2);
    expect(proposal?.stage).toBe(1);
    expect(proposal?.lastTimestampMs).toBe(3000);

    const lock = stats.find((s) => s.type === "LOCK_ASSERTION");
    expect(lock?.count).toBe(1);
    expect(lock?.stage).toBe(2);
  });
});

describe("buildGatewayStats / buildGatewayPairStats", () => {
  const senderSnap = JSON.stringify({
    senderGatewayNetworkId: "http://gw-a:3010",
    recipientGatewayNetworkId: "http://gw-b:3010",
    serverGatewayPubkey: "pub-a",
    clientGatewayPubkey: "pub-b",
    senderGatewayOwnerId: "org-a",
    sourceBasePath: "besu-net",
    recipientBasePath: "fabric-net",
    digitalAssetId: "asset-1",
    state: 2,
  });

  it("derives per-gateway participation, pubkeys and ledgers", () => {
    const stats = buildGatewayStats([
      makeAuditEntry("s1", 1, senderSnap, 5000),
    ]);

    expect(stats).toHaveLength(2);
    const gwA = stats.find((g) => g.gatewayId === "http://gw-a:3010");
    expect(gwA?.sessionIds).toEqual(["s1"]);
    expect(gwA?.asSenderCount).toBe(1);
    expect(gwA?.completedCount).toBe(1);
    expect(gwA?.pubkeys).toEqual(["pub-a"]);
    expect(gwA?.ownerIds).toEqual(["org-a"]);
    expect(gwA?.ledgers).toContain("besu-net");
    expect(gwA?.lastActivityMs).toBe(5000);

    const gwB = stats.find((g) => g.gatewayId === "http://gw-b:3010");
    expect(gwB?.asRecipientCount).toBe(1);
    expect(gwB?.ledgers).toContain("fabric-net");
  });

  it("aggregates pairings across sessions and counts outcomes", () => {
    const failedSnap = JSON.stringify({
      senderGatewayNetworkId: "http://gw-a:3010",
      recipientGatewayNetworkId: "http://gw-b:3010",
      state: 5,
    });

    const pairs = buildGatewayPairStats([
      makeAuditEntry("s1", 1, senderSnap, 1000),
      makeAuditEntry("s2", 1, failedSnap, 2000),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].sessionCount).toBe(2);
    expect(pairs[0].completedCount).toBe(1);
    expect(pairs[0].failedCount).toBe(1);
    expect(pairs[0].lastActivityMs).toBe(2000);
  });
});
