/**
 * Unit tests for the Stage 3 bespoke verifier functions.
 *
 * These pin down the Stage 3 checks that were extracted out of the service
 * step methods into the server verifiers (`verifyCommitPreparationRequestMessage`,
 * `verifyCommitFinalAssertionRequestMessage`, `verifyTransferCompleteRequestMessage`)
 * and the client verifiers (`verifyLockAssertionResponseMessage`,
 * `verifyCommitPreparationResponseMessage`,
 * `verifyCommitFinalAssertionResponseMessage`,
 * `verifyTransferCompleteResponseMessage`), which compose on top of the shared
 * `verifyMessage` entry point.
 */
import { create } from "@bufbuild/protobuf";
import {
  JsObjectSigner,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import {
  AssignmentAssertionClaimSchema,
  BurnAssertionClaimSchema,
  CommonSatpSchema,
  MessageType,
  MintAssertionClaimSchema,
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
  CommitFinalAssertionRequest,
  CommitFinalAssertionRequestSchema,
  CommitFinalAssertionResponse,
  CommitFinalAssertionResponseSchema,
  CommitPreparationRequest,
  CommitPreparationRequestSchema,
  CommitPreparationResponse,
  CommitPreparationResponseSchema,
  TransferCompleteRequest,
  TransferCompleteRequestSchema,
  TransferCompleteResponse,
  TransferCompleteResponseSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_3_pb";
import {
  LockAssertionResponse,
  LockAssertionResponseSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_2_pb";
import { SATP_CORE_VERSION } from "../../../main/typescript/core/constants";
import {
  AssertionClaimType,
  signAssertionClaim,
} from "../../../main/typescript/utils/gateway-utils";
import type { SatpStepTag } from "../../../main/typescript/core/satp-protocol-map";
import {
  verifyCommitFinalAssertionRequestMessage,
  verifyCommitPreparationRequestMessage,
  verifyTransferCompleteRequestMessage,
} from "../../../main/typescript/core/stage-services/verifier/stage-3-server-service-verifications";
import {
  verifyCommitFinalAssertionResponseMessage,
  verifyCommitPreparationResponseMessage,
  verifyLockAssertionResponseMessage,
  verifyTransferCompleteResponseMessage,
} from "../../../main/typescript/core/stage-services/verifier/stage-3-client-service-verifications";
import {
  AssignmentAssertionClaimError,
  BurnAssertionClaimError,
  ClaimSignatureError,
  HashPrevMessageError,
  MintAssertionClaimError,
  ReplayedMessageError,
  SessionError,
} from "../../../main/typescript/core/errors/satp-service-errors";
import type { SATPSession } from "../../../main/typescript/core/satp-session";
import type { SATPLogger as Logger } from "../../../main/typescript/core/satp-logger";

const TAG = "TestStage3Verifier";

// Hash-chain fixture: every inbound message references the stored hash of
// its predecessor, exactly as the stage services record it via saveHash
// when they send the predecessor. The value itself is arbitrary — the
// verifiers only compare the message's hashPrevMessage against the stored
// predecessor hash.
const PREV_HASH = "prev-message-hash";

// Real secp256k1 signer so claim signatures are actually produced and
// verified — matches how the gateway signs claims in production.
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
const signer = new JsObjectSigner({
  privateKey: new Uint8Array(keyPairs.privateKey),
});

// Hex pubkey of the claim-issuing gateway, as stored in session data.
const claimIssuerPubkey = Buffer.from(keyPairs.publicKey).toString("hex");

// Session ID shared by the fixtures' messages and session data, so claim
// signatures bind to the same session the verifier will reconstruct.
const SESSION_ID = "session-001";

// A claim signed like the gateway does it: the signature covers the
// canonical payload binding receipt and proof to the claim type, protocol
// step, and session ID (see signAssertionClaim), hex-encoded.
const CLAIM_PROOF = "0x" + Buffer.from(`proof-${Date.now()}`).toString("hex");
function makeSignedClaimSignature(
  claimType: AssertionClaimType,
  stepTag: SatpStepTag,
  receipt: string,
  proof: string = CLAIM_PROOF,
): string {
  return signAssertionClaim(
    signer,
    { receipt, proof },
    {
      claimType,
      stepTag,
      sessionId: SESSION_ID,
    },
  );
}

function makeSignedClaimReceipt(): string {
  return "0x" + Buffer.from(`receipt-${Date.now()}`).toString("hex");
}

// The optional-variable info logs are the only logger interaction the verifiers
// perform, so a no-op stub is sufficient.
const logger = {
  info: () => undefined,
  debug: () => undefined,
} as unknown as Logger;

function makeSessionData(overrides?: Record<string, unknown>): SessionData {
  return create(SessionDataSchema, {
    id: SESSION_ID,
    transferContextId: "ctx-001",
    version: SATP_CORE_VERSION,
    hashes: create(MessageStagesHashesSchema, {
      stage0: create(Stage0HashesSchema),
      stage1: create(Stage1HashesSchema),
      stage2: create(Stage2HashesSchema, {
        lockAssertionRequestMessageHash: PREV_HASH,
        lockAssertionReceiptMessageHash: PREV_HASH,
      }),
      stage3: create(Stage3HashesSchema, {
        commitPreparationRequestMessageHash: PREV_HASH,
        commitReadyResponseMessageHash: PREV_HASH,
        commitFinalAssertionRequestMessageHash: PREV_HASH,
        commitFinalAcknowledgementReceiptResponseMessageHash: PREV_HASH,
        transferCompleteMessageHash: PREV_HASH,
      }),
    }),
    processedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema),
      stage1: create(Stage1TimestampsSchema),
      stage2: create(Stage2TimestampsSchema),
      stage3: create(Stage3TimestampsSchema),
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

function common(messageType: MessageType) {
  return create(CommonSatpSchema, {
    version: SATP_CORE_VERSION,
    messageType,
    sessionId: SESSION_ID,
    transferContextId: "ctx-001",
  });
}

function makeCommitPreparationRequest(): CommitPreparationRequest {
  return create(CommitPreparationRequestSchema, {
    common: common(MessageType.COMMIT_PREPARE),
    hashPrevMessage: PREV_HASH,
  });
}

function makeCommitFinalAssertionRequest(): CommitFinalAssertionRequest {
  const receipt = makeSignedClaimReceipt();
  return create(CommitFinalAssertionRequestSchema, {
    common: common(MessageType.COMMIT_FINAL),
    hashPrevMessage: PREV_HASH,
    burnAssertionClaim: create(BurnAssertionClaimSchema, {
      receipt,
      proof: CLAIM_PROOF,
      signature: makeSignedClaimSignature(
        "BURN",
        "commitFinalAssertion",
        receipt,
      ),
    }),
  });
}

function makeTransferCompleteRequest(): TransferCompleteRequest {
  return create(TransferCompleteRequestSchema, {
    common: common(MessageType.COMMIT_TRANSFER_COMPLETE),
    hashPrevMessage: PREV_HASH,
  });
}

function makeLockAssertionResponse(): LockAssertionResponse {
  return create(LockAssertionResponseSchema, {
    common: common(MessageType.ASSERTION_RECEIPT),
    hashPrevMessage: PREV_HASH,
  });
}

function makeCommitPreparationResponse(): CommitPreparationResponse {
  const receipt = makeSignedClaimReceipt();
  return create(CommitPreparationResponseSchema, {
    common: common(MessageType.COMMIT_READY),
    hashPrevMessage: PREV_HASH,
    mintAssertionClaim: create(MintAssertionClaimSchema, {
      receipt,
      proof: CLAIM_PROOF,
      signature: makeSignedClaimSignature(
        "MINT",
        "commitReadyResponse",
        receipt,
      ),
    }),
  });
}

function makeCommitFinalAssertionResponse(): CommitFinalAssertionResponse {
  const receipt = makeSignedClaimReceipt();
  return create(CommitFinalAssertionResponseSchema, {
    common: common(MessageType.ACK_COMMIT_FINAL),
    hashPrevMessage: PREV_HASH,
    assignmentAssertionClaim: create(AssignmentAssertionClaimSchema, {
      receipt,
      proof: CLAIM_PROOF,
      signature: makeSignedClaimSignature(
        "ASSIGNMENT",
        "commitFinalAcknowledgementReceiptResponse",
        receipt,
      ),
    }),
  });
}

function makeTransferCompleteResponse(): TransferCompleteResponse {
  return create(TransferCompleteResponseSchema, {
    common: common(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
  });
}

describe("verifyCommitPreparationRequestMessage", () => {
  it("throws SessionError when the session is undefined", () => {
    const request = makeCommitPreparationRequest();
    expect(() =>
      verifyCommitPreparationRequestMessage(TAG, signer, request, undefined),
    ).toThrow(SessionError);
  });

  it("passes for a valid request", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const request = makeCommitPreparationRequest();

    expect(() =>
      verifyCommitPreparationRequestMessage(TAG, signer, request, session),
    ).not.toThrow();
  });

  it("throws HashPrevMessageError when the hash chain is broken", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const request = makeCommitPreparationRequest();
    request.hashPrevMessage = "tampered-hash";

    expect(() =>
      verifyCommitPreparationRequestMessage(TAG, signer, request, session),
    ).toThrow(HashPrevMessageError);
  });
});

describe("verifyCommitFinalAssertionRequestMessage", () => {
  it("throws BurnAssertionClaimError when the burn-assertion claim is missing", () => {
    const session = makeSession(makeSessionData());
    const request = makeCommitFinalAssertionRequest();
    request.burnAssertionClaim = undefined;
    expect(() =>
      verifyCommitFinalAssertionRequestMessage(
        TAG,
        signer,
        request,
        session,
        logger,
      ),
    ).toThrow(BurnAssertionClaimError);
  });

  it("passes for a valid request", () => {
    const sessionData = makeSessionData({
      clientGatewayPubkey: claimIssuerPubkey,
    });
    const session = makeSession(sessionData);
    const request = makeCommitFinalAssertionRequest();

    expect(() =>
      verifyCommitFinalAssertionRequestMessage(
        TAG,
        signer,
        request,
        session,
        logger,
      ),
    ).not.toThrow();
  });

  it("throws ClaimSignatureError when the burn-claim signature is invalid", () => {
    const sessionData = makeSessionData({
      clientGatewayPubkey: claimIssuerPubkey,
    });
    const session = makeSession(sessionData);
    const request = makeCommitFinalAssertionRequest();
    request.burnAssertionClaim!.signature = "deadbeef";

    expect(() =>
      verifyCommitFinalAssertionRequestMessage(
        TAG,
        signer,
        request,
        session,
        logger,
      ),
    ).toThrow(ClaimSignatureError);
  });
});

describe("verifyTransferCompleteRequestMessage", () => {
  it("passes for a valid request", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const request = makeTransferCompleteRequest();

    expect(() =>
      verifyTransferCompleteRequestMessage(TAG, signer, request, session),
    ).not.toThrow();
  });
});

describe("verifyLockAssertionResponseMessage", () => {
  it("throws SessionError when the session is undefined", () => {
    const response = makeLockAssertionResponse();
    expect(() =>
      verifyLockAssertionResponseMessage(TAG, signer, response, undefined),
    ).toThrow(SessionError);
  });

  it("passes for a valid response", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const response = makeLockAssertionResponse();

    expect(() =>
      verifyLockAssertionResponseMessage(TAG, signer, response, session),
    ).not.toThrow();
  });
});

describe("verifyCommitPreparationResponseMessage", () => {
  it("throws MintAssertionClaimError when the mint-assertion claim is missing", () => {
    const session = makeSession(makeSessionData());
    const response = makeCommitPreparationResponse();
    response.mintAssertionClaim = undefined;
    expect(() =>
      verifyCommitPreparationResponseMessage(
        TAG,
        signer,
        response,
        session,
        logger,
      ),
    ).toThrow(MintAssertionClaimError);
  });

  it("passes for a valid response", () => {
    const sessionData = makeSessionData({
      serverGatewayPubkey: claimIssuerPubkey,
    });
    const session = makeSession(sessionData);
    const response = makeCommitPreparationResponse();

    expect(() =>
      verifyCommitPreparationResponseMessage(
        TAG,
        signer,
        response,
        session,
        logger,
      ),
    ).not.toThrow();
  });

  it("throws ClaimSignatureError when the mint-claim signature is invalid", () => {
    const sessionData = makeSessionData({
      serverGatewayPubkey: claimIssuerPubkey,
    });
    const session = makeSession(sessionData);
    const response = makeCommitPreparationResponse();
    response.mintAssertionClaim!.signature = "deadbeef";

    expect(() =>
      verifyCommitPreparationResponseMessage(
        TAG,
        signer,
        response,
        session,
        logger,
      ),
    ).toThrow(ClaimSignatureError);
  });
});

describe("verifyCommitFinalAssertionResponseMessage", () => {
  it("throws AssignmentAssertionClaimError when the assignment-assertion claim is missing", () => {
    const session = makeSession(makeSessionData());
    const response = makeCommitFinalAssertionResponse();
    response.assignmentAssertionClaim = undefined;
    expect(() =>
      verifyCommitFinalAssertionResponseMessage(
        TAG,
        signer,
        response,
        session,
        logger,
      ),
    ).toThrow(AssignmentAssertionClaimError);
  });

  it("passes for a valid response", () => {
    const sessionData = makeSessionData({
      serverGatewayPubkey: claimIssuerPubkey,
    });
    const session = makeSession(sessionData);
    const response = makeCommitFinalAssertionResponse();

    expect(() =>
      verifyCommitFinalAssertionResponseMessage(
        TAG,
        signer,
        response,
        session,
        logger,
      ),
    ).not.toThrow();
  });

  it("throws ClaimSignatureError when the assignment-claim signature is invalid", () => {
    const sessionData = makeSessionData({
      serverGatewayPubkey: claimIssuerPubkey,
    });
    const session = makeSession(sessionData);
    const response = makeCommitFinalAssertionResponse();
    response.assignmentAssertionClaim!.signature = "deadbeef";

    expect(() =>
      verifyCommitFinalAssertionResponseMessage(
        TAG,
        signer,
        response,
        session,
        logger,
      ),
    ).toThrow(ClaimSignatureError);
  });
});

describe("verifyTransferCompleteResponseMessage", () => {
  it("throws SessionError when the session is undefined", () => {
    const response = makeTransferCompleteResponse();
    expect(() =>
      verifyTransferCompleteResponseMessage(TAG, signer, response, undefined),
    ).toThrow(SessionError);
  });

  it("passes for a valid response", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const response = makeTransferCompleteResponse();

    expect(() =>
      verifyTransferCompleteResponseMessage(TAG, signer, response, session),
    ).not.toThrow();
  });
});

describe("pastMessageReplayVerifier (in-session replay defense)", () => {
  const TS = Date.now().toString();

  it("passes when the flow has not moved past the message", () => {
    const sessionData = makeSessionData();
    const session = makeSession(sessionData);
    const request = makeCommitPreparationRequest();

    expect(() =>
      verifyCommitPreparationRequestMessage(TAG, signer, request, session),
    ).not.toThrow();
  });

  it("tolerates a duplicate of the in-flight exchange", () => {
    // COMMIT_READY is COMMIT_PREPARE's immediate successor: the server
    // already processed (sent) it, but a re-delivered COMMIT_PREPARE may
    // legitimately arrive while the response is still in flight.
    const sessionData = makeSessionData({
      processedTimestamps: create(MessageStagesTimestampsSchema, {
        stage0: create(Stage0TimestampsSchema),
        stage1: create(Stage1TimestampsSchema),
        stage2: create(Stage2TimestampsSchema),
        stage3: create(Stage3TimestampsSchema, {
          commitReadyResponseMessageTimestamp: TS,
        }),
      }),
    });
    const session = makeSession(sessionData);
    const request = makeCommitPreparationRequest();

    expect(() =>
      verifyCommitPreparationRequestMessage(TAG, signer, request, session),
    ).not.toThrow();
  });

  it("rejects a message replayed after the flow moved on", () => {
    // COMMIT_FINAL is two positions past COMMIT_PREPARE: processing a
    // COMMIT_PREPARE now can only be a replay.
    const sessionData = makeSessionData({
      receivedTimestamps: create(MessageStagesTimestampsSchema, {
        stage0: create(Stage0TimestampsSchema),
        stage1: create(Stage1TimestampsSchema),
        stage2: create(Stage2TimestampsSchema),
        stage3: create(Stage3TimestampsSchema, {
          commitFinalAssertionRequestMessageTimestamp: TS,
        }),
      }),
    });
    const session = makeSession(sessionData);
    const request = makeCommitPreparationRequest();

    expect(() =>
      verifyCommitPreparationRequestMessage(TAG, signer, request, session),
    ).toThrow(ReplayedMessageError);
  });

  it("rejects cross-stage replays of a stage-2 message", () => {
    // The client already has the server's COMMIT_READY; a re-delivered
    // ASSERTION_RECEIPT (stage 2) is a replay from the session's past.
    const sessionData = makeSessionData({
      receivedTimestamps: create(MessageStagesTimestampsSchema, {
        stage0: create(Stage0TimestampsSchema),
        stage1: create(Stage1TimestampsSchema),
        stage2: create(Stage2TimestampsSchema),
        stage3: create(Stage3TimestampsSchema, {
          commitReadyResponseMessageTimestamp: TS,
        }),
      }),
    });
    const session = makeSession(sessionData);
    const response = makeLockAssertionResponse();

    expect(() =>
      verifyLockAssertionResponseMessage(TAG, signer, response, session),
    ).toThrow(ReplayedMessageError);
  });
});
