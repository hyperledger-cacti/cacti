/**
 * Integration test for the v13 crash-recovery RPC contract.
 *
 * Exercises the real `CrashRecoveryClientService` and
 * `CrashRecoveryServerService` pair against a real Knex/SQLite log
 * repository: a recovering client gateway builds and signs a
 * RecoverRequest, the server gateway verifies it, streams back its local
 * logs for the session, and acknowledges the client's RecoverSuccess.
 *
 * This is the coverage that pins the recovery-path signature semantics:
 * the client signs recovery requests with ITS key, so the server must
 * verify them against the session's CLIENT gateway public key (a prior
 * regression verified against the server's own key, which failed every
 * legitimate recovery and stranded in-flight transfers).
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
import {
  MessageStagesHashesSchema,
  MessageStagesTimestampsSchema,
  SessionData,
  SessionDataSchema,
  Stage0HashesSchema,
  Stage0TimestampsSchema,
  Stage1HashesSchema,
  Stage1TimestampsSchema,
  Stage2TimestampsSchema,
  Stage3TimestampsSchema,
  State,
  Type,
} from "../../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_CORE_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import type { SATPLogger as Logger } from "../../../../main/typescript/core/satp-logger";
import type { LocalLog } from "../../../../main/typescript/core/types";
import { CrashRecoveryClientService } from "../../../../main/typescript/core/crash-management/client-service";
import { CrashRecoveryServerService } from "../../../../main/typescript/core/crash-management/server-service";
import { KnexLocalLogRepository } from "../../../../main/typescript/database/repository/knex-local-log-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import type { BridgeManagerClientInterface } from "../../../../main/typescript/cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import {
  bufArray2HexStr,
  getSatpLogKey,
  verifySignature,
} from "../../../../main/typescript/utils/gateway-utils";
import { SignatureVerificationError } from "../../../../main/typescript/core/errors/satp-service-errors";

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

function makeSessionData(role: Type): SessionData {
  // Stage 0 complete, Stage 1 partially hashed: the client crashed after
  // the transfer proposal, before the proposal receipt.
  return create(SessionDataSchema, {
    id: SESSION_ID,
    version: SATP_CORE_VERSION,
    role,
    state: State.ONGOING,
    lastSequenceNumber: role === Type.CLIENT ? BigInt(1) : BigInt(2),
    lastMessageReceivedTimestamp: "1700000000000",
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
        transferProposalRequestMessageHash: "h1",
      }),
    }),
    processedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema, {
        newSessionRequestMessageTimestamp: "1700000000000",
        newSessionResponseMessageTimestamp: "1700000000001",
        preSatpTransferRequestMessageTimestamp: "1700000000002",
        preSatpTransferResponseMessageTimestamp: "1700000000003",
      }),
      stage1: create(Stage1TimestampsSchema, {
        transferProposalRequestMessageTimestamp: "1700000000005",
      }),
    }),
    receivedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema, {}),
      stage1: create(Stage1TimestampsSchema, {}),
      stage2: create(Stage2TimestampsSchema, {}),
      stage3: create(Stage3TimestampsSchema, {}),
    }),
  });
}

describe("v13 crash-recovery RPC contract", () => {
  let knexInstance: Knex;
  let serverLogRepository: KnexLocalLogRepository;
  let clientService: CrashRecoveryClientService;
  let serverService: CrashRecoveryServerService;

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

    // The server gateway's state: session reconstructed from its local
    // logs (as crash-manager does on startup) and registered in the
    // session map the crash service serves from.
    const serverSession = SATPSession.recreateSession(
      makeSessionData(Type.SERVER),
      monitorService,
    );
    const sessions = new Map<string, SATPSession>();
    sessions.set(SESSION_ID, serverSession);

    // The server's local log for the crashed session: stage 1 work
    // completed ("done") up to the transfer proposal receipt.
    const serverSessionData = serverSession.getServerSessionData();
    const serverLogEntry: LocalLog = {
      sessionId: SESSION_ID,
      type: "stage1",
      key: getSatpLogKey(SESSION_ID, "stage1", "done"),
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(serverSessionData),
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

  it("handles a signed RecoverRequest and returns the server's logs", async () => {
    const recoverRequest = await clientService.createRecoverRequest(
      makeSessionData(Type.CLIENT),
    );

    const recoverResponse = await serverService.handleRecover(recoverRequest);

    expect(recoverResponse.sessionId).toBe(SESSION_ID);
    expect(recoverResponse.recoveredLogs.length).toBeGreaterThan(0);
    expect(recoverResponse.serverSignature).not.toBe("");

    // The response signature must verify with the server's public key so
    // the client can authenticate the recovered logs.
    expect(verifySignature(serverSigner, recoverResponse, serverPubkey)).toBe(
      true,
    );

    const recoveredLog = recoverResponse.recoveredLogs[0];
    expect(recoveredLog.sessionId).toBe(SESSION_ID);
    expect(recoveredLog.type).toBe("stage1");
  });

  it("rejects a RecoverRequest whose signed fields were tampered with", async () => {
    const recoverRequest = await clientService.createRecoverRequest(
      makeSessionData(Type.CLIENT),
    );
    // Alter the payload after signing: the signature no longer matches.
    recoverRequest.sequenceNumber = 99;

    await expect(serverService.handleRecover(recoverRequest)).rejects.toThrow(
      SignatureVerificationError,
    );
  });

  it("acknowledges a signed RecoverSuccessRequest", async () => {
    const recoverSuccessRequest =
      await clientService.createRecoverSuccessRequest(
        makeSessionData(Type.CLIENT),
      );

    const recoverSuccessResponse = await serverService.handleRecoverSuccess(
      recoverSuccessRequest,
    );

    expect(recoverSuccessResponse.sessionId).toBe(SESSION_ID);
    expect(recoverSuccessResponse.received).toBe(true);
    expect(recoverSuccessResponse.serverSignature).not.toBe("");
  });

  it("rejects a RecoverSuccessRequest signed with the wrong key", async () => {
    // Signed with the SERVER's key instead of the client's: the server
    // must verify against the client gateway public key, so this fails.
    const serverSignedRequest = await createServerSignedRecoverSuccess();
    await expect(
      serverService.handleRecoverSuccess(serverSignedRequest),
    ).rejects.toThrow(SignatureVerificationError);
  });

  /**
   * Builds a RecoverSuccessRequest signed with the server's key — used to
   * prove the server verifies client requests against the CLIENT key.
   */
  async function createServerSignedRecoverSuccess() {
    // Reuse the real client builder for the message shape, then re-sign
    // with the server's signer to simulate a wrong-key forgery.
    const request = await clientService.createRecoverSuccessRequest(
      makeSessionData(Type.CLIENT),
    );
    request.clientSignature = bufArray2HexStr(
      serverSigner.sign(
        safeStableStringify({ ...request, clientSignature: "" }),
      ),
    );
    return request;
  }
});
