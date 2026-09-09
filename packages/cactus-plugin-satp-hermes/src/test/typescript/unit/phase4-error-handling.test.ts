/**
 * Unit tests for Phase 4 error handling additions:
 * - SATPInternalError.getSATPErrorCode()
 * - HashPrevMessageError
 * - MissingTransferContextIdError
 * - hashPrevMessageVerifier in data-verifier.ts
 * - transferContextId REQUIRED validation in commonBodyVerifier
 */
import { create } from "@bufbuild/protobuf";
import {
  CommonSatpSchema,
  MessageType,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SessionDataSchema,
  SessionData,
  MessageStagesHashesSchema,
  Stage0HashesSchema,
  Stage1HashesSchema,
  Stage2HashesSchema,
  Stage3HashesSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_VERSION } from "../../../main/typescript/core/constants";
import {
  commonBodyVerifier,
  hashPrevMessageVerifier,
} from "../../../main/typescript/core/stage-services/verifier/data-verifier";
import { SATPInternalError } from "../../../main/typescript/core/errors/satp-errors";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";
import {
  HashPrevMessageError,
  MissingTransferContextIdError,
  SessionDataNotLoadedCorrectlyError,
} from "../../../main/typescript/core/errors/satp-service-errors";
import {
  ERR_1_1_1,
  ERR_1_2_2,
  ERR_1_2_3,
} from "../../../main/typescript/core/errors/iana-error-codes";
import { saveHash } from "../../../main/typescript/core/session-utils";

function makeSessionData(
  overrides?: Partial<Record<string, unknown>>,
): SessionData {
  return create(SessionDataSchema, {
    id: "session-001",
    transferContextId: "ctx-001",
    version: SATP_VERSION,
    hashes: create(MessageStagesHashesSchema, {
      stage0: create(Stage0HashesSchema),
      stage1: create(Stage1HashesSchema),
      stage2: create(Stage2HashesSchema),
      stage3: create(Stage3HashesSchema),
    }),
    ...overrides,
  } as Record<string, unknown>);
}

function makeCommon(overrides?: Record<string, unknown>) {
  return create(CommonSatpSchema, {
    version: SATP_VERSION,
    messageType: MessageType.INIT_PROPOSAL,
    sessionId: "session-001",
    transferContextId: "ctx-001",
    ...overrides,
  });
}

describe("SATPInternalError.getSATPErrorCode()", () => {
  it("returns ERR_1_1_1 for default UNSPECIFIED error type", () => {
    const err = new SATPInternalError("test error", null, 500);
    expect(err.getSATPErrorCode()).toBe(ERR_1_1_1);
  });

  it("returns the mapped v13 code for a specific error type", () => {
    const err = new MissingTransferContextIdError("test");
    expect(err.getSATPErrorType()).toBe(SATPErrorType.CONTEXT_ID_MISS_MATCH);
    expect(err.getSATPErrorCode()).toBe(ERR_1_2_2);
  });

  it("returns ERR_1_2_3 for HashPrevMessageError", () => {
    const err = new HashPrevMessageError("test", "abc", "def");
    expect(err.getSATPErrorType()).toBe(
      SATPErrorType.BADLY_FORMATED_MESSAGE_MISMATCH_HASH_VALUES,
    );
    expect(err.getSATPErrorCode()).toBe(ERR_1_2_3);
  });
});

describe("HashPrevMessageError", () => {
  it("has correct error type", () => {
    const err = new HashPrevMessageError("tag", "received", "expected");
    expect(err.getSATPErrorType()).toBe(
      SATPErrorType.BADLY_FORMATED_MESSAGE_MISMATCH_HASH_VALUES,
    );
  });

  it("has HTTP 400 status", () => {
    const err = new HashPrevMessageError("tag", "r", "e");
    expect(err.code).toBe(400);
  });

  it("includes received and expected in message", () => {
    const err = new HashPrevMessageError("myTag", "abc123", "def456");
    expect(err.message).toContain("abc123");
    expect(err.message).toContain("def456");
    expect(err.message).toContain("hashPrevMessage mismatch");
  });
});

describe("MissingTransferContextIdError", () => {
  it("has correct error type", () => {
    const err = new MissingTransferContextIdError("tag");
    expect(err.getSATPErrorType()).toBe(SATPErrorType.CONTEXT_ID_MISS_MATCH);
  });

  it("has HTTP 400 status", () => {
    const err = new MissingTransferContextIdError("tag");
    expect(err.code).toBe(400);
  });

  it("message mentions REQUIRED", () => {
    const err = new MissingTransferContextIdError("myTag");
    expect(err.message).toContain("REQUIRED");
    expect(err.message).toContain("transferContextId");
  });
});

describe("commonBodyVerifier — transferContextId REQUIRED", () => {
  const TAG = "TestVerifier";

  it("throws MissingTransferContextIdError when transferContextId is empty", () => {
    const session = makeSessionData({ transferContextId: "" });
    const common = makeCommon({ transferContextId: "" });
    expect(() =>
      commonBodyVerifier(TAG, common, session, MessageType.INIT_PROPOSAL),
    ).toThrow(MissingTransferContextIdError);
  });

  it("does NOT throw when transferContextId is present and matches", () => {
    const session = makeSessionData();
    const common = makeCommon();
    expect(() =>
      commonBodyVerifier(TAG, common, session, MessageType.INIT_PROPOSAL),
    ).not.toThrow();
  });
});

describe("hashPrevMessageVerifier", () => {
  const TAG = "TestHashVerifier";

  it("throws SessionDataNotLoadedCorrectlyError for undefined sessionData", () => {
    expect(() =>
      hashPrevMessageVerifier(
        TAG,
        "somehash",
        undefined,
        MessageType.INIT_PROPOSAL,
      ),
    ).toThrow(SessionDataNotLoadedCorrectlyError);
  });

  it("throws HashPrevMessageError for empty hashPrevMessage", () => {
    const session = makeSessionData();
    // Save a hash for INIT_PROPOSAL so we have an expected value
    saveHash(session, MessageType.INIT_PROPOSAL, "expectedHash123");
    expect(() =>
      hashPrevMessageVerifier(TAG, "", session, MessageType.INIT_PROPOSAL),
    ).toThrow(HashPrevMessageError);
  });

  it("throws HashPrevMessageError for undefined hashPrevMessage", () => {
    const session = makeSessionData();
    saveHash(session, MessageType.INIT_PROPOSAL, "expectedHash123");
    expect(() =>
      hashPrevMessageVerifier(
        TAG,
        undefined,
        session,
        MessageType.INIT_PROPOSAL,
      ),
    ).toThrow(HashPrevMessageError);
  });

  it("throws HashPrevMessageError when hash does not match", () => {
    const session = makeSessionData();
    saveHash(session, MessageType.INIT_PROPOSAL, "expectedHash123");
    expect(() =>
      hashPrevMessageVerifier(
        TAG,
        "wrongHash456",
        session,
        MessageType.INIT_PROPOSAL,
      ),
    ).toThrow(HashPrevMessageError);
  });

  it("does NOT throw when hashPrevMessage matches stored hash", () => {
    const session = makeSessionData();
    const storedHash = "correctHash789";
    saveHash(session, MessageType.INIT_PROPOSAL, storedHash);
    expect(() =>
      hashPrevMessageVerifier(
        TAG,
        storedHash,
        session,
        MessageType.INIT_PROPOSAL,
      ),
    ).not.toThrow();
  });

  it("validates across different message types", () => {
    const session = makeSessionData();
    const hash1 = "hashForProposal";
    const hash2 = "hashForCommence";
    saveHash(session, MessageType.INIT_PROPOSAL, hash1);
    saveHash(session, MessageType.TRANSFER_COMMENCE_REQUEST, hash2);

    // Correct hash for INIT_PROPOSAL
    expect(() =>
      hashPrevMessageVerifier(TAG, hash1, session, MessageType.INIT_PROPOSAL),
    ).not.toThrow();

    // Correct hash for TRANSFER_COMMENCE_REQUEST
    expect(() =>
      hashPrevMessageVerifier(
        TAG,
        hash2,
        session,
        MessageType.TRANSFER_COMMENCE_REQUEST,
      ),
    ).not.toThrow();

    // Wrong hash for TRANSFER_COMMENCE_REQUEST
    expect(() =>
      hashPrevMessageVerifier(
        TAG,
        hash1,
        session,
        MessageType.TRANSFER_COMMENCE_REQUEST,
      ),
    ).toThrow(HashPrevMessageError);
  });
});
