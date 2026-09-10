/**
 * Unit tests for the Stage 2 bespoke verifier functions.
 *
 * These pin down the Stage 2 checks that were extracted out of the service
 * step methods into `verifyLockAssertionRequestMessage` (server) and
 * `verifyTransferCommenceResponseMessage` (client), which compose on top of
 * the shared `verifyMessage` entry point.
 */
import { create } from "@bufbuild/protobuf";
import {
  JsObjectSigner,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import {
  CommonSatpSchema,
  LockAssertionClaimFormatSchema,
  LockAssertionClaimSchema,
  MessageType,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  MessageStagesHashesSchema,
  MessageStagesTimestampsSchema,
  SessionData,
  SessionDataSchema,
  Stage0HashesSchema,
  Stage0TimestampsSchema,
  Stage1HashesSchema,
  Stage1TimestampsSchema,
  Stage2HashesSchema,
  Stage2TimestampsSchema,
  Stage3HashesSchema,
  Stage3TimestampsSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import {
  LockAssertionRequest,
  LockAssertionRequestSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_2_pb";
import {
  TransferCommenceResponse,
  TransferCommenceResponseSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_1_pb";
import { SATP_VERSION } from "../../../main/typescript/core/constants";
import { verifyLockAssertionRequestMessage } from "../../../main/typescript/core/stage-services/verifier/stage-2-server-service-verifications";
import { verifyTransferCommenceResponseMessage } from "../../../main/typescript/core/stage-services/verifier/stage-2-client-service-verifications";
import {
  LockAssertionClaimError,
  LockAssertionClaimFormatError,
  LockAssertionExpirationError,
  ClaimSignatureError,
  SessionError,
} from "../../../main/typescript/core/errors/satp-service-errors";
import type { SATPSession } from "../../../main/typescript/core/satp-session";

const TAG = "TestStage2Verifier";
const LOCK_EXPIRATION_TIME = BigInt(5 * 60 * 1000);

// Real secp256k1 signer so claim signatures are actually produced and
// verified — matches how the gateway signs claims in production.
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
const signer = new JsObjectSigner({
  privateKey: new Uint8Array(keyPairs.privateKey),
});

// A claim signed like the gateway does it: sign(signer, receipt), hex-encoded.
function makeSignedClaimReceipt(): string {
  return "0x" + Buffer.from(`receipt-${Date.now()}`).toString("hex");
}

function makeSessionData(overrides?: Record<string, unknown>): SessionData {
  return create(SessionDataSchema, {
    id: "session-001",
    transferContextId: "ctx-001",
    version: SATP_VERSION,
    lockExpirationTime: LOCK_EXPIRATION_TIME,
    hashes: create(MessageStagesHashesSchema, {
      stage0: create(Stage0HashesSchema),
      stage1: create(Stage1HashesSchema),
      stage2: create(Stage2HashesSchema),
      stage3: create(Stage3HashesSchema),
    }),
    receivedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema),
      stage1: create(Stage1TimestampsSchema),
      stage2: create(Stage2TimestampsSchema),
      stage3: create(Stage3TimestampsSchema),
    }),
    ...overrides,
  } as Record<string, unknown>);
}

function makeSession(sessionData: SessionData): SATPSession {
  return {
    verify: () => undefined,
    getServerSessionData: () => sessionData,
    getClientSessionData: () => sessionData,
  } as unknown as SATPSession;
}

function makeLockAssertionRequest(
  lockAssertionExpiration: bigint,
): LockAssertionRequest {
  const receipt = makeSignedClaimReceipt();
  return create(LockAssertionRequestSchema, {
    common: create(CommonSatpSchema, {
      version: SATP_VERSION,
      messageType: MessageType.LOCK_ASSERT,
      sessionId: "session-001",
      transferContextId: "ctx-001",
    }),
    lockAssertionClaim: create(LockAssertionClaimSchema, {
      receipt,
      signature: Buffer.from(signer.sign(receipt)).toString("hex"),
    }),
    lockAssertionClaimFormat: create(LockAssertionClaimFormatSchema, {}),
    lockAssertionExpiration,
  });
}

function makeTransferCommenceResponse(): TransferCommenceResponse {
  return create(TransferCommenceResponseSchema, {
    common: create(CommonSatpSchema, {
      version: SATP_VERSION,
      messageType: MessageType.TRANSFER_COMMENCE_RESPONSE,
      sessionId: "session-001",
      transferContextId: "ctx-001",
    }),
  });
}

describe("verifyLockAssertionRequestMessage", () => {
  it("throws SessionError when the session is undefined", () => {
    const request = makeLockAssertionRequest(
      BigInt(Date.now()) + BigInt(60_000),
    );
    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, undefined),
    ).toThrow(SessionError);
  });

  it("throws LockAssertionClaimError when the claim is missing", () => {
    const session = makeSession(makeSessionData());
    const request = makeLockAssertionRequest(
      BigInt(Date.now()) + BigInt(60_000),
    );
    request.lockAssertionClaim = undefined;
    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).toThrow(LockAssertionClaimError);
  });

  it("throws LockAssertionClaimFormatError when the format is missing", () => {
    const session = makeSession(makeSessionData());
    const request = makeLockAssertionRequest(
      BigInt(Date.now()) + BigInt(60_000),
    );
    request.lockAssertionClaimFormat = undefined;
    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).toThrow(LockAssertionClaimFormatError);
  });

  it("throws LockAssertionExpirationError when already expired", () => {
    const session = makeSession(makeSessionData());
    const request = makeLockAssertionRequest(BigInt(1));
    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).toThrow(LockAssertionExpirationError);
  });

  it("throws LockAssertionExpirationError when beyond the negotiated window", () => {
    const session = makeSession(makeSessionData());
    const request = makeLockAssertionRequest(
      BigInt(Date.now()) + LOCK_EXPIRATION_TIME + BigInt(60_000),
    );
    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).toThrow(LockAssertionExpirationError);
  });

  it("passes for a valid request", () => {
    const sessionData = makeSessionData({
      clientGatewayPubkey: Buffer.from(keyPairs.publicKey).toString("hex"),
    });
    const session = makeSession(sessionData);
    const expiration = BigInt(Date.now()) + BigInt(60_000);
    const request = makeLockAssertionRequest(expiration);

    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).not.toThrow();
  });

  it("throws ClaimSignatureError when the claim signature is invalid", () => {
    const sessionData = makeSessionData({
      clientGatewayPubkey: Buffer.from(keyPairs.publicKey).toString("hex"),
    });
    const session = makeSession(sessionData);
    const expiration = BigInt(Date.now()) + BigInt(60_000);
    const request = makeLockAssertionRequest(expiration);
    request.lockAssertionClaim!.signature = "deadbeef";

    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).toThrow(ClaimSignatureError);
  });

  it("throws ClaimSignatureError when the session has no client gateway pubkey", () => {
    const session = makeSession(makeSessionData());
    const expiration = BigInt(Date.now()) + BigInt(60_000);
    const request = makeLockAssertionRequest(expiration);

    expect(() =>
      verifyLockAssertionRequestMessage(TAG, signer, request, session),
    ).toThrow(ClaimSignatureError);
  });
});

describe("verifyTransferCommenceResponseMessage", () => {
  it("throws SessionError when the session is undefined", () => {
    const response = makeTransferCommenceResponse();
    expect(() =>
      verifyTransferCommenceResponseMessage(TAG, signer, response, undefined),
    ).toThrow(SessionError);
  });

  it("passes for a valid response", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const response = makeTransferCommenceResponse();

    expect(() =>
      verifyTransferCommenceResponseMessage(TAG, signer, response, session),
    ).not.toThrow();
  });
});
