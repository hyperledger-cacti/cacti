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
  CommonSatpSchema,
  ErrorMessage,
  ErrorMessageSchema,
  MessageType,
  RejectMessage,
  RejectMessageSchema,
  SessionAbortMessage,
  SessionAbortMessageSchema,
} from "../../generated/proto/cacti/satp/v13/common/message_pb";
import { SessionData } from "../../generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_VERSION } from "../constants";
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
    version: SATP_VERSION,
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
    version: SATP_VERSION,
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
    version: SATP_VERSION,
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
  // Messages that indicate we're past the point of no return (commit-final sent/acked)
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
