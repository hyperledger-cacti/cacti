/**
 * IETF SATP Protocol Errors Codes Registry.
 *
 * Transcribes the SATP Error Codes Registry (Table 2) of
 * [draft-ietf-satp-core-16] Section 11.4, organized by protocol stage and
 * error category. Error messages on the wire carry these codes as
 * Problem Details `type` URNs (`urn:ietf:params:satp:core:error:<code>`,
 * Section 11.3), so the code meanings here MUST match the registry — a
 * peer receiving `reasonCode`/`type` interprets it per the registry.
 *
 * Error code format: `err_<stage>.<sub>.<seq>` where:
 * - stage 0 = General errors
 * - stage 1 = Stage 1 (Transfer Initiation)
 * - stage 2 = Stage 2 (Lock-Evidence Verification)
 * - stage 3 = Stage 3 (Commitment Establishment)
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-16.txt} Section 11.4
 */

// ---------------------------------------------------------------------------
// General errors (draft-16 Section 11.4, stage 0)
// ---------------------------------------------------------------------------

/** General — badly formed message: invalid message type */
export const ERR_0_1_1 = "err_0.1.1";
/** General — authorization error: insufficient permissions */
export const ERR_0_1_2 = "err_0.1.2";
/** General — badly formed message: bad signature */
export const ERR_0_1_3 = "err_0.1.3";

// ---------------------------------------------------------------------------
// Stage 1 — Transfer Proposal / Receipt
// ---------------------------------------------------------------------------

/** Transfer Proposal/Receipt — badly formed message: invalid transferContextId */
export const ERR_1_1_1 = "err_1.1.1";
/** Transfer Proposal/Receipt — badly formed message: invalid sessionId */
export const ERR_1_1_2 = "err_1.1.2";
/** Transfer Proposal/Receipt — badly formed message: incorrect transferInitClaimFormat */
export const ERR_1_1_3 = "err_1.1.3";

/** Transfer Proposal/Receipt — badly formed claim: invalid digitalAssetId */
export const ERR_1_1_11 = "err_1.1.11";
/** Transfer Proposal/Receipt — badly formed claim: invalid assetProfileId */
export const ERR_1_1_12 = "err_1.1.12";
/** Transfer Proposal/Receipt — badly formed claim: invalid verifiedOriginatorEntityId */
export const ERR_1_1_13 = "err_1.1.13";
/** Transfer Proposal/Receipt — badly formed claim: invalid verifiedBeneficiaryEntityId */
export const ERR_1_1_14 = "err_1.1.14";
/** Transfer Proposal/Receipt — badly formed claim: invalid originatorPublicKey */
export const ERR_1_1_15 = "err_1.1.15";
/** Transfer Proposal/Receipt — badly formed claim: invalid beneficiaryPublicKey */
export const ERR_1_1_16 = "err_1.1.16";
/** Transfer Proposal/Receipt — badly formed claim: invalid senderGatewaySignaturePublicKey */
export const ERR_1_1_17 = "err_1.1.17";
/** Transfer Proposal/Receipt — badly formed claim: invalid receiverGatewaySignaturePublicKey */
export const ERR_1_1_18 = "err_1.1.18";
/** Transfer Proposal/Receipt — badly formed claim: invalid senderGatewayId */
export const ERR_1_1_19 = "err_1.1.19";
/** Transfer Proposal/Receipt — badly formed claim: invalid recipientGatewayId */
export const ERR_1_1_20 = "err_1.1.20";

/** Transfer Proposal/Receipt — badly formed parameter: unsupported gatewayDefaultSignatureAlgorithm */
export const ERR_1_1_31 = "err_1.1.31";
/** Transfer Proposal/Receipt — badly formed parameter: unsupported networkLockType */
export const ERR_1_1_32 = "err_1.1.32";
/** Transfer Proposal/Receipt — badly formed parameter: unsupported networkLockExpirationTime */
export const ERR_1_1_33 = "err_1.1.33";
/** Transfer Proposal/Receipt — badly formed parameter: unsupported gatewayTlsScheme */
export const ERR_1_1_34 = "err_1.1.34";
/** Transfer Proposal/Receipt — badly formed parameter: unsupported gatewayLoggingProfile */
export const ERR_1_1_35 = "err_1.1.35";
/** Transfer Proposal/Receipt — badly formed parameter: unsupported gatewayAccessControlProfile */
export const ERR_1_1_36 = "err_1.1.36";

/** Transfer Commence — badly formed message: mismatch transferContextId */
export const ERR_1_2_1 = "err_1.2.1";
/** Transfer Commence — badly formed message: mismatch sessionId */
export const ERR_1_2_2 = "err_1.2.2";
/** Transfer Commence — badly formed message: mismatch hashTransferInitClaim */
export const ERR_1_2_3 = "err_1.2.3";

/** Transfer Commence — badly formed message: mismatch transferContextId */
export const ERR_1_3_1 = "err_1.3.1";
/** Transfer Commence — badly formed message: mismatch sessionId */
export const ERR_1_3_2 = "err_1.3.2";
/** Transfer Commence — badly formed message: mismatch hashTransferInitClaim */
export const ERR_1_3_3 = "err_1.3.3";
/** Transfer Commence — badly formed message: mismatch hashPrevMessage */
export const ERR_1_3_4 = "err_1.3.4";

/** ACK Commence — badly formed message: mismatch transferContextId */
export const ERR_1_4_1 = "err_1.4.1";
/** ACK Commence — badly formed message: mismatch sessionId */
export const ERR_1_4_2 = "err_1.4.2";
/** ACK Commence — badly formed message: mismatch hashPrevMessage */
export const ERR_1_4_3 = "err_1.4.3";

// ---------------------------------------------------------------------------
// Stage 2 — Lock-Evidence Verification
// ---------------------------------------------------------------------------

/** Lock Assertion — badly formed message: mismatch transferContextId */
export const ERR_2_2_1 = "err_2.2.1";
/** Lock Assertion — badly formed message: mismatch sessionId */
export const ERR_2_2_2 = "err_2.2.2";
/** Lock Assertion — badly formed message: unsupported lockAssertionClaimFormat */
export const ERR_2_2_3 = "err_2.2.3";
/** Lock Assertion — badly formed message: unsupported lockAssertionExpiration */
export const ERR_2_2_4 = "err_2.2.4";
/** Lock Assertion — badly formed message: mismatch hashPrevMessage */
export const ERR_2_2_5 = "err_2.2.5";

/** Lock Assertion — semantic error: asset not found */
export const ERR_2_2_7 = "err_2.2.7";
/** Lock Assertion — semantic error: asset already locked */
export const ERR_2_2_8 = "err_2.2.8";
/** Lock Assertion — semantic error: asset lock expired */
export const ERR_2_2_9 = "err_2.2.9";

/** Lock Assertion Receipt — badly formed message: mismatch transferContextId */
export const ERR_2_4_1 = "err_2.4.1";
/** Lock Assertion Receipt — badly formed message: mismatch sessionId */
export const ERR_2_4_2 = "err_2.4.2";
/** Lock Assertion Receipt — badly formed message: mismatch hashPrevMessage */
export const ERR_2_4_3 = "err_2.4.3";

// ---------------------------------------------------------------------------
// Stage 3 — Commitment Establishment
// ---------------------------------------------------------------------------

/** Commit Preparation — badly formed message: mismatch transferContextId */
export const ERR_3_1_1 = "err_3.1.1";
/** Commit Preparation — badly formed message: mismatch sessionId */
export const ERR_3_1_2 = "err_3.1.2";
/** Commit Preparation — badly formed message: mismatch hashPrevMessage */
export const ERR_3_1_3 = "err_3.1.3";

/** Commit Ready — badly formed message: mismatch transferContextId */
export const ERR_3_3_1 = "err_3.3.1";
/** Commit Ready — badly formed message: mismatch sessionId */
export const ERR_3_3_2 = "err_3.3.2";
/** Commit Ready — badly formed message: mismatch hashPrevMessage */
export const ERR_3_3_3 = "err_3.3.3";
/** Commit Ready — badly formed message: unsupported mintAssertionFormat */
export const ERR_3_3_4 = "err_3.3.4";

/** Commit Final Assertion — badly formed message: mismatch transferContextId */
export const ERR_3_5_1 = "err_3.5.1";
/** Commit Final Assertion — badly formed message: mismatch sessionId */
export const ERR_3_5_2 = "err_3.5.2";
/** Commit Final Assertion — badly formed message: mismatch hashPrevMessage */
export const ERR_3_5_3 = "err_3.5.3";
/** Commit Final Assertion — badly formed message: unsupported burnAssertionClaimFormat */
export const ERR_3_5_4 = "err_3.5.4";

/** Commit Final Ack Receipt — badly formed message: mismatch transferContextId */
export const ERR_3_7_1 = "err_3.7.1";
/** Commit Final Ack Receipt — badly formed message: mismatch sessionId */
export const ERR_3_7_2 = "err_3.7.2";
/** Commit Final Ack Receipt — badly formed message: mismatch hashPrevMessage */
export const ERR_3_7_3 = "err_3.7.3";
/** Commit Final Ack Receipt — badly formed message: unsupported assignmentAssertionClaimFormat */
export const ERR_3_7_4 = "err_3.7.4";

/** Transfer Complete — badly formed message: mismatch transferContextId */
export const ERR_3_9_1 = "err_3.9.1";
/** Transfer Complete — badly formed message: mismatch sessionId */
export const ERR_3_9_2 = "err_3.9.2";
/** Transfer Complete — badly formed message: mismatch hashPrevMessage */
export const ERR_3_9_3 = "err_3.9.3";
/** Transfer Complete — badly formed message: mismatch hashTransferCommence */
export const ERR_3_9_4 = "err_3.9.4";

// ---------------------------------------------------------------------------
// Aggregate collections
// ---------------------------------------------------------------------------

type GeneralErrorCode = (typeof GENERAL_ERROR_CODES)[number];
type Stage1ErrorCode = (typeof STAGE_1_ERROR_CODES)[number];
type Stage2ErrorCode = (typeof STAGE_2_ERROR_CODES)[number];
type Stage3ErrorCode = (typeof STAGE_3_ERROR_CODES)[number];

export type ErrorCode =
  | GeneralErrorCode
  | Stage1ErrorCode
  | Stage2ErrorCode
  | Stage3ErrorCode;

/** General (stage-0) error codes. */
export const GENERAL_ERROR_CODES = [ERR_0_1_1, ERR_0_1_2, ERR_0_1_3] as const;

/** Stage 1 error codes. */
export const STAGE_1_ERROR_CODES = [
  ERR_1_1_1,
  ERR_1_1_2,
  ERR_1_1_3,
  ERR_1_1_11,
  ERR_1_1_12,
  ERR_1_1_13,
  ERR_1_1_14,
  ERR_1_1_15,
  ERR_1_1_16,
  ERR_1_1_17,
  ERR_1_1_18,
  ERR_1_1_19,
  ERR_1_1_20,
  ERR_1_1_31,
  ERR_1_1_32,
  ERR_1_1_33,
  ERR_1_1_34,
  ERR_1_1_35,
  ERR_1_1_36,
  ERR_1_2_1,
  ERR_1_2_2,
  ERR_1_2_3,
  ERR_1_3_1,
  ERR_1_3_2,
  ERR_1_3_3,
  ERR_1_3_4,
  ERR_1_4_1,
  ERR_1_4_2,
  ERR_1_4_3,
] as const;

/** Stage 2 error codes. */
export const STAGE_2_ERROR_CODES = [
  ERR_2_2_1,
  ERR_2_2_2,
  ERR_2_2_3,
  ERR_2_2_4,
  ERR_2_2_5,
  ERR_2_2_7,
  ERR_2_2_8,
  ERR_2_2_9,
  ERR_2_4_1,
  ERR_2_4_2,
  ERR_2_4_3,
] as const;

/** Stage 3 error codes. */
export const STAGE_3_ERROR_CODES = [
  ERR_3_1_1,
  ERR_3_1_2,
  ERR_3_1_3,
  ERR_3_3_1,
  ERR_3_3_2,
  ERR_3_3_3,
  ERR_3_3_4,
  ERR_3_5_1,
  ERR_3_5_2,
  ERR_3_5_3,
  ERR_3_5_4,
  ERR_3_7_1,
  ERR_3_7_2,
  ERR_3_7_3,
  ERR_3_7_4,
  ERR_3_9_1,
  ERR_3_9_2,
  ERR_3_9_3,
  ERR_3_9_4,
] as const;

// ---------------------------------------------------------------------------
// Description lookup (the registry's Description column; the Problem Details
// `title` SHOULD correspond to it per draft-16 Section 11.3)
// ---------------------------------------------------------------------------

/** Human-readable description for each SATP error code. */
export const V13_ERROR_DESCRIPTIONS: Record<ErrorCode, string> = {
  [ERR_0_1_1]: "invalid message type",
  [ERR_0_1_2]: "insufficient permissions",
  [ERR_0_1_3]: "bad signature",
  [ERR_1_1_1]: "invalid transferContextId",
  [ERR_1_1_2]: "invalid sessionId",
  [ERR_1_1_3]: "incorrect transferInitClaimFormat",
  [ERR_1_1_11]: "invalid digitalAssetId",
  [ERR_1_1_12]: "invalid assetProfileId",
  [ERR_1_1_13]: "invalid verifiedOriginatorEntityId",
  [ERR_1_1_14]: "invalid verifiedBeneficiaryEntityId",
  [ERR_1_1_15]: "invalid originatorPublicKey",
  [ERR_1_1_16]: "invalid beneficiaryPublicKey",
  [ERR_1_1_17]: "invalid senderGatewaySignaturePublicKey",
  [ERR_1_1_18]: "invalid receiverGatewaySignaturePublicKey",
  [ERR_1_1_19]: "invalid senderGatewayId",
  [ERR_1_1_20]: "invalid recipientGatewayId",
  [ERR_1_1_31]: "unsupported gatewayDefaultSignatureAlgorithm",
  [ERR_1_1_32]: "unsupported networkLockType",
  [ERR_1_1_33]: "unsupported networkLockExpirationTime",
  [ERR_1_1_34]: "unsupported gatewayTlsScheme",
  [ERR_1_1_35]: "unsupported gatewayLoggingProfile",
  [ERR_1_1_36]: "unsupported gatewayAccessControlProfile",
  [ERR_1_2_1]: "mismatch transferContextId",
  [ERR_1_2_2]: "mismatch sessionId",
  [ERR_1_2_3]: "mismatch hashTransferInitClaim",
  [ERR_1_3_1]: "mismatch transferContextId",
  [ERR_1_3_2]: "mismatch sessionId",
  [ERR_1_3_3]: "mismatch hashTransferInitClaim",
  [ERR_1_3_4]: "mismatch hashPrevMessage",
  [ERR_1_4_1]: "mismatch transferContextId",
  [ERR_1_4_2]: "mismatch sessionId",
  [ERR_1_4_3]: "mismatch hashPrevMessage",
  [ERR_2_2_1]: "mismatch transferContextId",
  [ERR_2_2_2]: "mismatch sessionId",
  [ERR_2_2_3]: "unsupported lockAssertionClaimFormat",
  [ERR_2_2_4]: "unsupported lockAssertionExpiration",
  [ERR_2_2_5]: "mismatch hashPrevMessage",
  [ERR_2_2_7]: "asset not found",
  [ERR_2_2_8]: "asset already locked",
  [ERR_2_2_9]: "asset lock expired",
  [ERR_2_4_1]: "mismatch transferContextId",
  [ERR_2_4_2]: "mismatch sessionId",
  [ERR_2_4_3]: "mismatch hashPrevMessage",
  [ERR_3_1_1]: "mismatch transferContextId",
  [ERR_3_1_2]: "mismatch sessionId",
  [ERR_3_1_3]: "mismatch hashPrevMessage",
  [ERR_3_3_1]: "mismatch transferContextId",
  [ERR_3_3_2]: "mismatch sessionId",
  [ERR_3_3_3]: "mismatch hashPrevMessage",
  [ERR_3_3_4]: "unsupported mintAssertionFormat",
  [ERR_3_5_1]: "mismatch transferContextId",
  [ERR_3_5_2]: "mismatch sessionId",
  [ERR_3_5_3]: "mismatch hashPrevMessage",
  [ERR_3_5_4]: "unsupported burnAssertionClaimFormat",
  [ERR_3_7_1]: "mismatch transferContextId",
  [ERR_3_7_2]: "mismatch sessionId",
  [ERR_3_7_3]: "mismatch hashPrevMessage",
  [ERR_3_7_4]: "unsupported assignmentAssertionClaimFormat",
  [ERR_3_9_1]: "mismatch transferContextId",
  [ERR_3_9_2]: "mismatch sessionId",
  [ERR_3_9_3]: "mismatch hashPrevMessage",
  [ERR_3_9_4]: "mismatch hashTransferCommence",
};

/**
 * The registry's HTTP Status column (draft-16 Section 11.4). The Problem
 * Details `status` MUST be consistent with it per Section 11.3.
 */
export const V13_ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ERR_0_1_1]: 400,
  [ERR_0_1_2]: 403,
  [ERR_0_1_3]: 422,
  [ERR_1_1_1]: 422,
  [ERR_1_1_2]: 422,
  [ERR_1_1_3]: 422,
  [ERR_1_1_11]: 422,
  [ERR_1_1_12]: 422,
  [ERR_1_1_13]: 422,
  [ERR_1_1_14]: 422,
  [ERR_1_1_15]: 422,
  [ERR_1_1_16]: 422,
  [ERR_1_1_17]: 422,
  [ERR_1_1_18]: 422,
  [ERR_1_1_19]: 422,
  [ERR_1_1_20]: 422,
  [ERR_1_1_31]: 415,
  [ERR_1_1_32]: 415,
  [ERR_1_1_33]: 415,
  [ERR_1_1_34]: 415,
  [ERR_1_1_35]: 415,
  [ERR_1_1_36]: 415,
  [ERR_1_2_1]: 404,
  [ERR_1_2_2]: 404,
  [ERR_1_2_3]: 404,
  [ERR_1_3_1]: 404,
  [ERR_1_3_2]: 404,
  [ERR_1_3_3]: 404,
  [ERR_1_3_4]: 404,
  [ERR_1_4_1]: 404,
  [ERR_1_4_2]: 404,
  [ERR_1_4_3]: 404,
  [ERR_2_2_1]: 404,
  [ERR_2_2_2]: 404,
  [ERR_2_2_3]: 415,
  [ERR_2_2_4]: 415,
  [ERR_2_2_5]: 404,
  [ERR_2_2_7]: 404,
  [ERR_2_2_8]: 409,
  [ERR_2_2_9]: 410,
  [ERR_2_4_1]: 404,
  [ERR_2_4_2]: 404,
  [ERR_2_4_3]: 404,
  [ERR_3_1_1]: 404,
  [ERR_3_1_2]: 404,
  [ERR_3_1_3]: 404,
  [ERR_3_3_1]: 404,
  [ERR_3_3_2]: 404,
  [ERR_3_3_3]: 404,
  [ERR_3_3_4]: 415,
  [ERR_3_5_1]: 404,
  [ERR_3_5_2]: 404,
  [ERR_3_5_3]: 404,
  [ERR_3_5_4]: 415,
  [ERR_3_7_1]: 404,
  [ERR_3_7_2]: 404,
  [ERR_3_7_3]: 404,
  [ERR_3_7_4]: 415,
  [ERR_3_9_1]: 404,
  [ERR_3_9_2]: 404,
  [ERR_3_9_3]: 404,
  [ERR_3_9_4]: 404,
};

// ---------------------------------------------------------------------------
// Mapping from internal SATPErrorType → closest registry code
// ---------------------------------------------------------------------------

import { SATPErrorType } from "./satp-error-type";

/**
 * Maps internal SATPErrorType values to the closest registry error code.
 *
 * The registry only enumerates message-level protocol errors, so internal
 * error types without an exact registry counterpart map to the closest
 * code by the registry's meaning — never to a code whose registry meaning
 * contradicts the usage (a peer interprets the code per the registry):
 *
 * - Signature failures map to the general `err_0.1.3` (bad signature), not
 *   to an identifier code.
 * - Session/context identity problems map to `err_1.1.2` (invalid
 *   sessionId) / `err_1.1.1` (invalid transferContextId) respectively.
 * - Assertion-claim problems map to the matching stage's "unsupported
 *   ...Format" code.
 * - Everything without a registry counterpart falls back to the general
 *   `err_0.1.1` (badly formed message: invalid message type); the Problem
 *   Details `detail` field carries the specifics.
 */
export const SATP_ERROR_TYPE_TO_V13: Partial<Record<SATPErrorType, ErrorCode>> =
  {
    [SATPErrorType.UNSPECIFIED]: ERR_0_1_1,
    [SATPErrorType.BADLY_FORMATED_MESSAGE]: ERR_0_1_1,
    [SATPErrorType.COMMON_BODY_BADLY_FORMATED]: ERR_0_1_1,
    [SATPErrorType.INCORRECT_PARAMETER]: ERR_0_1_1,
    [SATPErrorType.MISSING_PARAMETER]: ERR_0_1_1,
    [SATPErrorType.SATP_VERSION_NOT_SUPPORTED]: ERR_0_1_1,
    [SATPErrorType.MESSAGE_OUT_OF_SEQUENCE]: ERR_0_1_1,
    [SATPErrorType.DLT_NOT_SUPPORTED]: ERR_0_1_1,
    [SATPErrorType.BRIDGE_PROBLEM]: ERR_0_1_1,
    [SATPErrorType.LOCK_ASSERTION_BADLY_FORMATED]: ERR_0_1_1,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_BAD_SIGNATURE]: ERR_0_1_3,
    [SATPErrorType.SIGNATURE_VERIFICATION_FAILED]: ERR_0_1_3,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_CLAIM]: ERR_1_1_11,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_WRONG_TRANSACTION_ID]: ERR_1_1_1,
    [SATPErrorType.SESSION_NOT_FOUND]: ERR_1_1_2,
    [SATPErrorType.SESSION_ID_NOT_FOUND]: ERR_1_1_2,
    [SATPErrorType.SESSION_MISS_MATCH]: ERR_1_1_2,
    [SATPErrorType.CONTEXT_ID_MISS_MATCH]: ERR_1_2_1,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_MISMATCH_HASH_VALUES]: ERR_1_2_3,
    [SATPErrorType.HASH_MISS_MATCH]: ERR_1_2_3,
    [SATPErrorType.LOCK_ASSERTION_CLAIM_FORMAT_MISSING]: ERR_2_2_3,
    [SATPErrorType.LOCK_ASSERTION_EXPIRATION_ERROR]: ERR_2_2_4,
    [SATPErrorType.MINT_ASSERTION_BADLY_FORMATED]: ERR_3_3_4,
    [SATPErrorType.BURN_ASSERTION_BADLY_FORMATED]: ERR_3_5_4,
    [SATPErrorType.ASSIGNMENT_ASSERTION_BADLY_FORMATED]: ERR_3_7_4,
  };

/**
 * The fallback code for internal error types without a closer registry
 * counterpart: the general "badly formed message: invalid message type".
 */
export const DEFAULT_SATP_ERROR_CODE: ErrorCode = ERR_0_1_1;

/**
 * Returns the registry error code for an internal SATPErrorType, falling
 * back to {@link DEFAULT_SATP_ERROR_CODE} for unmapped types.
 */
export function satpErrorTypeToV13Code(errorType: SATPErrorType): ErrorCode {
  return SATP_ERROR_TYPE_TO_V13[errorType] ?? DEFAULT_SATP_ERROR_CODE;
}

/**
 * Returns the human-readable description for an error code (the registry's
 * Description column).
 */
export function v13ErrorDescription(code: ErrorCode): string {
  return V13_ERROR_DESCRIPTIONS[code];
}

const V13_ERROR_CODE_SET = new Set<string>([
  ...GENERAL_ERROR_CODES,
  ...STAGE_1_ERROR_CODES,
  ...STAGE_2_ERROR_CODES,
  ...STAGE_3_ERROR_CODES,
]);

/**
 * Checks if a string is a valid registry error code.
 */
export function isV13ErrorCode(code: string): code is ErrorCode {
  return V13_ERROR_CODE_SET.has(code);
}
