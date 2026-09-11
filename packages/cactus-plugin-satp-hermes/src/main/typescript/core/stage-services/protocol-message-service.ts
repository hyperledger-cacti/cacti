/**
 * @fileoverview
 * Cross-stage protocol message utilities for v13 message types:
 * - Reject Message (Section 8.5)
 * - Error Message (Section 10.6)
 * - Session Abort Message (Section 10.7)
 *
 * These messages can be sent at any point during the SATP session and are
 * not bound to a single protocol stage.
 *
 * @see https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt
 * @module core/stage-services/protocol-message-service
 */

import { create } from "@bufbuild/protobuf";
import {
  CommonSatp,
  CommonSatpSchema,
  ErrorMessage,
  ErrorMessageSchema,
  MessageType,
  RejectMessage,
  RejectMessageSchema,
  SessionAbortMessage,
  SessionAbortMessageSchema,
} from "../../generated/proto/cacti/satp/v13/common/message_pb";
import {
  SessionData,
  State,
} from "../../generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_CORE_VERSION } from "../constants";
import { getMessageHash } from "../session-utils";

/**
 * Options for creating a reject message.
 */
export interface IRejectMessageOptions {
  /** The session data of the gateway sending the rejection */
  sessionData: SessionData;
  /** IANA error reason code (e.g. "err_2.1") per v13 Section 14 */
  reasonCode: string;
  /** The message type of the last received message (for hashPrevMessage lookup) */
  lastReceivedMessageType: MessageType;
}

/**
 * Options for creating an error message.
 */
export interface IErrorMessageOptions {
  /** The session data of the gateway sending the error */
  sessionData: SessionData;
  /** The previous msg-type string that was erroneous */
  errorMsgType: string;
  /** Error code from v13 Section 14 IANA registry */
  errorType: string;
  /** Severity level: "low" | "medium" | "high" | "fatal" */
  errorSeverity: string;
}

/**
 * Options for creating a session abort message.
 */
export interface ISessionAbortOptions {
  /** The session data of the gateway initiating the abort */
  sessionData: SessionData;
}

/**
 * Result of an abort effectiveness check per v13 Section 11.4.
 */
export interface IAbortEffectivenessResult {
  /** Whether the abort request is effective */
  effective: boolean;
  /** The current stage at which abort was requested */
  stage: number;
  /** Human-readable reason */
  reason: string;
}

/**
 * Create a v13 Reject Message (Section 8.5).
 *
 * A generic rejection that can be sent at any stage. Causes immediate
 * session termination. Replaces the v02 Transfer Proposal Reject and
 * Conditional Reject logic with a single message type.
 */
export function createRejectMessage(
  options: IRejectMessageOptions,
): RejectMessage {
  const { sessionData, reasonCode, lastReceivedMessageType } = options;

  const common = create(CommonSatpSchema, {
    version: SATP_CORE_VERSION,
    messageType: MessageType.INIT_REJECT,
    sessionId: sessionData.id,
    transferContextId: sessionData.transferContextId,
  });

  let hashPrevMessage = "";
  try {
    hashPrevMessage = getMessageHash(sessionData, lastReceivedMessageType);
  } catch {
    // No prior message hash available (e.g. reject sent before any messages processed)
  }

  return create(RejectMessageSchema, {
    common,
    hashPrevMessage,
    reasonCode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create a v13 Error Message (Section 10.6).
 *
 * Reports protocol-level errors with IANA error classification.
 * Can be sent at any point during the session.
 */
export function createErrorMessage(
  options: IErrorMessageOptions,
): ErrorMessage {
  const { sessionData, errorMsgType, errorType, errorSeverity } = options;

  const common = create(CommonSatpSchema, {
    version: SATP_CORE_VERSION,
    messageType: MessageType.ERROR,
    sessionId: sessionData.id,
    transferContextId: sessionData.transferContextId,
  });

  return create(ErrorMessageSchema, {
    common,
    errorMsgType,
    errorType,
    errorSeverity,
  });
}

/**
 * Create a v13 Session Abort Message (Section 10.7).
 *
 * Requests session termination. Effectiveness depends on the current
 * protocol stage per v13 Section 11.4.
 */
export function createSessionAbortMessage(
  options: ISessionAbortOptions,
): SessionAbortMessage {
  const { sessionData } = options;

  const common = create(CommonSatpSchema, {
    version: SATP_CORE_VERSION,
    messageType: MessageType.SESSION_ABORT,
    sessionId: sessionData.id,
    transferContextId: sessionData.transferContextId,
  });

  return create(SessionAbortMessageSchema, {
    common,
  });
}

/**
 * Check whether a session abort is effective at the current protocol stage.
 *
 * Per v13 Section 11.4:
 * - Aborts **before** commit-final (Stages 0–2 and Stage 3 pre-commit-final)
 *   are **reversible** and the abort is effective.
 * - Aborts **after** commit-final (Stage 3 post-commit-final) are **NOT effective**
 *   because the burning/destruction has already begun and cannot be undone.
 *
 * @param lastCompletedMessageType - The MessageType of the last successfully
 *   processed message in the session
 * @returns Effectiveness assessment
 */
export function checkAbortEffectiveness(
  lastCompletedMessageType: MessageType,
): IAbortEffectivenessResult {
  const pastCommitFinal = [
    MessageType.COMMIT_FINAL,
    MessageType.ACK_COMMIT_FINAL,
    MessageType.COMMIT_TRANSFER_COMPLETE,
    MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
  ];

  if (pastCommitFinal.includes(lastCompletedMessageType)) {
    return {
      effective: false,
      stage: 3,
      reason:
        "Abort after commit-final is NOT effective — " +
        "asset burn/destruction has begun and cannot be reversed " +
        "(v13 Section 11.4)",
    };
  }

  // Determine approximate stage from message type
  let stage = 0;
  if (
    [
      MessageType.INIT_PROPOSAL,
      MessageType.INIT_RECEIPT,
      MessageType.INIT_REJECT,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
    ].includes(lastCompletedMessageType)
  ) {
    stage = 1;
  } else if (
    [MessageType.LOCK_ASSERT, MessageType.ASSERTION_RECEIPT].includes(
      lastCompletedMessageType,
    )
  ) {
    stage = 2;
  } else if (
    [MessageType.COMMIT_PREPARE, MessageType.COMMIT_READY].includes(
      lastCompletedMessageType,
    )
  ) {
    stage = 3;
  }

  return {
    effective: true,
    stage,
    reason:
      "Abort before commit-final is effective — " +
      "session can be safely terminated and assets released",
  };
}

// ── Inbound protocol message handling ────────────────────────────────────

/** Result of processing an inbound reject/error/abort message. */
export interface IIncomingProtocolMessageResult {
  /** Whether the session must terminate (no further stage messages accepted). */
  terminate: boolean;
  /** Whether the message was accepted and applied to the session state. */
  accepted: boolean;
  /** Human-readable outcome. */
  reason: string;
}

/**
 * Reverse mapping from received-timestamp field names to the MessageType
 * whose receipt they record (mirror of `saveTimestamp()` in session-utils).
 */
const RECEIVED_TIMESTAMP_FIELD_TO_MESSAGE_TYPE: Record<string, MessageType> = {
  newSessionRequestMessageTimestamp: MessageType.NEW_SESSION_REQUEST,
  newSessionResponseMessageTimestamp: MessageType.NEW_SESSION_RESPONSE,
  preSatpTransferRequestMessageTimestamp: MessageType.PRE_SATP_TRANSFER_REQUEST,
  preSatpTransferResponseMessageTimestamp:
    MessageType.PRE_SATP_TRANSFER_RESPONSE,
  transferProposalRequestMessageTimestamp: MessageType.INIT_PROPOSAL,
  transferProposalReceiptMessageTimestamp: MessageType.INIT_RECEIPT,
  transferProposalRejectMessageTimestamp: MessageType.INIT_REJECT,
  transferCommenceRequestMessageTimestamp:
    MessageType.TRANSFER_COMMENCE_REQUEST,
  transferCommenceResponseMessageTimestamp:
    MessageType.TRANSFER_COMMENCE_RESPONSE,
  lockAssertionRequestMessageTimestamp: MessageType.LOCK_ASSERT,
  lockAssertionReceiptMessageTimestamp: MessageType.ASSERTION_RECEIPT,
  commitPreparationRequestMessageTimestamp: MessageType.COMMIT_PREPARE,
  commitReadyResponseMessageTimestamp: MessageType.COMMIT_READY,
  commitFinalAssertionRequestMessageTimestamp: MessageType.COMMIT_FINAL,
  commitFinalAcknowledgementReceiptResponseMessageTimestamp:
    MessageType.ACK_COMMIT_FINAL,
  transferCompleteMessageTimestamp: MessageType.COMMIT_TRANSFER_COMPLETE,
  transferCompleteResponseMessageTimestamp:
    MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
};

/**
 * Determine the MessageType of the last message received in the session,
 * based on the received timestamps (latest non-empty wins).
 *
 * @param sessionData - The session data to inspect
 * @returns The last received message type, or `undefined` when none
 */
export function getLastReceivedMessageType(
  sessionData: SessionData,
): MessageType | undefined {
  const stages = [
    sessionData.receivedTimestamps?.stage0,
    sessionData.receivedTimestamps?.stage1,
    sessionData.receivedTimestamps?.stage2,
    sessionData.receivedTimestamps?.stage3,
  ];

  let latest: { type: MessageType; time: number } | undefined;
  for (const stage of stages) {
    if (stage == undefined) {
      continue;
    }
    for (const [field, messageType] of Object.entries(
      RECEIVED_TIMESTAMP_FIELD_TO_MESSAGE_TYPE,
    )) {
      const value = (stage as Record<string, unknown>)[field];
      if (typeof value === "string" && value !== "") {
        const time = Number(value);
        if (!latest || time > latest.time) {
          latest = { type: messageType, time };
        }
      }
    }
  }
  return latest?.type;
}

/**
 * Validate the common envelope of an inbound protocol message.
 *
 * @returns An error reason when invalid, `undefined` when valid.
 */
function validateCommonEnvelope(
  sessionData: SessionData,
  common: CommonSatp | undefined,
): string | undefined {
  if (common == undefined) {
    return "message has no common envelope";
  }
  if (common.sessionId !== sessionData.id) {
    return `sessionId mismatch: message '${common.sessionId}' vs session '${sessionData.id}'`;
  }
  if (common.transferContextId !== sessionData.transferContextId) {
    return `transferContextId mismatch: message '${common.transferContextId}' vs session '${sessionData.transferContextId}'`;
  }
  if (common.version !== SATP_CORE_VERSION) {
    return `unsupported protocol version '${common.version}'`;
  }
  return undefined;
}

/**
 * Handle an inbound v13 Reject Message (Section 8.5).
 *
 * A reject always terminates the session: the session state is moved to
 * REJECTED and the IANA reason code is recorded.
 */
export function handleIncomingRejectMessage(
  sessionData: SessionData,
  message: RejectMessage,
): IIncomingProtocolMessageResult {
  const invalid = validateCommonEnvelope(sessionData, message.common);
  if (invalid) {
    return { terminate: false, accepted: false, reason: invalid };
  }

  sessionData.state = State.REJECTED;
  sessionData.phaseError = message.common!.messageType;

  return {
    terminate: true,
    accepted: true,
    reason: `session rejected by counterparty (reason: ${message.reasonCode || "unspecified"})`,
  };
}

/**
 * Handle an inbound v13 Error Message (Section 10.6).
 *
 * A `fatal` severity terminates the session (state REJECTED); lesser
 * severities mark the session as errored but keep it alive for recovery.
 */
export function handleIncomingErrorMessage(
  sessionData: SessionData,
  message: ErrorMessage,
): IIncomingProtocolMessageResult {
  const invalid = validateCommonEnvelope(sessionData, message.common);
  if (invalid) {
    return { terminate: false, accepted: false, reason: invalid };
  }

  const fatal = message.errorSeverity === "fatal";
  sessionData.state = fatal ? State.REJECTED : State.ERROR;
  sessionData.phaseError = message.common!.messageType;

  return {
    terminate: fatal,
    accepted: true,
    reason: `error reported by counterparty (type: ${message.errorType || "unspecified"}, severity: ${message.errorSeverity || "unspecified"})`,
  };
}

/**
 * Handle an inbound v13 Session Abort Message (Section 10.7).
 *
 * Effectiveness depends on the current protocol stage per Section 11.4:
 * effective (session terminated) before commit-final, not effective after.
 */
export function handleIncomingSessionAbortMessage(
  sessionData: SessionData,
  message: SessionAbortMessage,
): IIncomingProtocolMessageResult {
  const invalid = validateCommonEnvelope(sessionData, message.common);
  if (invalid) {
    return { terminate: false, accepted: false, reason: invalid };
  }

  const lastReceived = getLastReceivedMessageType(sessionData);
  const effectiveness = checkAbortEffectiveness(
    lastReceived ?? MessageType.UNSPECIFIED,
  );

  if (!effectiveness.effective) {
    return {
      terminate: false,
      accepted: false,
      reason: effectiveness.reason,
    };
  }

  sessionData.state = State.REJECTED;
  sessionData.phaseError = message.common!.messageType;

  return {
    terminate: true,
    accepted: true,
    reason: effectiveness.reason,
  };
}

/**
 * Dispatch an inbound cross-stage protocol message (reject-msg,
 * error-msg, session-abort-msg) to its handler in this service.
 *
 * Returns `undefined` for message types that are not cross-stage
 * protocol messages (they are handled by the stage handlers instead).
 */
export function handleIncomingProtocolRejectMessage(
  sessionData: SessionData,
  message: RejectMessage | ErrorMessage | SessionAbortMessage,
): IIncomingProtocolMessageResult | undefined {
  switch (message.common?.messageType) {
    case MessageType.INIT_REJECT:
      return handleIncomingRejectMessage(sessionData, message as RejectMessage);
    case MessageType.ERROR:
      return handleIncomingErrorMessage(sessionData, message as ErrorMessage);
    case MessageType.SESSION_ABORT:
      return handleIncomingSessionAbortMessage(
        sessionData,
        message as SessionAbortMessage,
      );
    default:
      return undefined;
  }
}
