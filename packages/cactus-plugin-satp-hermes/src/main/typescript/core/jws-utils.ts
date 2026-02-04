/**
 * JWS (JSON Web Signature) utilities for SATP v13 message signing
 * and verification.
 *
 * v13 replaces per-message `clientSignature`/`serverSignature` fields
 * with JWS envelope signing per [RFC7515]. All outgoing SATP messages
 * MUST be wrapped in a JWS; all incoming messages MUST have their JWS
 * verified.
 *
 * **Current status**: STUB IMPLEMENTATION. All signing produces a
 * placeholder token and all verification returns `true`. This is
 * intentional to unblock the v02→v13 migration without introducing
 * a new production dependency (e.g., `jose`) or changing the
 * transport layer. The full implementation is tracked as a follow-up
 * to TASK-064.
 *
 * TODO(TASK-064-followup):
 *   - Add `jose` (or Node.js native `crypto`) dependency for real
 *     ECDSA P-256 / SHA-256 JWS operations.
 *   - Implement `jwsSign` using `CompactSign` from `jose`.
 *   - Implement `jwsVerify` using `compactVerify` from `jose`.
 *   - Wire into ConnectRPC transport middleware so signing/verification
 *     is transparent to service layer code.
 *   - Support `alg: "ES256"` as the REQUIRED algorithm per v13
 *     Section 5.3.3 and [RFC7518 Section 3.1].
 *
 * @module core/jws-utils
 * @see https://datatracker.ietf.org/doc/draft-ietf-satp-core/13/
 * @see https://www.rfc-editor.org/rfc/rfc7515 — JWS specification
 * @see https://www.rfc-editor.org/rfc/rfc7518#section-3.1 — JWA ES256
 */

import { stringify as safeStableStringify } from "safe-stable-stringify";

/**
 * Supported JWS algorithms.
 *
 * v13 mandates ECDSA P-256 with SHA-256 (`ES256`) as the minimum.
 */
export enum JWSAlgorithm {
  /** ECDSA using P-256 and SHA-256 — REQUIRED by v13 */
  ES256 = "ES256",
}

/**
 * Result of a JWS verification operation.
 */
export interface IJWSVerificationResult {
  /** Whether the JWS signature is valid */
  verified: boolean;
  /** The decoded payload (raw bytes or string) */
  payload: string;
  /** Algorithm used in the JWS header */
  algorithm: JWSAlgorithm;
}

/**
 * Options for JWS signing.
 */
export interface IJWSSignOptions {
  /** The algorithm to use. Defaults to ES256. */
  algorithm?: JWSAlgorithm;
  /** The private key in JWK or PEM format. Currently unused (stub). */
  privateKey?: unknown;
}

/**
 * Options for JWS verification.
 */
export interface IJWSVerifyOptions {
  /** The expected algorithm. Defaults to ES256. */
  algorithm?: JWSAlgorithm;
  /** The public key in JWK or PEM format. Currently unused (stub). */
  publicKey?: unknown;
}

/**
 * Produce a JWS Compact Serialization for the given SATP message.
 *
 * **STUB**: Returns a dot-separated placeholder token with the
 * structure `header.payload.signature` where each part is
 * base64url-encoded. The signature segment is a static placeholder.
 *
 * @param message - The SATP protobuf message object to sign
 * @param options - Signing options (algorithm, private key)
 * @returns A JWS Compact Serialization string
 */
export function jwsSign(message: unknown, options?: IJWSSignOptions): string {
  const alg = options?.algorithm ?? JWSAlgorithm.ES256;

  // JWS header: {"alg":"ES256","typ":"satp+jws"}
  const header = Buffer.from(JSON.stringify({ alg, typ: "satp+jws" })).toString(
    "base64url",
  );

  // Payload: canonical JSON of the message
  const payload = Buffer.from(safeStableStringify(message) ?? "").toString(
    "base64url",
  );

  // TODO(TASK-064-followup): Replace with real ECDSA P-256 signature
  const signature = "STUB_SIGNATURE";

  return `${header}.${payload}.${signature}`;
}

/**
 * Verify a JWS Compact Serialization and extract the payload.
 *
 * **STUB**: Always returns `{ verified: true }` with the decoded
 * payload. No cryptographic verification is performed.
 *
 * @param jws - The JWS Compact Serialization string to verify
 * @param options - Verification options (algorithm, public key)
 * @returns Verification result with decoded payload
 */
export function jwsVerify(
  jws: string,
  options?: IJWSVerifyOptions,
): IJWSVerificationResult {
  const alg = options?.algorithm ?? JWSAlgorithm.ES256;

  const parts = jws.split(".");
  if (parts.length !== 3) {
    return { verified: false, payload: "", algorithm: alg };
  }

  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");

  // TODO(TASK-064-followup): Replace with real ECDSA P-256 verification
  return {
    verified: true,
    payload,
    algorithm: alg,
  };
}

/**
 * Extract and decode the payload from a JWS without verification.
 *
 * Useful for logging or debugging. Do NOT use for security decisions.
 *
 * @param jws - The JWS Compact Serialization string
 * @returns The decoded payload string, or empty string if malformed
 */
export function jwsDecodePayload(jws: string): string {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    return "";
  }
  return Buffer.from(parts[1], "base64url").toString("utf-8");
}
