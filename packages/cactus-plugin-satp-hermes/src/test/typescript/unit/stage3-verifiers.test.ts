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
  MintAssertionClaimError,
  SessionError,
} from "../../../main/typescript/core/errors/satp-service-errors";
import type { SATPSession } from "../../../main/typescript/core/satp-session";
import type { SATPLogger as Logger } from "../../../main/typescript/core/satp-logger";

const TAG = "TestStage3Verifier";

// Real secp256k1 signer so claim signatures are actually produced and
// verified — matches how the gateway signs claims in production.
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
const signer = new JsObjectSigner({
  privateKey: new Uint8Array(keyPairs.privateKey),
});

// Hex pubkey of the claim-issuing gateway, as stored in session data.
const claimIssuerPubkey = Buffer.from(keyPairs.publicKey).toString("hex");

// A claim signed like the gateway does it: sign(signer, receipt), hex-encoded.
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
    id: "session-001",
    transferContextId: "ctx-001",
    version: SATP_CORE_VERSION,
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

function common(messageType: MessageType) {
  return create(CommonSatpSchema, {
    version: SATP_CORE_VERSION,
    messageType,
    sessionId: "session-001",
    transferContextId: "ctx-001",
  });
}

function makeCommitPreparationRequest(): CommitPreparationRequest {
  return create(CommitPreparationRequestSchema, {
    common: common(MessageType.COMMIT_PREPARE),
  });
}

function makeCommitFinalAssertionRequest(): CommitFinalAssertionRequest {
  const receipt = makeSignedClaimReceipt();
  return create(CommitFinalAssertionRequestSchema, {
    common: common(MessageType.COMMIT_FINAL),
    burnAssertionClaim: create(BurnAssertionClaimSchema, {
      receipt,
      signature: Buffer.from(signer.sign(receipt)).toString("hex"),
    }),
  });
}

function makeTransferCompleteRequest(): TransferCompleteRequest {
  return create(TransferCompleteRequestSchema, {
    common: common(MessageType.COMMIT_TRANSFER_COMPLETE),
  });
}

function makeLockAssertionResponse(): LockAssertionResponse {
  return create(LockAssertionResponseSchema, {
    common: common(MessageType.ASSERTION_RECEIPT),
  });
}

function makeCommitPreparationResponse(): CommitPreparationResponse {
  const receipt = makeSignedClaimReceipt();
  return create(CommitPreparationResponseSchema, {
    common: common(MessageType.COMMIT_READY),
    mintAssertionClaim: create(MintAssertionClaimSchema, {
      receipt,
      signature: Buffer.from(signer.sign(receipt)).toString("hex"),
    }),
  });
}

function makeCommitFinalAssertionResponse(): CommitFinalAssertionResponse {
  const receipt = makeSignedClaimReceipt();
  return create(CommitFinalAssertionResponseSchema, {
    common: common(MessageType.ACK_COMMIT_FINAL),
    assignmentAssertionClaim: create(AssignmentAssertionClaimSchema, {
      receipt,
      signature: Buffer.from(signer.sign(receipt)).toString("hex"),
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
