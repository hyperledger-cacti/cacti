/**
 * Example SATP Hermes gateways for the slim local profile: serve canned,
 * read-only responses on the same REST paths the real gateway OAPI uses
 * (prefix `/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes`). Data is
 * generated per request with now-relative timestamps so the UI shows fresh
 * relative ages ("2m ago") instead of frozen dates.
 *
 * One script, two gateways (pick with GATEWAY_SIDE):
 *  - GATEWAY_SIDE=origin       (port 3013) the gateway that starts transfers
 *                               (SATP client side, snapshot role 1)
 *  - GATEWAY_SIDE=destination  (port 3014) its counterparty
 *                               (SATP server side, snapshot role 2)
 * Both log the same session IDs, each with the messages of its own side, so
 * the inspector's cross-gateway view shows a real two-sided flow.
 *
 * Sessions:
 *  - example-besu-fabric-completed  DONE on both sides, verified proofs
 *  - example-besu-fabric-ongoing    origin ahead, destination still in stage 2
 *  - example-eth-polygon-failed     rejected in stage 2 with SATP error
 *                                   err_2.2.8 (asset already locked); the
 *                                   destination of this one is a third
 *                                   gateway that is not running, so it is
 *                                   only seen on the origin
 */
import { createServer } from "node:http";

const PREFIX = "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes";
const SIDE =
  process.env.GATEWAY_SIDE === "destination" ? "destination" : "origin";
const PORT = Number(process.env.PORT ?? (SIDE === "origin" ? 3013 : 3014));
/** proto `session.Type`: 1 = CLIENT (starts the transfer), 2 = SERVER. */
const ROLE = SIDE === "origin" ? 1 : 2;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const besuAsset = (owner, amount) => ({
  tokenId: "SATPToken",
  referenceId: "example-ref-1",
  tokenType: "TOKEN_TYPE_NONSTANDARD_FUNGIBLE",
  owner,
  amount,
  contractName: "SATPContract",
  contractAddress: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  networkId: { id: "BesuLedgerTestNetwork", type: "BESU_2X" },
});
const fabricAsset = (owner, amount) => ({
  tokenId: "SATPToken",
  referenceId: "example-ref-1",
  tokenType: "TOKEN_TYPE_NONSTANDARD_FUNGIBLE",
  owner,
  amount,
  contractName: "satp-contract",
  mspId: "Org2MSP",
  channelName: "mychannel",
  networkId: { id: "FabricLedgerTestNetwork", type: "FABRIC_2" },
});

/**
 * `side`: which gateway logs the message - "origin" (client side),
 * "destination" (server side) or "both".
 */
const sessions = [
  {
    id: "example-besu-fabric-completed",
    ageMs: 3 * HOUR,
    status: {
      origin: ["DONE", "COMPLETED", "STAGE_3"],
      destination: ["DONE", "COMPLETED", "STAGE_3"],
    },
    snapshotBase: {
      transferContextId: "ctx-besu-fabric-1",
      sourceBasePath: "Besu (localhost:8545)",
      recipientBasePath: "Fabric (mychannel)",
      senderGatewayNetworkId: "BesuLedgerTestNetwork",
      recipientGatewayNetworkId: "FabricLedgerTestNetwork",
      digitalAssetId: "SATPToken",
      senderAsset: besuAsset(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        "100",
      ),
      receiverAsset: fabricAsset("x509::/OU=client/CN=user1", "100"),
    },
    events: [
      {
        type: "TRANSFER_PROPOSAL",
        side: "origin",
        state: 1,
        offsetMs: -14 * MINUTE,
      },
      {
        type: "TRANSFER_PROPOSAL_RECEIPT",
        side: "destination",
        state: 1,
        offsetMs: -13.5 * MINUTE,
      },
      {
        type: "TRANSFER_COMMENCE",
        side: "origin",
        state: 1,
        offsetMs: -12 * MINUTE,
      },
      {
        type: "LOCK_ASSERT",
        side: "origin",
        state: 1,
        offsetMs: -9 * MINUTE,
        claims: {
          lockAssertionClaim: {
            receipt: "lock-receipt-example",
            signature: "0x10c41",
          },
        },
        proof: {
          tag: "lockAsset",
          description: "Client locks the asset on the source ledger",
          messageType: "LOCK_ASSERT",
        },
      },
      {
        type: "LOCK_ASSERT_RECEIPT",
        side: "destination",
        state: 1,
        offsetMs: -8.5 * MINUTE,
      },
      {
        type: "COMMIT_PREPARE",
        side: "origin",
        state: 1,
        offsetMs: -6 * MINUTE,
      },
      {
        type: "MINT_ASSERT",
        side: "destination",
        state: 1,
        offsetMs: -4 * MINUTE,
        claims: {
          mintAssertionClaim: {
            receipt: "mint-receipt-example",
            signature: "0x3171",
          },
        },
        proof: {
          tag: "mintAsset",
          description: "Server mints the asset on the destination ledger",
          messageType: "COMMIT_READY",
        },
      },
      {
        type: "BURN_ASSERT",
        side: "origin",
        state: 1,
        offsetMs: -3.5 * MINUTE,
        claims: {
          burnAssertionClaim: {
            receipt: "burn-receipt-example",
            signature: "0xb041",
          },
        },
        proof: {
          tag: "burnAsset",
          description: "Client burns the asset on the source ledger",
          messageType: "COMMIT_FINAL",
        },
      },
      {
        type: "TRANSFER_COMPLETE",
        side: "both",
        state: 2,
        offsetMs: -3 * MINUTE,
      },
    ],
  },
  {
    id: "example-besu-fabric-ongoing",
    ageMs: 90_000,
    status: {
      origin: ["PENDING", "WAIT_DESTINATION_TRANSACTION", "STAGE_3"],
      destination: ["PENDING", "WAIT_SOURCE_CONFIRMATIONS", "STAGE_2"],
    },
    snapshotBase: {
      transferContextId: "ctx-besu-fabric-2",
      sourceBasePath: "Besu (localhost:8545)",
      recipientBasePath: "Fabric (mychannel)",
      senderGatewayNetworkId: "BesuLedgerTestNetwork",
      recipientGatewayNetworkId: "FabricLedgerTestNetwork",
      digitalAssetId: "SATPToken",
      senderAsset: besuAsset(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        "25",
      ),
      receiverAsset: fabricAsset("x509::/OU=client/CN=user1", "25"),
    },
    events: [
      {
        type: "TRANSFER_PROPOSAL",
        side: "origin",
        state: 1,
        offsetMs: -6 * MINUTE,
      },
      {
        type: "TRANSFER_PROPOSAL_RECEIPT",
        side: "destination",
        state: 1,
        offsetMs: -5.5 * MINUTE,
      },
      {
        type: "TRANSFER_COMMENCE",
        side: "origin",
        state: 1,
        offsetMs: -5 * MINUTE,
      },
      {
        type: "LOCK_ASSERT",
        side: "origin",
        state: 1,
        offsetMs: -2 * MINUTE,
        claims: {
          lockAssertionClaim: {
            receipt: "lock-receipt-ongoing",
            signature: "0x10c42",
          },
        },
        proof: {
          tag: "lockAsset",
          description: "Client locks the asset on the source ledger",
          messageType: "LOCK_ASSERT",
        },
      },
      {
        type: "LOCK_ASSERT_RECEIPT",
        side: "destination",
        state: 1,
        offsetMs: -1.5 * MINUTE,
      },
      {
        type: "COMMIT_PREPARE",
        side: "origin",
        state: 1,
        offsetMs: -1 * MINUTE,
      },
    ],
  },
  {
    id: "example-eth-polygon-failed",
    ageMs: 26 * HOUR,
    onlyOn: "origin",
    status: { origin: ["FAILED", "REJECTED", "STAGE_2"] },
    snapshotBase: {
      transferContextId: "ctx-eth-polygon-1",
      sourceBasePath: "Ethereum (localhost:8546)",
      recipientBasePath: "Polygon (localhost:8547)",
      senderGatewayNetworkId: "EthereumLedgerTestNetwork",
      recipientGatewayNetworkId: "PolygonLedgerTestNetwork",
      digitalAssetId: "0x4411aa-example-erc721",
      senderAsset: {
        tokenId: "ExampleNFT#7",
        owner: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        amount: "1",
        contractName: "ExampleNFT",
        networkId: { id: "EthereumLedgerTestNetwork", type: "ETHEREUM" },
      },
    },
    events: [
      {
        type: "TRANSFER_PROPOSAL",
        side: "origin",
        state: 1,
        offsetMs: -31 * MINUTE,
      },
      {
        type: "TRANSFER_COMMENCE",
        side: "origin",
        state: 1,
        offsetMs: -30 * MINUTE,
      },
      {
        type: "LOCK_ASSERT",
        side: "origin",
        state: 5,
        offsetMs: -28 * MINUTE,
        extra: {
          phaseError: "MESSAGE_TYPE_LOCK_ASSERT",
          errorCode:
            "err_2.2.8: asset already locked by session ctx-eth-polygon-0",
        },
      },
      {
        type: "TRANSFER_ROLLBACK_START",
        side: "origin",
        state: 5,
        offsetMs: -25 * MINUTE,
      },
      {
        type: "TRANSFER_ROLLBACK_COMPLETE",
        side: "origin",
        state: 5,
        offsetMs: -24 * MINUTE,
      },
    ],
  },
];

const visibleSessions = sessions.filter(
  (session) => !session.onlyOn || session.onlyOn === SIDE,
);

function eventsOf(session) {
  return session.events.filter(
    (event) => event.side === "both" || event.side === SIDE,
  );
}

function iso(ms) {
  return new Date(ms).toISOString();
}

function auditEntries(now) {
  const entries = [];
  for (const session of visibleSessions) {
    const endMs = now - session.ageMs;
    let carried = {};
    eventsOf(session).forEach((event, index) => {
      const timestamp = endMs + event.offsetMs;
      // Like the real SessionData, claims and error fields persist in the
      // snapshots of later steps once set.
      carried = { ...carried, ...(event.claims ?? {}), ...(event.extra ?? {}) };
      entries.push({
        auditEntryId: `${SIDE}-${session.id}-${index + 1}`,
        timestamp,
        session: {
          sessionId: session.id,
          type: event.type,
          key: session.id,
          operation:
            event.side === "origin"
              ? "send"
              : event.side === "destination"
                ? "receive"
                : "done",
          sequenceNumber: index + 1,
          timestamp: String(timestamp),
          data: JSON.stringify({
            id: session.id,
            ...session.snapshotBase,
            ...carried,
            role: ROLE,
            state: event.state,
            lastSequenceNumber: index + 1,
            lastMessageHash: `0x${Buffer.from(`${SIDE}:${session.id}:${index}`).toString("hex").slice(0, 40)}`,
          }),
        },
      });
    });
  }
  return entries;
}

function proofsOf(sessionIds) {
  const proofs = [];
  for (const session of visibleSessions) {
    if (!sessionIds.includes(session.id)) {
      continue;
    }
    eventsOf(session).forEach((event, index) => {
      if (!event.proof) {
        return;
      }
      proofs.push({
        sessionId: session.id,
        step: {
          ...event.proof,
          role: event.side === "origin" ? "client" : "server",
          sequence: index + 1,
        },
        claim: JSON.stringify(event.claims ?? {}),
        signedClaim: `0x${Buffer.from(`sig:${SIDE}:${session.id}:${event.proof.tag}`).toString("hex")}`,
      });
    });
  }
  return proofs;
}

function statusResponse(session, now) {
  const [status, substatus, stage] = session.status[SIDE];
  return {
    status,
    substatus,
    stage,
    step: eventsOf(session).at(-1)?.type ?? "",
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
    send(
      200,
      visibleSessions.map((session) => session.id),
    );
    return;
  }
  if (path === `${PREFIX}/supported-ledgers`) {
    send(200, {
      supportedLedgers:
        SIDE === "origin" ? ["BESU", "ETHEREUM"] : ["FABRIC", "POLYGON"],
    });
    return;
  }
  if (path === `${PREFIX}/status`) {
    const sessionId = url.searchParams.get("SessionID");
    const session = visibleSessions.find(
      (candidate) => candidate.id === sessionId,
    );
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
  if (path === `${PREFIX}/proofs`) {
    const ids = (url.searchParams.get("sessionIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      send(400, { message: "sessionIds query parameter is required" });
      return;
    }
    send(200, { proofs: proofsOf(ids) });
    return;
  }
  send(404, { message: `no such endpoint: ${path}` });
});

server.listen(PORT, () => {
  console.log(`example SATP ${SIDE} gateway listening on :${PORT}`);
});
