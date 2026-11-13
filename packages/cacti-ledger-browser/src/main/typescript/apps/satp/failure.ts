/**
 * Failure classification for SATP sessions: which stage/step failed, what
 * kind of error it was, and whether retrying can help.
 *
 * Inputs are what the gateway already exposes:
 * - `phaseError` of the session snapshot: the SATP `MessageType` of the
 *   message whose processing failed (`cacti.satp.v13.common.MessageType`,
 *   serialized as its enum name or number),
 * - an IANA SATP error code (`err_<stage>.<sub>.<seq>`, draft-ietf-satp-core
 *   Section 11.4) when one appears in the snapshot error fields or the audit
 *   log types,
 * - the `/status` substatus (`StatusResponse.substatus`).
 *
 * SATP itself does not define "retryable"; the outlook below is a stated
 * heuristic shown to operators as such, never an automatic decision.
 */
import {
  deriveStage,
  isRollbackType,
  type SatpSessionSnapshot,
  type SatpTimelineEvent,
} from "./transform";

/** `MessageType` enum names by number (see `common/message.proto`). */
const MESSAGE_TYPE_NAMES: Record<number, string> = {
  1: "PRE_INIT_PROPOSAL",
  2: "PRE_INIT_RECEIPT",
  3: "PRE_INIT_REJECT",
  4: "PRE_TRANSFER_COMMENCE_REQUEST",
  5: "PRE_TRANSFER_COMMENCE_RESPONSE",
  6: "INIT_PROPOSAL",
  7: "INIT_RECEIPT",
  8: "INIT_REJECT",
  9: "TRANSFER_COMMENCE_REQUEST",
  10: "TRANSFER_COMMENCE_RESPONSE",
  11: "LOCK_ASSERT",
  12: "ASSERTION_RECEIPT",
  13: "COMMIT_PREPARE",
  14: "COMMIT_READY",
  15: "COMMIT_FINAL",
  16: "ACK_COMMIT_FINAL",
  17: "COMMIT_TRANSFER_COMPLETE",
  18: "NEW_SESSION_REQUEST",
  19: "NEW_SESSION_RESPONSE",
  20: "PRE_SATP_TRANSFER_REQUEST",
  21: "PRE_SATP_TRANSFER_RESPONSE",
  22: "COMMIT_TRANSFER_COMPLETE_RESPONSE",
  23: "ERROR",
  24: "SESSION_ABORT",
};

/** SATP stage of each message type (0 setup, 1 proposal, 2 lock, 3 commit). */
const MESSAGE_TYPE_STAGE: Record<string, number> = {
  PRE_INIT_PROPOSAL: 0,
  PRE_INIT_RECEIPT: 0,
  PRE_INIT_REJECT: 0,
  PRE_TRANSFER_COMMENCE_REQUEST: 0,
  PRE_TRANSFER_COMMENCE_RESPONSE: 0,
  NEW_SESSION_REQUEST: 0,
  NEW_SESSION_RESPONSE: 0,
  PRE_SATP_TRANSFER_REQUEST: 0,
  PRE_SATP_TRANSFER_RESPONSE: 0,
  INIT_PROPOSAL: 1,
  INIT_RECEIPT: 1,
  INIT_REJECT: 1,
  TRANSFER_COMMENCE_REQUEST: 1,
  TRANSFER_COMMENCE_RESPONSE: 1,
  LOCK_ASSERT: 2,
  ASSERTION_RECEIPT: 2,
  COMMIT_PREPARE: 3,
  COMMIT_READY: 3,
  COMMIT_FINAL: 3,
  ACK_COMMIT_FINAL: 3,
  COMMIT_TRANSFER_COMPLETE: 3,
  COMMIT_TRANSFER_COMPLETE_RESPONSE: 3,
};

/**
 * Descriptions of the SATP error codes registry (draft-ietf-satp-core-16
 * Section 11.4), mirrored from the plugin's
 * `core/errors/iana-error-codes.ts` (`V13_ERROR_DESCRIPTIONS`).
 */
export const SATP_ERROR_DESCRIPTIONS: Record<string, string> = {
  "err_0.1.1": "invalid message type",
  "err_0.1.2": "insufficient permissions",
  "err_0.1.3": "bad signature",
  "err_1.1.1": "invalid transferContextId",
  "err_1.1.2": "invalid sessionId",
  "err_1.1.3": "incorrect transferInitClaimFormat",
  "err_1.1.11": "invalid digitalAssetId",
  "err_1.1.12": "invalid assetProfileId",
  "err_1.1.13": "invalid verifiedOriginatorEntityId",
  "err_1.1.14": "invalid verifiedBeneficiaryEntityId",
  "err_1.1.15": "invalid originatorPublicKey",
  "err_1.1.16": "invalid beneficiaryPublicKey",
  "err_1.1.17": "invalid senderGatewaySignaturePublicKey",
  "err_1.1.18": "invalid receiverGatewaySignaturePublicKey",
  "err_1.1.19": "invalid senderGatewayId",
  "err_1.1.20": "invalid recipientGatewayId",
  "err_1.1.31": "unsupported gatewayDefaultSignatureAlgorithm",
  "err_1.1.32": "unsupported networkLockType",
  "err_1.1.33": "unsupported networkLockExpirationTime",
  "err_1.1.34": "unsupported gatewayTlsScheme",
  "err_1.1.35": "unsupported gatewayLoggingProfile",
  "err_1.1.36": "unsupported gatewayAccessControlProfile",
  "err_1.2.1": "mismatch transferContextId",
  "err_1.2.2": "mismatch sessionId",
  "err_1.2.3": "mismatch hashTransferInitClaim",
  "err_1.3.1": "mismatch transferContextId",
  "err_1.3.2": "mismatch sessionId",
  "err_1.3.3": "mismatch hashTransferInitClaim",
  "err_1.3.4": "mismatch hashPrevMessage",
  "err_1.4.1": "mismatch transferContextId",
  "err_1.4.2": "mismatch sessionId",
  "err_1.4.3": "mismatch hashPrevMessage",
  "err_2.2.1": "mismatch transferContextId",
  "err_2.2.2": "mismatch sessionId",
  "err_2.2.3": "unsupported lockAssertionClaimFormat",
  "err_2.2.4": "unsupported lockAssertionExpiration",
  "err_2.2.5": "mismatch hashPrevMessage",
  "err_2.2.7": "asset not found",
  "err_2.2.8": "asset already locked",
  "err_2.2.9": "asset lock expired",
  "err_2.4.1": "mismatch transferContextId",
  "err_2.4.2": "mismatch sessionId",
  "err_2.4.3": "mismatch hashPrevMessage",
  "err_3.1.1": "mismatch transferContextId",
  "err_3.1.2": "mismatch sessionId",
  "err_3.1.3": "mismatch hashPrevMessage",
  "err_3.3.1": "mismatch transferContextId",
  "err_3.3.2": "mismatch sessionId",
  "err_3.3.3": "mismatch hashPrevMessage",
  "err_3.3.4": "unsupported mintAssertionFormat",
  "err_3.5.1": "mismatch transferContextId",
  "err_3.5.2": "mismatch sessionId",
  "err_3.5.3": "mismatch hashPrevMessage",
  "err_3.5.4": "unsupported burnAssertionClaimFormat",
  "err_3.7.1": "mismatch transferContextId",
  "err_3.7.2": "mismatch sessionId",
  "err_3.7.3": "mismatch hashPrevMessage",
  "err_3.7.4": "unsupported assignmentAssertionClaimFormat",
  "err_3.9.1": "mismatch transferContextId",
  "err_3.9.2": "mismatch sessionId",
  "err_3.9.3": "mismatch hashPrevMessage",
  "err_3.9.4": "mismatch hashTransferCommence",
};

/**
 * - `retryable`: a transient condition; the same transfer can be retried.
 * - `not-retryable`: retrying unchanged fails again (config, peer or data fix needed).
 * - `in-progress`: the gateway is already recovering or refunding.
 * - `resolved`: recovered or refunded; nothing left to retry.
 * - `unknown`: not enough information.
 */
export type SatpRetryOutlook =
  | "retryable"
  | "not-retryable"
  | "in-progress"
  | "resolved"
  | "unknown";

export interface SatpFailureClassification {
  /** SATP stage the failure happened in, when known. */
  failedStage?: number;
  /** Message type whose processing failed (from `phaseError`). */
  failedStep?: string;
  /** IANA SATP error code, e.g. `err_2.2.8`. */
  errorCode?: string;
  /** Registry description of `errorCode`. */
  errorDescription?: string;
  /** Short human-readable error class. */
  errorClass: string;
  retry: SatpRetryOutlook;
  /** One sentence telling the operator what the outlook means here. */
  retryHint: string;
}

const ERROR_CODE_PATTERN = /err_(\d+)\.(\d+)(?:\.(\d+))?/;

/** Message type name of a `phaseError` value (enum name or number). */
export function phaseErrorStep(phaseError: unknown): string | undefined {
  if (typeof phaseError === "number" && phaseError > 0) {
    return MESSAGE_TYPE_NAMES[phaseError] ?? `MESSAGE_TYPE_${phaseError}`;
  }
  if (typeof phaseError === "string" && phaseError !== "") {
    const name = phaseError.replace(/^MESSAGE_TYPE_/, "");
    return name === "UNSPECIFIED" ? undefined : name;
  }
  return undefined;
}

/** First IANA SATP error code found in the given values, if any. */
export function findSatpErrorCode(values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const match = text?.match(ERROR_CODE_PATTERN);
    if (match) {
      return match[0];
    }
  }
  return undefined;
}

function classByDescription(description: string): {
  errorClass: string;
  retry: SatpRetryOutlook;
  retryHint: string;
} {
  if (description === "asset already locked") {
    return {
      errorClass: "Asset state conflict",
      retry: "retryable",
      retryHint:
        "The asset is locked by another transfer. Retry once that lock is released.",
    };
  }
  if (description === "asset lock expired") {
    return {
      errorClass: "Lock expired",
      retry: "not-retryable",
      retryHint:
        "The lock timed out. Start a new transfer; this session cannot resume.",
    };
  }
  if (description === "asset not found") {
    return {
      errorClass: "Asset not found",
      retry: "not-retryable",
      retryHint: "Check the asset ID and contract on the source ledger.",
    };
  }
  if (description === "bad signature") {
    return {
      errorClass: "Signature verification failed",
      retry: "not-retryable",
      retryHint:
        "Check the gateway key pairs and that both gateways know each other's public key.",
    };
  }
  if (description === "insufficient permissions") {
    return {
      errorClass: "Authorization error",
      retry: "not-retryable",
      retryHint:
        "Grant the gateway the required permissions, then start again.",
    };
  }
  if (description.startsWith("mismatch")) {
    return {
      errorClass: "Message integrity mismatch",
      retry: "not-retryable",
      retryHint:
        "The peer's message did not match the session state (hash chain or IDs). Investigate both gateways' logs.",
    };
  }
  if (description.startsWith("unsupported")) {
    return {
      errorClass: "Unsupported capability",
      retry: "not-retryable",
      retryHint:
        "The gateways disagree on a protocol capability. Align their configuration.",
    };
  }
  return {
    errorClass: "Malformed message or claim",
    retry: "not-retryable",
    retryHint: "Fix the request or claim fields named in the error.",
  };
}

const SUBSTATUS_OUTLOOK: Record<
  string,
  { retry: SatpRetryOutlook; errorClass: string; retryHint: string }
> = {
  CHAIN_NOT_AVAILABLE: {
    retry: "retryable",
    errorClass: "Ledger unavailable",
    retryHint: "A ledger was unreachable. Retry once it is back.",
  },
  BRIDGE_NOT_AVAILABLE: {
    retry: "retryable",
    errorClass: "Bridge unavailable",
    retryHint: "The bridge was unreachable. Retry once it is back.",
  },
  WAIT_SOURCE_CONFIRMATIONS: {
    retry: "in-progress",
    errorClass: "Waiting for confirmations",
    retryHint: "The source ledger has not confirmed yet.",
  },
  WAIT_DESTINATION_TRANSACTION: {
    retry: "in-progress",
    errorClass: "Waiting for destination",
    retryHint: "The destination transaction has not landed yet.",
  },
  RECOVERING: {
    retry: "in-progress",
    errorClass: "Crash recovery",
    retryHint: "The gateway is recovering the session. Wait for it to finish.",
  },
  REFUND_IN_PROGRESS: {
    retry: "in-progress",
    errorClass: "Refund in progress",
    retryHint: "The gateway is refunding the asset.",
  },
  RECOVERED: {
    retry: "resolved",
    errorClass: "Recovered",
    retryHint: "The gateway recovered the session after a crash.",
  },
  REFUNDED: {
    retry: "resolved",
    errorClass: "Refunded",
    retryHint: "The asset was refunded; start a new transfer if needed.",
  },
  RECOVERY_FAILED: {
    retry: "not-retryable",
    errorClass: "Recovery failed",
    retryHint: "Automatic recovery failed. Operator action is needed.",
  },
  NOT_PROCESSABLE_REFUND_NEEDED: {
    retry: "not-retryable",
    errorClass: "Refund needed",
    retryHint: "The transfer cannot proceed and needs a manual refund.",
  },
  PARTIAL: {
    retry: "not-retryable",
    errorClass: "Partial transfer",
    retryHint: "Only part of the transfer completed. Reconcile both ledgers.",
  },
  REJECTED: {
    retry: "not-retryable",
    errorClass: "Rejected by counterparty",
    retryHint: "The counterparty rejected the transfer.",
  },
};

/**
 * Stage of the last regular (non-rollback) audit event before the first
 * rollback/error event: where the protocol was when it broke.
 */
function stageBeforeFailure(events: SatpTimelineEvent[]): number | undefined {
  let stage: number | undefined;
  for (const event of events) {
    const type = event.type.toUpperCase();
    if (
      isRollbackType(event.type) ||
      type.includes("ERROR") ||
      type.includes("REJECT")
    ) {
      break;
    }
    stage = deriveStage(event.type) ?? stage;
  }
  return stage;
}

/** Classifies a failed (or stuck) session. */
export function classifySatpFailure(params: {
  snapshot?: SatpSessionSnapshot;
  substatus?: string;
  events?: SatpTimelineEvent[];
}): SatpFailureClassification {
  const { snapshot, substatus, events = [] } = params;

  // The latest snapshot wins; error details logged on an earlier step (a
  // rollback snapshot may not repeat them) are found newest first.
  const snapshotsNewestFirst = [
    snapshot,
    ...[...events].reverse().map((event) => event.snapshot),
  ].filter((value): value is SatpSessionSnapshot => value !== undefined);
  const failedStep = snapshotsNewestFirst
    .map((candidate) => phaseErrorStep(candidate.phaseError))
    .find((step) => step !== undefined);
  const errorCode = findSatpErrorCode([
    ...snapshotsNewestFirst.flatMap((candidate) => [
      candidate.errorCode,
      candidate.phaseError,
    ]),
    ...events.map((event) => event.type),
  ]);
  const codeStage = errorCode
    ? Number(errorCode.match(ERROR_CODE_PATTERN)?.[1])
    : undefined;
  const failedStage =
    (codeStage !== undefined && codeStage > 0 ? codeStage : undefined) ??
    (failedStep ? MESSAGE_TYPE_STAGE[failedStep] : undefined) ??
    stageBeforeFailure(events);

  const errorDescription = errorCode
    ? SATP_ERROR_DESCRIPTIONS[errorCode]
    : undefined;

  const bySubstatus = substatus ? SUBSTATUS_OUTLOOK[substatus] : undefined;

  if (errorDescription) {
    const byCode = classByDescription(errorDescription);
    // A gateway already recovering/refunding (or done with it) outranks
    // the original error's outlook.
    const outlook =
      bySubstatus &&
      (bySubstatus.retry === "in-progress" || bySubstatus.retry === "resolved")
        ? bySubstatus
        : byCode;
    return {
      failedStage,
      failedStep,
      errorCode,
      errorDescription,
      errorClass: byCode.errorClass,
      retry: outlook.retry,
      retryHint: outlook.retryHint,
    };
  }

  if (bySubstatus) {
    return {
      failedStage,
      failedStep,
      errorCode,
      errorClass: bySubstatus.errorClass,
      retry: bySubstatus.retry,
      retryHint: bySubstatus.retryHint,
    };
  }

  return {
    failedStage,
    failedStep,
    errorCode,
    errorClass: failedStep
      ? `Failed while processing ${failedStep}`
      : "Unclassified error",
    retry: "unknown",
    retryHint:
      "The gateway did not report an error code. Check the gateway logs and the audit timeline below.",
  };
}

export const RETRY_OUTLOOK_LABELS: Record<SatpRetryOutlook, string> = {
  retryable: "Retryable",
  "not-retryable": "Not retryable",
  "in-progress": "In progress",
  resolved: "Resolved",
  unknown: "Unknown",
};
