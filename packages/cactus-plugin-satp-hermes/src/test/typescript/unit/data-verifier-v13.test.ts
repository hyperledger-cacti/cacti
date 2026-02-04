/**
 * Unit tests for the v13 commonBodyVerifier logic in data-verifier.ts.
 *
 * Phase 2 of the v02→v13 upgrade simplified commonBodyVerifier to only
 * check 4 CommonSatp fields (version, messageType, sessionId, transferContextId).
 * The v02 checks for sequenceNumber, resourceUrl, pubkeys, and hashPreviousMessage
 * were removed because those fields moved out of CommonSatp in v13.
 */
import { create } from "@bufbuild/protobuf";
import {
  CommonSatpSchema,
  MessageType,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SessionDataSchema,
  SessionData,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_VERSION } from "../../../main/typescript/core/constants";
import { commonBodyVerifier } from "../../../main/typescript/core/stage-services/data-verifier";
import {
  SatpCommonBodyError,
  SATPVersionError,
  SessionDataNotLoadedCorrectlyError,
  TransferContextIdError,
  MessageTypeError,
  MissingTransferContextIdError,
} from "../../../main/typescript/core/errors/satp-service-errors";

function makeSessionData(
  overrides?: Partial<Record<string, unknown>>,
): SessionData {
  return create(SessionDataSchema, {
    id: "session-001",
    transferContextId: "ctx-001",
    version: SATP_VERSION,
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

describe("commonBodyVerifier — v13 validation", () => {
  const TAG = "TestVerifier";

  it("passes for valid v13 CommonSatp with matching session data", () => {
    const sessionData = makeSessionData();
    const common = makeCommon();

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).not.toThrow();
  });

  it("throws SessionDataNotLoadedCorrectlyError when sessionData is undefined", () => {
    const common = makeCommon();

    expect(() => {
      commonBodyVerifier(TAG, common, undefined, MessageType.INIT_PROPOSAL);
    }).toThrow(SessionDataNotLoadedCorrectlyError);
  });

  it("throws SatpCommonBodyError when common is undefined", () => {
    const sessionData = makeSessionData();

    expect(() => {
      commonBodyVerifier(
        TAG,
        undefined,
        sessionData,
        MessageType.INIT_PROPOSAL,
      );
    }).toThrow(SatpCommonBodyError);
  });

  it("throws SatpCommonBodyError when version is empty", () => {
    const sessionData = makeSessionData();
    const common = makeCommon({ version: "" });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(SatpCommonBodyError);
  });

  it("throws SatpCommonBodyError when sessionId is empty", () => {
    const sessionData = makeSessionData();
    const common = makeCommon({ sessionId: "" });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(SatpCommonBodyError);
  });

  it("throws SATPVersionError when version does not match SATP_VERSION", () => {
    const sessionData = makeSessionData();
    const common = makeCommon({ version: "v02" });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(SATPVersionError);
  });

  it("throws TransferContextIdError when transferContextId does not match session", () => {
    const sessionData = makeSessionData();
    const common = makeCommon({ transferContextId: "wrong-ctx" });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(TransferContextIdError);
  });

  it("throws MessageTypeError when messageType does not match expected stage", () => {
    const sessionData = makeSessionData();
    const common = makeCommon({ messageType: MessageType.LOCK_ASSERT });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(MessageTypeError);
  });

  it("accepts secondary message type (Stage 1 dual-type validation)", () => {
    const sessionData = makeSessionData();
    const common = makeCommon({
      messageType: MessageType.TRANSFER_COMMENCE_REQUEST,
    });

    // When messageStage2 is provided, either type should be accepted
    expect(() => {
      commonBodyVerifier(
        TAG,
        common,
        sessionData,
        MessageType.INIT_PROPOSAL,
        MessageType.TRANSFER_COMMENCE_REQUEST,
      );
    }).not.toThrow();
  });

  it("passes for all standard v13 message types when expected matches", () => {
    const sessionData = makeSessionData();
    const standardTypes = [
      MessageType.INIT_PROPOSAL,
      MessageType.INIT_RECEIPT,
      MessageType.INIT_REJECT,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
      MessageType.LOCK_ASSERT,
      MessageType.ASSERTION_RECEIPT,
      MessageType.COMMIT_PREPARE,
      MessageType.COMMIT_READY,
      MessageType.COMMIT_FINAL,
      MessageType.ACK_COMMIT_FINAL,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      MessageType.ERROR,
      MessageType.SESSION_ABORT,
    ];

    for (const mt of standardTypes) {
      const common = makeCommon({ messageType: mt });
      expect(() => {
        commonBodyVerifier(TAG, common, sessionData, mt);
      }).not.toThrow();
    }
  });

  it("v13: does NOT check sequenceNumber, resourceUrl, or pubkeys in CommonSatp", () => {
    // In v13, CommonSatp has only 4 fields.
    // We verify that a valid 4-field CommonSatp passes even though
    // no sequenceNumber, resourceUrl, or pubkey fields exist.
    const sessionData = makeSessionData();
    const common = create(CommonSatpSchema, {
      version: SATP_VERSION,
      messageType: MessageType.COMMIT_PREPARE,
      sessionId: "session-001",
      transferContextId: "ctx-001",
    });

    // This should pass — no v02-era field checks
    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.COMMIT_PREPARE);
    }).not.toThrow();
  });

  it("v13: transferContextId is REQUIRED — empty string throws MissingTransferContextIdError", () => {
    const sessionData = makeSessionData();
    // Empty transferContextId in CommonSatp: REQUIRED check fires before mismatch
    const common = makeCommon({ transferContextId: "" });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(MissingTransferContextIdError);
  });

  it("v13: transferContextId REQUIRED check also fires when session has empty value", () => {
    const sessionData = makeSessionData({ transferContextId: "" });
    const common = makeCommon({ transferContextId: "" });

    expect(() => {
      commonBodyVerifier(TAG, common, sessionData, MessageType.INIT_PROPOSAL);
    }).toThrow(MissingTransferContextIdError);
  });
});
