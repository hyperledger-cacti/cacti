/**
 * JWS (JSON Web Signature) utilities for SATP v13 message signing
 * and verification.
 *
 * v13 replaces per-message `clientSignature`/`serverSignature` fields
 * with JWS envelope signing per [RFC7515]. All outgoing SATP messages
 * MUST be wrapped in a JWS; all incoming messages MUST have their JWS
 * verified.
 *
 * The signature travels out-of-band from the protobuf body, in the
 * `SATP_SIGNATURE` gRPC header, as a JWS Compact Serialization
 * (`header.payload.signature`). The payload is the deterministic
 * protobuf binary encoding of the message. See {@link jwsSign} and the
 * signing/verification interceptors in `core/cryptography/jws-interceptors.ts`.
 *
 * Only `ES256` (ECDSA using P-256 and SHA-256) is implemented — the
 * REQUIRED algorithm per v13 Section 5.3.3 and [RFC7518 Section 3.1].
 *
 * @module core/cryptography/jws-utils
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-satp-core-13
 * @see https://www.rfc-editor.org/rfc/rfc7515 — JWS specification
 * @see https://www.rfc-editor.org/rfc/rfc7518#section-3.1 — JWA ES256
 */

import { webcrypto } from "crypto";

/**
 * An ES256 (P-256) key handle produced by {@link importSigningKey}.
 *
 * Backed by the Node.js WebCrypto (`crypto.subtle`) implementation so no
 * ESM-only third-party dependency is required at runtime or under Jest.
 */
export type CryptoKey = webcrypto.CryptoKey;

/** A key in JSON Web Key form, as produced/consumed by WebCrypto. */
export type JWK = webcrypto.JsonWebKey;

const ES256_KEY_ALGORITHM: webcrypto.EcKeyAlgorithm = {
  name: "ECDSA",
  namedCurve: "P-256",
};

const ES256_SIGN_ALGORITHM: webcrypto.EcdsaParams = {
  name: "ECDSA",
  hash: "SHA-256",
};

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecode(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

/**
 * Supported JWS algorithms.
 *
 * v13 mandates ECDSA P-256 with SHA-256 (`ES256`) as the minimum.
 */
export enum JWSAlgorithm {
  /** ECDSA using P-256 and SHA-256 — REQUIRED by v13 */
  ES256 = "ES256",
}

/** JWS protected header fields relevant to SATP. */
export interface IJWSProtectedHeader {
  /** Algorithm used in the JWS header. */
  alg: string;
  /** Key ID — the signing gateway's id, used to resolve the verifying key. */
  kid?: string;
}

/**
 * Result of a JWS verification operation.
 */
export interface IJWSVerificationResult {
  /** Whether the JWS signature is valid. */
  verified: boolean;
  /** The decoded payload bytes (the signed protobuf binary). */
  payload: Uint8Array;
  /** The decoded protected header. */
  protectedHeader: IJWSProtectedHeader;
}

/**
 * Options for JWS signing.
 */
export interface IJWSSignOptions {
  /** The algorithm to use. Defaults to ES256. */
  algorithm?: JWSAlgorithm;
  /** Key ID to embed in the protected header (the signer gateway id). */
  kid?: string;
}

/**
 * Options for JWS verification.
 */
export interface IJWSVerifyOptions {
  /** The expected algorithm. Defaults to ES256. */
  algorithm?: JWSAlgorithm;
}

/**
 * Generate a fresh ES256 (P-256) signing key pair as JWKs.
 *
 * The returned JWKs are serializable and can be stored in a
 * `GatewayIdentity`'s `keys[ENVELOPE_SIGNATURE]` entry. The private JWK MUST
 * remain on the owning gateway; only the public JWK is shared.
 *
 * @returns The public and private keys as JWK objects.
 */
export async function generateSigningKeyPair(): Promise<{
  publicKey: JWK;
  privateKey: JWK;
}> {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    ES256_KEY_ALGORITHM,
    true,
    ["sign", "verify"],
  );
  return {
    publicKey: await webcrypto.subtle.exportKey("jwk", publicKey),
    privateKey: await webcrypto.subtle.exportKey("jwk", privateKey),
  };
}

/**
 * Import an ES256 signing key (public or private) from its JWK.
 *
 * The key usage is inferred from the JWK: a private JWK (one carrying the
 * `d` parameter) is imported for `sign`, a public JWK for `verify`.
 *
 * @param jwk - The key material in JWK format.
 * @returns The imported key usable with {@link jwsSign} / {@link jwsVerify}.
 */
export async function importSigningKey(jwk: JWK): Promise<CryptoKey> {
  const usages: webcrypto.KeyUsage[] = jwk.d ? ["sign"] : ["verify"];
  return webcrypto.subtle.importKey(
    "jwk",
    jwk,
    ES256_KEY_ALGORITHM,
    true,
    usages,
  );
}

/**
 * Produce a JWS Compact Serialization over the given payload bytes.
 *
 * @param payload - The bytes to sign (the message's protobuf binary).
 * @param privateKey - The signer's ES256 private key.
 * @param options - Signing options (algorithm, key id).
 * @returns A JWS Compact Serialization string (`header.payload.signature`).
 */
export async function jwsSign(
  payload: Uint8Array,
  privateKey: CryptoKey,
  options?: IJWSSignOptions,
): Promise<string> {
  const alg = options?.algorithm ?? JWSAlgorithm.ES256;
  if (alg !== JWSAlgorithm.ES256) {
    throw new Error(`jwsSign: unsupported algorithm "${alg}", only ES256`);
  }
  const header: IJWSProtectedHeader & { typ: string } = {
    alg,
    typ: "satp+jws",
  };
  if (options?.kid !== undefined) {
    header.kid = options.kid;
  }
  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  // WebCrypto ECDSA returns the raw r||s concatenation, which is exactly
  // the JWS signature encoding required by RFC 7518 Section 3.4.
  const signature = new Uint8Array(
    await webcrypto.subtle.sign(
      ES256_SIGN_ALGORITHM,
      privateKey,
      new TextEncoder().encode(signingInput),
    ),
  );
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Verify a JWS Compact Serialization and extract the payload.
 *
 * Returns `{ verified: false }` instead of throwing when the signature
 * is invalid or malformed, so callers can map the result to a protocol
 * error.
 *
 * @param jws - The JWS Compact Serialization string to verify.
 * @param publicKey - The signer's ES256 public key.
 * @param options - Verification options (expected algorithm).
 * @returns Verification result with the decoded payload and header.
 */
export async function jwsVerify(
  jws: string,
  publicKey: CryptoKey,
  options?: IJWSVerifyOptions,
): Promise<IJWSVerificationResult> {
  const alg = options?.algorithm ?? JWSAlgorithm.ES256;
  const failure: IJWSVerificationResult = {
    verified: false,
    payload: new Uint8Array(),
    protectedHeader: { alg },
  };
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) {
      return failure;
    }
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8"),
    ) as IJWSProtectedHeader;
    if (header.alg !== alg) {
      return failure;
    }
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const verified = await webcrypto.subtle.verify(
      ES256_SIGN_ALGORITHM,
      publicKey,
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(signingInput),
    );
    if (!verified) {
      return failure;
    }
    return {
      verified: true,
      payload: base64UrlDecode(encodedPayload),
      protectedHeader: { alg: header.alg, kid: header.kid },
    };
  } catch {
    return failure;
  }
}

/**
 * Decode the protected header of a JWS without verifying the signature.
 *
 * Useful to extract the `kid` so the verifying public key can be
 * resolved before verification. Do NOT use for security decisions.
 *
 * @param jws - The JWS Compact Serialization string.
 * @returns The decoded protected header, or an empty object if malformed.
 */
export function jwsDecodeProtectedHeader(jws: string): IJWSProtectedHeader {
  try {
    const [encodedHeader] = jws.split(".");
    if (!encodedHeader) {
      return { alg: "" };
    }
    const header = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8"),
    ) as IJWSProtectedHeader;
    return { alg: header.alg ?? "", kid: header.kid };
  } catch {
    return { alg: "" };
  }
}
