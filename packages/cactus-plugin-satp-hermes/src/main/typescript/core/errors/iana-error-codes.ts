/**
 * IETF SATP v13 IANA Error Codes Registry.
 *
 * Defines all 53 error codes from SATP Core v13 Section 14 (IANA Considerations,
 * Table 1) organized by protocol stage and error category.
 *
 * Error code format: `err_<stage>.<sub>.<seq>` where:
 * - stage 1 = Stage 1 (Transfer Initiation)
 * - stage 2 = Stage 2 (Lock-Evidence Verification)
 * - stage 3 = Stage 3 (Commitment Establishment)
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} Section 14
 */

// ---------------------------------------------------------------------------
// Stage 1 — Transfer Proposal / Receipt
// ---------------------------------------------------------------------------

/** Badly formed message — general */
export const ERR_1_1_1 = "err_1.1.1";
/** Badly formed message — missing mandatory field */
export const ERR_1_1_2 = "err_1.1.2";
/** Badly formed message — unrecognized message type */
export const ERR_1_1_3 = "err_1.1.3";
/** Badly formed message — invalid digital asset identifier */
export const ERR_1_1_4 = "err_1.1.4";
/** Badly formed message — invalid asset profile identifier */
export const ERR_1_1_5 = "err_1.1.5";
/** Badly formed message — invalid verified originator entity */
export const ERR_1_1_6 = "err_1.1.6";
/** Badly formed message — invalid verified beneficiary entity */
export const ERR_1_1_7 = "err_1.1.7";
/** Badly formed message — invalid originator gateway network id */
export const ERR_1_1_8 = "err_1.1.8";
/** Badly formed message — invalid beneficiary gateway network id */
export const ERR_1_1_9 = "err_1.1.9";
/** Badly formed message — invalid sender gateway device identity public key */
export const ERR_1_1_10 = "err_1.1.10";

/** Badly formed claim — invalid client identity info */
export const ERR_1_1_11 = "err_1.1.11";
/** Badly formed claim — invalid server identity info */
export const ERR_1_1_12 = "err_1.1.12";
/** Badly formed claim — invalid sender gateway owner id */
export const ERR_1_1_13 = "err_1.1.13";
/** Badly formed claim — invalid receiver gateway owner id */
export const ERR_1_1_14 = "err_1.1.14";
/** Badly formed claim — invalid sender gateway signature public key */
export const ERR_1_1_15 = "err_1.1.15";
/** Badly formed claim — invalid receiver gateway signature public key */
export const ERR_1_1_16 = "err_1.1.16";
/** Badly formed claim — invalid sender gateway device identity public key */
export const ERR_1_1_17 = "err_1.1.17";
/** Badly formed claim — invalid receiver gateway device identity public key */
export const ERR_1_1_18 = "err_1.1.18";
/** Badly formed claim — invalid hash transfer init claims */
export const ERR_1_1_19 = "err_1.1.19";
/** Badly formed claim — invalid transfer context id */
export const ERR_1_1_20 = "err_1.1.20";

/** Badly formed parameter — invalid network lock type */
export const ERR_1_1_31 = "err_1.1.31";
/** Badly formed parameter — invalid network lock expiration time */
export const ERR_1_1_32 = "err_1.1.32";
/** Badly formed parameter — invalid gateway default signature algorithm */
export const ERR_1_1_33 = "err_1.1.33";
/** Badly formed parameter — invalid supported DLTs */
export const ERR_1_1_34 = "err_1.1.34";
/** Badly formed parameter — invalid gateway capabilities version */
export const ERR_1_1_35 = "err_1.1.35";
/** Badly formed parameter — invalid max retries */
export const ERR_1_1_36 = "err_1.1.36";

/** Mismatch — session id mismatch */
export const ERR_1_2_1 = "err_1.2.1";
/** Mismatch — transfer context id mismatch */
export const ERR_1_2_2 = "err_1.2.2";
/** Mismatch — hash previous message mismatch */
export const ERR_1_2_3 = "err_1.2.3";
/** Mismatch — message type mismatch */
export const ERR_1_2_4 = "err_1.2.4";

/** Transfer Commence — badly formed commence message */
export const ERR_1_3_1 = "err_1.3.1";
/** Transfer Commence — missing hash transfer init claims */
export const ERR_1_3_2 = "err_1.3.2";
/** Transfer Commence — hash transfer init claims mismatch */
export const ERR_1_3_3 = "err_1.3.3";
/** Transfer Commence — missing transfer context id */
export const ERR_1_3_4 = "err_1.3.4";
/** Transfer Commence — invalid hash previous message */
export const ERR_1_3_5 = "err_1.3.5";

/** ACK Commence — badly formed ack commence */
export const ERR_1_4_1 = "err_1.4.1";
/** ACK Commence — missing transfer context id */
export const ERR_1_4_2 = "err_1.4.2";
/** ACK Commence — session id mismatch */
export const ERR_1_4_3 = "err_1.4.3";
/** ACK Commence — invalid hash previous message */
export const ERR_1_4_4 = "err_1.4.4";

// ---------------------------------------------------------------------------
// Stage 2 — Lock-Evidence Verification
// ---------------------------------------------------------------------------

/** Lock Assertion — badly formed lock assertion */
export const ERR_2_2_1 = "err_2.2.1";
/** Lock Assertion — missing lock assertion claim */
export const ERR_2_2_2 = "err_2.2.2";
/** Lock Assertion — invalid lock assertion claim format */
export const ERR_2_2_3 = "err_2.2.3";
/** Lock Assertion — lock assertion expiration error */
export const ERR_2_2_4 = "err_2.2.4";
/** Lock Assertion — missing transfer context id */
export const ERR_2_2_5 = "err_2.2.5";
/** Lock Assertion — invalid hash previous message */
export const ERR_2_2_6 = "err_2.2.6";

/** Lock Assertion Receipt — badly formed receipt */
export const ERR_2_4_1 = "err_2.4.1";
/** Lock Assertion Receipt — missing transfer context id */
export const ERR_2_4_2 = "err_2.4.2";
/** Lock Assertion Receipt — session id mismatch */
export const ERR_2_4_3 = "err_2.4.3";
/** Lock Assertion Receipt — invalid hash previous message */
export const ERR_2_4_4 = "err_2.4.4";

// ---------------------------------------------------------------------------
// Stage 3 — Commitment Establishment
// ---------------------------------------------------------------------------

/** Commit Preparation — badly formed commit prepare */
export const ERR_3_1_1 = "err_3.1.1";
/** Commit Preparation — missing transfer context id */
export const ERR_3_1_2 = "err_3.1.2";
/** Commit Preparation — session id mismatch */
export const ERR_3_1_3 = "err_3.1.3";
/** Commit Preparation — invalid hash previous message */
export const ERR_3_1_4 = "err_3.1.4";

/** Commit Ready — badly formed commit ready */
export const ERR_3_3_1 = "err_3.3.1";
/** Commit Ready — missing transfer context id */
export const ERR_3_3_2 = "err_3.3.2";
/** Commit Ready — missing mint assertion claim */
export const ERR_3_3_3 = "err_3.3.3";
/** Commit Ready — session id mismatch */
export const ERR_3_3_4 = "err_3.3.4";
/** Commit Ready — invalid hash previous message */
export const ERR_3_3_5 = "err_3.3.5";

/** Commit Final Assertion — badly formed commit final */
export const ERR_3_5_1 = "err_3.5.1";
/** Commit Final Assertion — missing burn assertion claim */
export const ERR_3_5_2 = "err_3.5.2";
/** Commit Final Assertion — missing transfer context id */
export const ERR_3_5_3 = "err_3.5.3";
/** Commit Final Assertion — session id mismatch */
export const ERR_3_5_4 = "err_3.5.4";
/** Commit Final Assertion — invalid hash previous message */
export const ERR_3_5_5 = "err_3.5.5";

/** Commit Final Ack Receipt — badly formed ack receipt */
export const ERR_3_7_1 = "err_3.7.1";
/** Commit Final Ack Receipt — missing assignment assertion claim */
export const ERR_3_7_2 = "err_3.7.2";
/** Commit Final Ack Receipt — missing transfer context id */
export const ERR_3_7_3 = "err_3.7.3";
/** Commit Final Ack Receipt — session id mismatch */
export const ERR_3_7_4 = "err_3.7.4";
/** Commit Final Ack Receipt — invalid hash previous message */
export const ERR_3_7_5 = "err_3.7.5";

/** Transfer Complete — badly formed transfer complete */
export const ERR_3_9_1 = "err_3.9.1";
/** Transfer Complete — missing transfer context id */
export const ERR_3_9_2 = "err_3.9.2";
/** Transfer Complete — invalid transfer complete claim */
export const ERR_3_9_3 = "err_3.9.3";
/** Transfer Complete — session id mismatch */
export const ERR_3_9_4 = "err_3.9.4";
/** Transfer Complete — invalid hash previous message */
export const ERR_3_9_5 = "err_3.9.5";

// ---------------------------------------------------------------------------
// Aggregate collections
// ---------------------------------------------------------------------------

type Stage1ErrorCode = (typeof STAGE_1_ERROR_CODES)[number];
type Stage2ErrorCode = (typeof STAGE_2_ERROR_CODES)[number];
type Stage3ErrorCode = (typeof STAGE_3_ERROR_CODES)[number];

export type ErrorCode = Stage1ErrorCode | Stage2ErrorCode | Stage3ErrorCode;

/** Stage 1 error codes. */
export const STAGE_1_ERROR_CODES = [
  ERR_1_1_1,
  ERR_1_1_2,
  ERR_1_1_3,
  ERR_1_1_4,
  ERR_1_1_5,
  ERR_1_1_6,
  ERR_1_1_7,
  ERR_1_1_8,
  ERR_1_1_9,
  ERR_1_1_10,
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
  ERR_1_2_4,
  ERR_1_3_1,
  ERR_1_3_2,
  ERR_1_3_3,
  ERR_1_3_4,
  ERR_1_3_5,
  ERR_1_4_1,
  ERR_1_4_2,
  ERR_1_4_3,
  ERR_1_4_4,
] as const;

/** Stage 2 error codes. */
export const STAGE_2_ERROR_CODES = [
  ERR_2_2_1,
  ERR_2_2_2,
  ERR_2_2_3,
  ERR_2_2_4,
  ERR_2_2_5,
  ERR_2_2_6,
  ERR_2_4_1,
  ERR_2_4_2,
  ERR_2_4_3,
  ERR_2_4_4,
] as const;

/** Stage 3 error codes. */
export const STAGE_3_ERROR_CODES = [
  ERR_3_1_1,
  ERR_3_1_2,
  ERR_3_1_3,
  ERR_3_1_4,
  ERR_3_3_1,
  ERR_3_3_2,
  ERR_3_3_3,
  ERR_3_3_4,
  ERR_3_3_5,
  ERR_3_5_1,
  ERR_3_5_2,
  ERR_3_5_3,
  ERR_3_5_4,
  ERR_3_5_5,
  ERR_3_7_1,
  ERR_3_7_2,
  ERR_3_7_3,
  ERR_3_7_4,
  ERR_3_7_5,
  ERR_3_9_1,
  ERR_3_9_2,
  ERR_3_9_3,
  ERR_3_9_4,
  ERR_3_9_5,
] as const;

// ---------------------------------------------------------------------------
// Description lookup
// ---------------------------------------------------------------------------

/** Human-readable description for each v13 IANA error code. */
export const V13_ERROR_DESCRIPTIONS: Record<ErrorCode, string> = {
  [ERR_1_1_1]: "Badly formed message — general",
  [ERR_1_1_2]: "Badly formed message — missing mandatory field",
  [ERR_1_1_3]: "Badly formed message — unrecognized message type",
  [ERR_1_1_4]: "Badly formed message — invalid digital asset identifier",
  [ERR_1_1_5]: "Badly formed message — invalid asset profile identifier",
  [ERR_1_1_6]: "Badly formed message — invalid verified originator entity",
  [ERR_1_1_7]: "Badly formed message — invalid verified beneficiary entity",
  [ERR_1_1_8]: "Badly formed message — invalid originator gateway network id",
  [ERR_1_1_9]: "Badly formed message — invalid beneficiary gateway network id",
  [ERR_1_1_10]:
    "Badly formed message — invalid sender gateway device identity public key",
  [ERR_1_1_11]: "Badly formed claim — invalid client identity info",
  [ERR_1_1_12]: "Badly formed claim — invalid server identity info",
  [ERR_1_1_13]: "Badly formed claim — invalid sender gateway owner id",
  [ERR_1_1_14]: "Badly formed claim — invalid receiver gateway owner id",
  [ERR_1_1_15]:
    "Badly formed claim — invalid sender gateway signature public key",
  [ERR_1_1_16]:
    "Badly formed claim — invalid receiver gateway signature public key",
  [ERR_1_1_17]:
    "Badly formed claim — invalid sender gateway device identity public key",
  [ERR_1_1_18]:
    "Badly formed claim — invalid receiver gateway device identity public key",
  [ERR_1_1_19]: "Badly formed claim — invalid hash transfer init claims",
  [ERR_1_1_20]: "Badly formed claim — invalid transfer context id",
  [ERR_1_1_31]: "Badly formed parameter — invalid network lock type",
  [ERR_1_1_32]: "Badly formed parameter — invalid network lock expiration time",
  [ERR_1_1_33]:
    "Badly formed parameter — invalid gateway default signature algorithm",
  [ERR_1_1_34]: "Badly formed parameter — invalid supported DLTs",
  [ERR_1_1_35]: "Badly formed parameter — invalid gateway capabilities version",
  [ERR_1_1_36]: "Badly formed parameter — invalid max retries",
  [ERR_1_2_1]: "Mismatch — session id mismatch",
  [ERR_1_2_2]: "Mismatch — transfer context id mismatch",
  [ERR_1_2_3]: "Mismatch — hash previous message mismatch",
  [ERR_1_2_4]: "Mismatch — message type mismatch",
  [ERR_1_3_1]: "Transfer Commence — badly formed commence message",
  [ERR_1_3_2]: "Transfer Commence — missing hash transfer init claims",
  [ERR_1_3_3]: "Transfer Commence — hash transfer init claims mismatch",
  [ERR_1_3_4]: "Transfer Commence — missing transfer context id",
  [ERR_1_3_5]: "Transfer Commence — invalid hash previous message",
  [ERR_1_4_1]: "ACK Commence — badly formed ack commence",
  [ERR_1_4_2]: "ACK Commence — missing transfer context id",
  [ERR_1_4_3]: "ACK Commence — session id mismatch",
  [ERR_1_4_4]: "ACK Commence — invalid hash previous message",
  [ERR_2_2_1]: "Lock Assertion — badly formed lock assertion",
  [ERR_2_2_2]: "Lock Assertion — missing lock assertion claim",
  [ERR_2_2_3]: "Lock Assertion — invalid lock assertion claim format",
  [ERR_2_2_4]: "Lock Assertion — lock assertion expiration error",
  [ERR_2_2_5]: "Lock Assertion — missing transfer context id",
  [ERR_2_2_6]: "Lock Assertion — invalid hash previous message",
  [ERR_2_4_1]: "Lock Assertion Receipt — badly formed receipt",
  [ERR_2_4_2]: "Lock Assertion Receipt — missing transfer context id",
  [ERR_2_4_3]: "Lock Assertion Receipt — session id mismatch",
  [ERR_2_4_4]: "Lock Assertion Receipt — invalid hash previous message",
  [ERR_3_1_1]: "Commit Preparation — badly formed commit prepare",
  [ERR_3_1_2]: "Commit Preparation — missing transfer context id",
  [ERR_3_1_3]: "Commit Preparation — session id mismatch",
  [ERR_3_1_4]: "Commit Preparation — invalid hash previous message",
  [ERR_3_3_1]: "Commit Ready — badly formed commit ready",
  [ERR_3_3_2]: "Commit Ready — missing transfer context id",
  [ERR_3_3_3]: "Commit Ready — missing mint assertion claim",
  [ERR_3_3_4]: "Commit Ready — session id mismatch",
  [ERR_3_3_5]: "Commit Ready — invalid hash previous message",
  [ERR_3_5_1]: "Commit Final Assertion — badly formed commit final",
  [ERR_3_5_2]: "Commit Final Assertion — missing burn assertion claim",
  [ERR_3_5_3]: "Commit Final Assertion — missing transfer context id",
  [ERR_3_5_4]: "Commit Final Assertion — session id mismatch",
  [ERR_3_5_5]: "Commit Final Assertion — invalid hash previous message",
  [ERR_3_7_1]: "Commit Final Ack Receipt — badly formed ack receipt",
  [ERR_3_7_2]: "Commit Final Ack Receipt — missing assignment assertion claim",
  [ERR_3_7_3]: "Commit Final Ack Receipt — missing transfer context id",
  [ERR_3_7_4]: "Commit Final Ack Receipt — session id mismatch",
  [ERR_3_7_5]: "Commit Final Ack Receipt — invalid hash previous message",
  [ERR_3_9_1]: "Transfer Complete — badly formed transfer complete",
  [ERR_3_9_2]: "Transfer Complete — missing transfer context id",
  [ERR_3_9_3]: "Transfer Complete — invalid transfer complete claim",
  [ERR_3_9_4]: "Transfer Complete — session id mismatch",
  [ERR_3_9_5]: "Transfer Complete — invalid hash previous message",
};

// ---------------------------------------------------------------------------
// Mapping from internal SATPErrorType → closest v13 IANA code
// ---------------------------------------------------------------------------

import { SATPErrorType } from "./satp-error-type";

/**
 * Maps internal SATPErrorType values to the closest v13 IANA error code.
 * For error types that are generic (not stage-specific), the Stage 1 general
 * code is used as the default since it is the broadest category.
 */
export const SATP_ERROR_TYPE_TO_V13: Partial<Record<SATPErrorType, ErrorCode>> =
  {
    [SATPErrorType.BADLY_FORMATED_MESSAGE]: ERR_1_1_1,
    [SATPErrorType.UNSPECIFIED]: ERR_1_1_1,
    [SATPErrorType.DLT_NOT_SUPPORTED]: ERR_1_1_1,
    [SATPErrorType.BRIDGE_PROBLEM]: ERR_1_1_1,
    [SATPErrorType.INCORRECT_PARAMETER]: ERR_1_1_2,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_CLAIM]: ERR_1_1_19,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_BAD_SIGNATURE]: ERR_1_1_1,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_WRONG_TRANSACTION_ID]: ERR_1_1_20,
    [SATPErrorType.BADLY_FORMATED_MESSAGE_MISMATCH_HASH_VALUES]: ERR_1_2_3,
    [SATPErrorType.MESSAGE_OUT_OF_SEQUENCE]: ERR_1_2_4,
    [SATPErrorType.SESSION_NOT_FOUND]: ERR_1_2_1,
    [SATPErrorType.SESSION_ID_NOT_FOUND]: ERR_1_2_1,
    [SATPErrorType.SESSION_MISS_MATCH]: ERR_1_2_1,
    [SATPErrorType.COMMON_BODY_BADLY_FORMATED]: ERR_1_1_1,
    [SATPErrorType.MISSING_PARAMETER]: ERR_1_1_2,
    [SATPErrorType.SATP_VERSION_NOT_SUPPORTED]: ERR_1_1_1,
    [SATPErrorType.SIGNATURE_VERIFICATION_FAILED]: ERR_1_1_1,
    [SATPErrorType.HASH_MISS_MATCH]: ERR_1_2_3,
    [SATPErrorType.CONTEXT_ID_MISS_MATCH]: ERR_1_2_2,
    [SATPErrorType.LOCK_ASSERTION_BADLY_FORMATED]: ERR_2_2_1,
    [SATPErrorType.LOCK_ASSERTION_CLAIM_FORMAT_MISSING]: ERR_2_2_3,
    [SATPErrorType.LOCK_ASSERTION_EXPIRATION_ERROR]: ERR_2_2_4,
    [SATPErrorType.BURN_ASSERTION_BADLY_FORMATED]: ERR_3_5_2,
    [SATPErrorType.MINT_ASSERTION_BADLY_FORMATED]: ERR_3_3_3,
    [SATPErrorType.ASSIGNMENT_ASSERTION_BADLY_FORMATED]: ERR_3_7_2,
  };

/**
 * Returns the v13 IANA error code string for an internal SATPErrorType.
 * Falls back to `err_1.1.1` (general badly formed message) for unmapped types.
 */
export function satpErrorTypeToV13Code(
  errorType: SATPErrorType,
): ErrorCode | Error {
  return (
    SATP_ERROR_TYPE_TO_V13[errorType] ?? new Error("Cannot find SATP error")
  );
}

/**
 * Returns the human-readable description for a v13 IANA error code.
 */
export function v13ErrorDescription(code: ErrorCode): string {
  return V13_ERROR_DESCRIPTIONS[code];
}

const V13_ERROR_CODE_SET = new Set<string>([
  ...STAGE_1_ERROR_CODES,
  ...STAGE_2_ERROR_CODES,
  ...STAGE_3_ERROR_CODES,
]);

/**
 * Checks if a string is a valid v13 IANA error code.
 */
export function isV13ErrorCode(code: string): code is ErrorCode {
  return V13_ERROR_CODE_SET.has(code);
}
