/**
 * Example SATP Hermes gateway for the slim local profile: serves canned,
 * read-only responses on the same REST paths the real gateway OAPI uses
 * (prefix `/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes`). Data is
 * generated per request with now-relative timestamps so the UI shows fresh
 * relative ages ("2m ago") instead of frozen dates.
 *
 * Three sessions cover the interesting UI states:
 *  - example-besu-fabric-completed  (COMPLETED, lock+mint claims)
 *  - example-besu-fabric-ongoing    (ONGOING, waiting on destination tx)
 *  - example-eth-polygon-failed     (ERROR + rollback + error detail)
 */
import { createServer } from "node:http";

const PREFIX = "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes";
const PORT = 3013;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const sessions = [
  {
    id: "example-besu-fabric-completed",
    status: "DONE",
    substatus: "FINAL",
    stage: "STAGE_3",
    step: "transferComplete",
    ageMs: 3 * HOUR,
    snapshotBase: {
      sourceBasePath: "Besu (localhost:8545)",
      recipientBasePath: "Fabric (channel1)",
      senderGatewayNetworkId: "gateway1.example.com",
      recipientGatewayNetworkId: "gateway2.example.com",
      digitalAssetId: "0x9bca3e2f-example-erc20",
    },
    events: [
      {
        type: "TRANSFER_PROPOSAL",
        state: 1,
        offsetMs: -14 * MINUTE,
      },
      {
        type: "TRANSFER_COMMENCE",
        state: 1,
        offsetMs: -12 * MINUTE,
      },
      {
        type: "TRANSFER_LOCK_ASSERT",
        state: 1,
        offsetMs: -9 * MINUTE,
        claims: { lockAssertionClaim: { proofType: "sha256", proof: "lock-proof-example" } },
      },
      {
        type: "TRANSFER_MINT_ASSERT",
        state: 2,
        offsetMs: -4 * MINUTE,
        claims: { mintAssertionClaim: { proofType: "sha256", proof: "mint-proof-example" } },
      },
      {
        type: "TRANSFER_COMPLETE",
        state: 2,
        offsetMs: -3 * MINUTE,
      },
    ],
  },
  {
    id: "example-besu-fabric-ongoing",
    status: "PENDING",
    substatus: "WAIT_DESTINATION_TRANSACTION",
    stage: "STAGE_2",
    step: "transferLockEvidence",
    ageMs: 90_000,
    snapshotBase: {
      sourceBasePath: "Besu (localhost:8545)",
      recipientBasePath: "Fabric (channel1)",
      senderGatewayNetworkId: "gateway1.example.com",
      recipientGatewayNetworkId: "gateway2.example.com",
      digitalAssetId: "0x9bca3e2f-example-erc20",
    },
    events: [
      { type: "TRANSFER_PROPOSAL", state: 1, offsetMs: -6 * MINUTE },
      { type: "TRANSFER_COMMENCE", state: 1, offsetMs: -5 * MINUTE },
      { type: "TRANSFER_LOCK_ASSERT", state: 1, offsetMs: -2 * MINUTE },
    ],
  },
  {
    id: "example-eth-polygon-failed",
    status: "FAILED",
    substatus: "REFUND_IN_PROGRESS",
    stage: "STAGE_2",
    step: "transferRollback",
    ageMs: 26 * HOUR,
    snapshotBase: {
      sourceBasePath: "Ethereum (localhost:8546)",
      recipientBasePath: "Polygon (localhost:8547)",
      senderGatewayNetworkId: "gateway1.example.com",
      recipientGatewayNetworkId: "gateway3.example.com",
      digitalAssetId: "0x4411aa-example-erc721",
      errorCode: "destination chain unavailable: polygon rpc unreachable",
    },
    events: [
      { type: "TRANSFER_PROPOSAL", state: 1, offsetMs: -31 * MINUTE },
      { type: "TRANSFER_COMMENCE", state: 1, offsetMs: -30 * MINUTE },
      { type: "TRANSFER_LOCK_ASSERT", state: 1, offsetMs: -28 * MINUTE },
      { type: "TRANSFER_ROLLBACK_START", state: 5, offsetMs: -25 * MINUTE },
      { type: "TRANSFER_ROLLBACK_COMPLETE", state: 5, offsetMs: -24 * MINUTE },
    ],
  },
];

function iso(ms) {
  return new Date(ms).toISOString();
}

function auditEntries(now) {
  const entries = [];
  for (const session of sessions) {
    const endMs = now - session.ageMs;
    session.events.forEach((event, index) => {
      const timestamp = endMs + event.offsetMs;
      entries.push({
        auditEntryId: `${session.id}-${index + 1}`,
        timestamp,
        session: {
          sessionId: session.id,
          type: event.type,
          key: session.id,
          operation: event.type.replace("TRANSFER_", ""),
          sequenceNumber: index + 1,
          timestamp: String(timestamp),
          data: JSON.stringify({
            ...session.snapshotBase,
            ...(event.claims ?? {}),
            state: event.state,
          }),
        },
      });
    });
  }
  return entries;
}

function statusResponse(session, now) {
  return {
    status: session.status,
    substatus: session.substatus,
    stage: session.stage,
    step: session.step,
    startTime: iso(now - session.ageMs - 32 * MINUTE),
  };
}

const server = createServer((request, response) => {
  // The browser calls this origin from the ledger browser origin.
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "*");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://localhost:${PORT}`);
  const now = Date.now();
  const path = url.pathname;

  const send = (code, body) => {
    response.writeHead(code, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };

  if (request.method !== "GET") {
    send(405, { message: "example gateway is read-only" });
    return;
  }
  if (path === `${PREFIX}/healthcheck`) {
    send(200, { status: "AVAILABLE" });
    return;
  }
  if (path === `${PREFIX}/get-sessions-ids`) {
    send(200, sessions.map((session) => session.id));
    return;
  }
  if (path === `${PREFIX}/supported-ledgers`) {
    send(200, { supportedLedgers: ["BESU", "FABRIC", "ETHEREUM", "POLYGON"] });
    return;
  }
  if (path === `${PREFIX}/status`) {
    const sessionId = url.searchParams.get("SessionID");
    const session = sessions.find((candidate) => candidate.id === sessionId);
    if (!session) {
      send(404, { message: `unknown session ${sessionId}` });
      return;
    }
    send(200, statusResponse(session, now));
    return;
  }
  if (path === `${PREFIX}/audit`) {
    send(200, { auditEntries: { entries: auditEntries(now) } });
    return;
  }
  send(404, { message: `no such endpoint: ${path}` });
});

server.listen(PORT, () => {
  console.log(`example SATP gateway listening on :${PORT}`);
});
