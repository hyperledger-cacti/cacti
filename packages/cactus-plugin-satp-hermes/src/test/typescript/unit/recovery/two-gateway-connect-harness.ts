/**
 * In-process connect-transport harness for two-gateway crash-recovery
 * convergence tests (SATP v13).
 *
 * Rebuilds the convergence-loop coverage of the deleted v02 suites
 * `integration/recovery/recovery-stage-{1,2,3}.test.ts` (removed in commit
 * 9b046ec8b) without docker, loopback HTTP servers, or free ports:
 *
 * Two fully composed gateway nodes (real `GatewayOrchestrator` + real
 * `CrashManager` + real `CrashRecoveryHandler`/`CrashRecoveryServerService`/
 * `CrashRecoveryClientService`, each with its own signer and its own
 * in-memory SQLite log repository) exchange recovery messages through real
 * Connect clients (`createClient(CrashRecoveryService, ...)`) over
 * `createRouterTransport` transports whose routers are the counterparty's
 * real `CrashRecoveryHandler.setupRouter`. Delivery therefore goes through
 * real protobuf (de)serialization (binary format) and real per-message
 * signature verification (the crash channel verifies inside the service
 * layer, not via JWS transport interceptors) — only the socket is replaced
 * by function dispatch.
 *
 * Why not two `SATPGateway` instances like the v02 suites: v13 production
 * refuses to construct a gateway with `enableCrashRecovery: true`
 * (`SATPGateway` constructor throws "Crash recovery and rollback are not
 * yet supported", since commit 9b046ec8b), so the harness composes the same
 * components the plugin would construct, at the same wiring points, instead
 * of the top-level facade.
 */
import {
  createClient,
  createRouterTransport,
  type Client as ConnectClient,
  type Interceptor,
} from "@connectrpc/connect";
import {
  JsObjectSigner,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import { create } from "@bufbuild/protobuf";
import { v4 as uuidv4 } from "uuid";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  CrashRecoveryService,
  type RecoverRequest,
  type RecoverResponse,
  type RecoverSuccessRequest,
  type RecoverSuccessResponse,
  type RollbackRequest,
  type RollbackResponse,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/service/crash_recovery_pb";
import {
  MessageStagesHashesSchema,
  MessageStagesSignaturesSchema,
  MessageStagesTimestampsSchema,
  type SessionData,
  SessionDataSchema,
  Stage0HashesSchema,
  Stage0SignaturesSchema,
  Stage0TimestampsSchema,
  Stage1HashesSchema,
  Stage1SignaturesSchema,
  Stage1TimestampsSchema,
  Stage2HashesSchema,
  Stage2SignaturesSchema,
  Stage2TimestampsSchema,
  Stage3HashesSchema,
  Stage3SignaturesSchema,
  Stage3TimestampsSchema,
  State,
  Type,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_CORE_VERSION } from "../../../../main/typescript/core/constants";
import {
  GatewayCredential,
  SupportedSigningAlgorithms,
  type Address,
  type GatewayIdentity,
  type LocalLog,
} from "../../../../main/typescript/core/types";
import type { SATPServiceInstance } from "../../../../main/typescript/core/stage-services/satp-service";
import type { SATPSession } from "../../../../main/typescript/core/satp-session";
import { GatewayOrchestrator } from "../../../../main/typescript/services/gateway/gateway-orchestrator";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";
import type { SATPCrossChainManager } from "../../../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import { KnexLocalLogRepository } from "../../../../main/typescript/database/repository/knex-local-log-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import {
  bufArray2HexStr,
  getSatpLogKey,
} from "../../../../main/typescript/utils/gateway-utils";

export const CLIENT_GATEWAY_ID = "convergence-client-gateway";
export const SERVER_GATEWAY_ID = "convergence-server-gateway";
export const SENDER_NETWORK_ID = "sender-network";
export const RECIPIENT_NETWORK_ID = "recipient-network";

/** Wire traffic observed on a node's outgoing crash channel. */
export interface CrashWireCapture {
  recoverRequests: RecoverRequest[];
  recoverResponses: RecoverResponse[];
  recoverSuccessRequests: RecoverSuccessRequest[];
  recoverSuccessResponses: RecoverSuccessResponse[];
  rollbackRequests: RollbackRequest[];
  rollbackResponses: RollbackResponse[];
}

function newWireCapture(): CrashWireCapture {
  return {
    recoverRequests: [],
    recoverResponses: [],
    recoverSuccessRequests: [],
    recoverSuccessResponses: [],
    rollbackRequests: [],
    rollbackResponses: [],
  };
}

/** One fully composed gateway node participating in the convergence loop. */
export interface GatewayNode {
  identity: GatewayIdentity;
  signer: JsObjectSigner;
  /** CLAIM_SIGNATURE public key (hex) used for crash-channel messages. */
  pubKey: string;
  orchestrator: GatewayOrchestrator;
  crashManager: CrashManager;
  localRepository: KnexLocalLogRepository;
  /** Messages this node sent / received on its outgoing crash channel. */
  wire: CrashWireCapture;
}

export interface GatewayPair {
  client: GatewayNode;
  server: GatewayNode;
}

/**
 * Records the request a node sends and the response it receives back on
 * the crash channel. The recorded messages are the exact instances handed
 * to (from) the connect transport, i.e. what the wire would carry.
 */
function wireRecordingInterceptor(capture: CrashWireCapture): Interceptor {
  return (next) => async (req) => {
    // Record the outgoing request before awaiting: a rejected call (e.g.
    // the server rejecting a tampered request) must still show up as wire
    // traffic that traveled. The proto rpc names are Recover /
    // RecoverSuccess / Rollback.
    const method = req.method.name.toLowerCase();
    if (method === "recover") {
      capture.recoverRequests.push(req.message as RecoverRequest);
    } else if (method === "recoversuccess") {
      capture.recoverSuccessRequests.push(req.message as RecoverSuccessRequest);
    } else if (method === "rollback") {
      capture.rollbackRequests.push(req.message as RollbackRequest);
    }
    const response = await next(req);
    if (method === "recover") {
      capture.recoverResponses.push(response.message as RecoverResponse);
    } else if (method === "recoversuccess") {
      capture.recoverSuccessResponses.push(
        response.message as RecoverSuccessResponse,
      );
    } else if (method === "rollback") {
      capture.rollbackResponses.push(response.message as RollbackResponse);
    }
    return response;
  };
}

function makeGatewayIdentity(id: string, claimPubKey: string): GatewayIdentity {
  return {
    id,
    name: id,
    version: [{ Core: SATP_CORE_VERSION, Architecture: "v09", Crash: "v06" }],
    address: "http://localhost" as Address,
    connectedDLTs: [],
    credentials: {
      [GatewayCredential.CLAIM_SIGNATURE]: {
        purpose: GatewayCredential.CLAIM_SIGNATURE,
        algorithm: SupportedSigningAlgorithms.SECP256K1,
        publicKey: claimPubKey,
      },
    },
  };
}

/**
 * Compose one gateway node exactly as the plugin does for crash recovery:
 * orchestrator (own signer, counterparty identities registered) +
 * CrashManager (own log repository, real crash handler registered into the
 * orchestrator). No ports are bound and no sockets are opened: the
 * orchestrator is constructed without channels and the counterparty
 * channels are injected in `wireGatewayPair`.
 */
async function createGatewayNode(options: {
  id: string;
  keyPair: { privateKey: Uint8Array; publicKey: Uint8Array };
  counterpartyIdentities: GatewayIdentity[];
  monitorService: MonitorService;
}): Promise<GatewayNode> {
  const signer = new JsObjectSigner({
    privateKey: new Uint8Array(options.keyPair.privateKey),
  });
  const pubKey = bufArray2HexStr(options.keyPair.publicKey);
  const identity = makeGatewayIdentity(options.id, pubKey);

  const localRepository = new KnexLocalLogRepository({
    client: "sqlite3",
    connection: ":memory:",
    useNullAsDefault: true,
  });
  await localRepository.migrate();

  const orchestrator = new GatewayOrchestrator({
    logLevel: "silent",
    localGateway: identity,
    counterPartyGateways: [],
    signer,
    enableCrashRecovery: true,
    monitorService: options.monitorService,
  });
  orchestrator.addGateways(options.counterpartyIdentities);

  // Only getClientBridgeManagerInterface() is consumed by the CrashManager
  // (to build its rollback strategy factory, which the convergence loop
  // does not exercise).
  const ccManager = {
    getClientBridgeManagerInterface: () => undefined,
  } as unknown as SATPCrossChainManager;

  const crashManager = new CrashManager({
    instanceId: uuidv4(),
    logLevel: "silent",
    ccManager,
    orchestrator,
    localRepository,
    signer,
    monitorService: options.monitorService,
  });

  return {
    identity,
    signer,
    pubKey,
    orchestrator,
    crashManager,
    localRepository,
    wire: newWireCapture(),
  };
}

/**
 * Wire two gateway nodes together over in-memory connect transports: each
 * node's counterparty channel carries a real `CrashRecoveryService` client
 * whose transport routes into the counterparty's real crash handler router.
 * Mirrors `GatewayOrchestrator.createChannel`/`createConnectClients`, with
 * the gRPC-web transport replaced by `createRouterTransport`.
 */
function wireGatewayPair(
  client: GatewayNode,
  server: GatewayNode,
  options: {
    /**
     * Extra transport interceptors on the client -> server crash channel.
     * These see BOTH directions of a client-initiated rpc: the request on
     * the way out and the response on the way back (e.g. in-flight response
     * tampering sits here, exactly where a wire attacker would).
     */
    clientToServerInterceptors?: Interceptor[];
  } = {},
): void {
  const clientCrashHandler = client.crashManager["crashRecoveryHandler"]!;
  const serverCrashHandler = server.crashManager["crashRecoveryHandler"]!;

  const clientToServerTransport = createRouterTransport(
    (router) => serverCrashHandler.setupRouter(router),
    {
      transport: {
        interceptors: [
          wireRecordingInterceptor(client.wire),
          ...(options.clientToServerInterceptors ?? []),
        ],
      },
    },
  );

  const serverToClientTransport = createRouterTransport((router) =>
    clientCrashHandler.setupRouter(router),
  );

  const clientChannel = {
    fromGatewayID: client.identity.id,
    toGatewayID: server.identity.id,
    sessions: new Map<string, SATPSession>(),
    connectedDLTs: [
      { id: RECIPIENT_NETWORK_ID, ledgerType: LedgerType.Fabric2 },
    ],
    clients: new Map<string, ConnectClient<SATPServiceInstance>>([
      ["crash", createClient(CrashRecoveryService, clientToServerTransport)],
    ]),
  };
  const serverChannel = {
    fromGatewayID: server.identity.id,
    toGatewayID: client.identity.id,
    sessions: new Map<string, SATPSession>(),
    connectedDLTs: [{ id: SENDER_NETWORK_ID, ledgerType: LedgerType.Besu2X }],
    clients: new Map<string, ConnectClient<SATPServiceInstance>>([
      ["crash", createClient(CrashRecoveryService, serverToClientTransport)],
    ]),
  };

  client.orchestrator.getChannels().set(SERVER_GATEWAY_ID, clientChannel);
  server.orchestrator.getChannels().set(CLIENT_GATEWAY_ID, serverChannel);
}

/**
 * Create, wire, and return a fresh gateway pair (fresh keys, fresh
 * in-memory databases).
 */
export async function createWiredGatewayPair(
  monitorService: MonitorService,
  options: {
    /** Extra transport interceptors on the client -> server direction. */
    clientToServerInterceptors?: Interceptor[];
  } = {},
): Promise<GatewayPair> {
  const clientKeyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const serverKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

  const client = await createGatewayNode({
    id: CLIENT_GATEWAY_ID,
    keyPair: clientKeyPair,
    counterpartyIdentities: [
      makeGatewayIdentity(
        SERVER_GATEWAY_ID,
        bufArray2HexStr(serverKeyPair.publicKey),
      ),
    ],
    monitorService,
  });
  const server = await createGatewayNode({
    id: SERVER_GATEWAY_ID,
    keyPair: serverKeyPair,
    counterpartyIdentities: [
      makeGatewayIdentity(
        CLIENT_GATEWAY_ID,
        bufArray2HexStr(clientKeyPair.publicKey),
      ),
    ],
    monitorService,
  });

  wireGatewayPair(client, server, options);
  return { client, server };
}

/** Stop crash schedulers and drop in-memory databases of both nodes. */
export async function shutdownGatewayPair(pair: GatewayPair): Promise<void> {
  pair.client.crashManager.stopScheduler();
  pair.server.crashManager.stopScheduler();
  await pair.client.localRepository.destroy();
  await pair.server.localRepository.destroy();
}

// ---------------------------------------------------------------------------
// Stage fixtures: a session that crashed mid-stage-N on the client side,
// while the server completed the stage. Same scenario shape as the deleted
// v02 recovery-stage-{1,2,3} suites, with real secp256k1 signatures over
// the message hashes (per producing gateway) instead of "sig_h*" strings.
// ---------------------------------------------------------------------------

type MessageOrigin = "client" | "server";
type Stage = 0 | 1 | 2 | 3;

interface StageMessageSpec {
  /** Field name in the Stage*{Hashes,Timestamps,Signatures} messages. */
  field: string;
  /** Fixture digest of the protocol message. */
  hash: string;
  /** Gateway that produced (and signed) the message. */
  origin: MessageOrigin;
}

const STAGE_MESSAGES: Record<Stage, StageMessageSpec[]> = {
  0: [
    { field: "newSessionRequestMessage", hash: "h1", origin: "client" },
    { field: "newSessionResponseMessage", hash: "h2", origin: "server" },
    { field: "preSatpTransferRequestMessage", hash: "h3", origin: "client" },
    { field: "preSatpTransferResponseMessage", hash: "h4", origin: "server" },
  ],
  1: [
    { field: "transferProposalRequestMessage", hash: "h5", origin: "client" },
    { field: "transferProposalReceiptMessage", hash: "h6", origin: "server" },
    { field: "transferProposalRejectMessage", hash: "h7", origin: "client" },
    { field: "transferCommenceRequestMessage", hash: "h8", origin: "client" },
    { field: "transferCommenceResponseMessage", hash: "h9", origin: "server" },
  ],
  2: [
    { field: "lockAssertionRequestMessage", hash: "h10", origin: "client" },
    { field: "lockAssertionReceiptMessage", hash: "h11", origin: "server" },
  ],
  3: [
    { field: "commitPreparationRequestMessage", hash: "h12", origin: "client" },
    { field: "commitReadyResponseMessage", hash: "h13", origin: "server" },
    {
      field: "commitFinalAssertionRequestMessage",
      hash: "h14",
      origin: "client",
    },
    {
      field: "commitFinalAcknowledgementReceiptResponseMessage",
      hash: "h15",
      origin: "server",
    },
    { field: "transferCompleteMessage", hash: "h16", origin: "client" },
    { field: "transferCompleteResponseMessage", hash: "h17", origin: "server" },
  ],
};

export interface StageFixture {
  sessionId: string;
  /** Stale client-side session data (crashed mid-stage). */
  clientSessionData: SessionData;
  /** Authoritative server-side session data (stage completed). */
  serverSessionData: SessionData;
  crashedStage: 1 | 2 | 3;
  /** First (client-originated) message spec of the crashed stage. */
  crashedRequest: StageMessageSpec;
  /** Second (server-originated) message spec the client is missing. */
  crashedReceipt: StageMessageSpec;
}

interface StageBodies {
  hashes: Record<string, Record<string, string>>;
  timestamps: Record<string, Record<string, string>>;
  signatures: Record<string, Record<string, string>>;
}

/**
 * Build the per-stage message bodies for stages 0..upToStage, plus the
 * first (request) message of `partialTail` when given. Signatures are real
 * secp256k1 signatures over the message hash, made by the producing
 * gateway's signer.
 */
function buildStageBodies(
  spec: { upToStage: Stage; partialTail?: 1 | 2 | 3 },
  signers: Record<MessageOrigin, JsObjectSigner>,
): StageBodies {
  const bodies: StageBodies = {
    hashes: { stage0: {}, stage1: {}, stage2: {}, stage3: {} },
    timestamps: { stage0: {}, stage1: {}, stage2: {}, stage3: {} },
    signatures: { stage0: {}, stage1: {}, stage2: {}, stage3: {} },
  };
  let tick = 0;
  const emit = (stage: Stage, message: StageMessageSpec): void => {
    const stageKey = `stage${stage}`;
    bodies.hashes[stageKey][`${message.field}Hash`] = message.hash;
    bodies.timestamps[stageKey][`${message.field}Timestamp`] = String(
      1_700_000_000_000 + tick++,
    );
    bodies.signatures[stageKey][`${message.field}Signature`] = bufArray2HexStr(
      signers[message.origin].sign(message.hash),
    );
  };

  for (const stage of [0, 1, 2, 3] as Stage[]) {
    if (stage > spec.upToStage) {
      break;
    }
    for (const message of STAGE_MESSAGES[stage]) {
      emit(stage, message);
    }
  }
  if (spec.partialTail) {
    emit(spec.partialTail, STAGE_MESSAGES[spec.partialTail][0]);
  }
  return bodies;
}

/**
 * Session data for one side of the crashed session. The client holds a
 * partial stage (crashed mid-stage), the server holds the stage completed.
 */
function makeSessionData(options: {
  role: Type;
  sessionId: string;
  clientPubKey: string;
  serverPubKey: string;
  signers: Record<MessageOrigin, JsObjectSigner>;
  completeThrough: Stage;
  partialTail?: 1 | 2 | 3;
}): SessionData {
  const bodies = buildStageBodies(
    { upToStage: options.completeThrough, partialTail: options.partialTail },
    options.signers,
  );

  return create(SessionDataSchema, {
    id: options.sessionId,
    version: SATP_CORE_VERSION,
    role: options.role,
    state: State.ONGOING,
    maxTimeout: "60000",
    maxRetries: "3",
    lastSequenceNumber: options.role === Type.CLIENT ? BigInt(1) : BigInt(2),
    lastMessageReceivedTimestamp: Date.now().toString(),
    clientGatewayPubkey: options.clientPubKey,
    serverGatewayPubkey: options.serverPubKey,
    senderGatewayNetworkId: SENDER_NETWORK_ID,
    recipientGatewayNetworkId: RECIPIENT_NETWORK_ID,
    hashes: create(MessageStagesHashesSchema, {
      stage0: create(Stage0HashesSchema, bodies.hashes.stage0),
      stage1: create(Stage1HashesSchema, bodies.hashes.stage1),
      stage2: create(Stage2HashesSchema, bodies.hashes.stage2),
      stage3: create(Stage3HashesSchema, bodies.hashes.stage3),
    }),
    processedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema, bodies.timestamps.stage0),
      stage1: create(Stage1TimestampsSchema, bodies.timestamps.stage1),
      stage2: create(Stage2TimestampsSchema, bodies.timestamps.stage2),
      stage3: create(Stage3TimestampsSchema, bodies.timestamps.stage3),
    }),
    signatures: create(MessageStagesSignaturesSchema, {
      stage0: create(Stage0SignaturesSchema, bodies.signatures.stage0),
      stage1: create(Stage1SignaturesSchema, bodies.signatures.stage1),
      stage2: create(Stage2SignaturesSchema, bodies.signatures.stage2),
      stage3: create(Stage3SignaturesSchema, bodies.signatures.stage3),
    }),
  });
}

/**
 * Build the stage-N divergence fixture: identical session id, client stale
 * (partial stage N, sequence 1) vs. server complete (stage N done,
 * sequence 2) — the exact shape the deleted v02 recovery-stage suites
 * exercised.
 */
export function makeStageFixture(
  crashedStage: 1 | 2 | 3,
  client: { pubKey: string; signer: JsObjectSigner },
  server: { pubKey: string; signer: JsObjectSigner },
): StageFixture {
  const sessionId = uuidv4();
  const signers: Record<MessageOrigin, JsObjectSigner> = {
    client: client.signer,
    server: server.signer,
  };
  const common = {
    sessionId,
    clientPubKey: client.pubKey,
    serverPubKey: server.pubKey,
    signers,
  };

  const clientSessionData = makeSessionData({
    ...common,
    role: Type.CLIENT,
    completeThrough: (crashedStage - 1) as Stage,
    partialTail: crashedStage,
  });
  const serverSessionData = makeSessionData({
    ...common,
    role: Type.SERVER,
    completeThrough: crashedStage,
  });

  return {
    sessionId,
    clientSessionData,
    serverSessionData,
    crashedStage,
    crashedRequest: STAGE_MESSAGES[crashedStage][0],
    crashedReceipt: STAGE_MESSAGES[crashedStage][1],
  };
}

/**
 * Persist a session's current state as a local log entry, the way the
 * protocol logger does at each stage operation. The stage label follows
 * the session's furthest recorded stage request.
 */
export async function insertStageLog(
  repository: KnexLocalLogRepository,
  sessionData: SessionData,
  operation: string,
  timestamp = new Date().toISOString(),
): Promise<LocalLog> {
  const hashes = sessionData.hashes;
  const stage = hashes?.stage3?.commitPreparationRequestMessageHash
    ? 3
    : hashes?.stage2?.lockAssertionRequestMessageHash
      ? 2
      : 1;
  const logEntry: LocalLog = {
    sessionId: sessionData.id,
    type: `stage${stage}`,
    key: getSatpLogKey(sessionData.id, `stage${stage}`, operation),
    operation,
    timestamp,
    data: safeStableStringify(sessionData)!,
    sequenceNumber: Number(sessionData.lastSequenceNumber),
  };
  await repository.create(logEntry);
  return logEntry;
}
