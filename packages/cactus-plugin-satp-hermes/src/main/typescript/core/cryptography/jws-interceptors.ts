/**
 * ConnectRPC interceptors that place a SATP v13 JWS signature on the
 * wire and verify it on receipt.
 *
 * v13 removes the per-message `clientSignature`/`serverSignature`
 * fields from stage 1–3 message bodies. Instead, every unary message is
 * signed as a whole and the signature is carried out-of-band in the
 * {@link SATP_SIGNATURE} gRPC header as a JWS Compact Serialization.
 *
 * - The client-side {@link createSignatureSigningInterceptor} serializes
 *   the outgoing request to its protobuf binary, signs it with the local
 *   gateway's ES256 key, and sets the header.
 * - The server-side {@link createSignatureVerificationInterceptor} reads
 *   the header, resolves the sender's public key from the JWS `kid` —
 *   ONLY from the pre-provisioned (pinned) counterparty identity, never
 *   from the untrusted JWS header — verifies the signature, and checks
 *   that the signed payload matches the received message bytes.
 * - The server-side {@link createResponseSigningInterceptor} signs the
 *   unary response so clients can authenticate stage 1–3 responses.
 * - The client-side {@link createResponseVerificationInterceptor}
 *   verifies the response signature against the pinned key of the
 *   counterparty the channel is connected to.
 *
 * An invalid or missing signature raises a {@link ConnectError}
 * (`Code.Unauthenticated`), which ConnectRPC surfaces as a protocol error
 * response.
 *
 * TODO(stage-0 + crash-recovery): stage 0 and the crash-recovery
 * service still carry per-message `client_signature`/`server_signature`
 * proto fields and are intentionally NOT wrapped by these interceptors
 * yet. Migrate them to JWS envelope signing and remove those fields.
 *
 * @module core/cryptography/jws-interceptors
 * @see ./jws-utils
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-satp-core-16
 */

import { timingSafeEqual } from "node:crypto";
import { toBinary } from "@bufbuild/protobuf";
import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";
import {
  jwsDecodeProtectedHeader,
  jwsSign,
  jwsVerify,
  type CryptoKey,
  type JWK,
} from "./jws-utils";

/**
 * gRPC header carrying the JWS Compact Serialization of the message.
 *
 * Header keys are transmitted lowercase over gRPC; `satp-signature` is
 * the wire form of the logical `SATP_SIGNATURE` header.
 */
export const SATP_SIGNATURE = "satp-signature";

/** Options for the client-side signing interceptor. */
export interface ISignatureSigningInterceptorOptions {
  /** Resolve (and cache) the local gateway's ES256 private key. */
  getPrivateKey: () => Promise<CryptoKey>;
  /**
   * Resolve the local gateway's public ES256 JWK, embedded in the JWS
   * protected header (RFC 7515 Section 4.1.3) so counterparties can
   * detect key substitution against their pinned key.
   */
  getPublicJwk: () => Promise<JWK>;
  /** The local gateway id, embedded as the JWS `kid`. */
  gatewayId: string;
}

/** Options for the server-side verification interceptor. */
export interface ISignatureVerificationInterceptorOptions {
  /**
   * Resolve the pre-provisioned (pinned) ES256 public key for the signer
   * identified by the JWS `kid` (the sender gateway id). Returns
   * `undefined` when no key is pinned for that gateway.
   */
  resolvePublicKey: (kid: string | undefined) => Promise<CryptoKey | undefined>;
  /**
   * Optional: resolve the pinned public JWK for the signer, used to
   * detect key-substitution when the JWS also embeds a JWK. When a key
   * is pinned and the embedded JWK differs from the pinned one, the
   * request is rejected.
   */
  resolvePinnedJwk?: (kid: string | undefined) => Promise<JWK | undefined>;
}

/** Options for the server-side response-signing interceptor. */
export interface IResponseSigningInterceptorOptions {
  /** Resolve (and cache) the local gateway's ES256 private key. */
  getPrivateKey: () => Promise<CryptoKey>;
  /** The local gateway id, embedded as the JWS `kid`. */
  gatewayId: string;
}

/** Options for the client-side response-verification interceptor. */
export interface IResponseVerificationInterceptorOptions {
  /**
   * Resolve the pre-provisioned (pinned) ES256 public key of the gateway
   * this channel is connected to. Returns `undefined` when no key is
   * pinned for it.
   */
  resolveCounterpartyPublicKey: () => Promise<CryptoKey | undefined>;
}

/**
 * Compare two JWK objects for equality, independent of property order.
 * Only the public parameters matter; the private `d` parameter (if any)
 * is never part of an embedded/pinned public JWK.
 */
function jwkMatches(a: JWK, b: JWK): boolean {
  const canonical = (jwk: JWK): string =>
    JSON.stringify(
      Object.keys(jwk as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (jwk as Record<string, unknown>)[key];
          return acc;
        }, {}),
    );
  return canonical(a) === canonical(b);
}

/**
 * Create a client interceptor that signs each unary request and places
 * the JWS in the {@link SATP_SIGNATURE} header.
 *
 * The JWS protected header carries the signer's public JWK, so the
 * counterparty can detect substitution against its pinned key.
 *
 * Streaming RPCs are passed through unsigned.
 */
export function createSignatureSigningInterceptor(
  options: ISignatureSigningInterceptorOptions,
): Interceptor {
  return (next) => async (req) => {
    if (!req.stream) {
      const bytes = toBinary(req.method.input, req.message);
      const [privateKey, publicJwk] = await Promise.all([
        options.getPrivateKey(),
        options.getPublicJwk(),
      ]);
      const jws = await jwsSign(bytes, privateKey, {
        kid: options.gatewayId,
        jwk: publicJwk,
      });
      req.header.set(SATP_SIGNATURE, jws);
    }
    return next(req);
  };
}

/**
 * Create a server interceptor that verifies the {@link SATP_SIGNATURE}
 * header on each unary request.
 *
 * Key resolution is pinned-only: the public key MUST be resolved from the
 * pre-provisioned counterparty identity for the JWS `kid`. A JWK embedded
 * in the untrusted JWS header is never used as the verification key —
 * possession of an arbitrary key would then be enough to impersonate any
 * gateway id. When both a pinned JWK and an embedded JWK are available,
 * a mismatch (key substitution) is rejected.
 *
 * Throws {@link ConnectError} with `Code.Unauthenticated` when the
 * signature is missing, no pinned key resolves for the `kid`, the
 * signature is invalid, or the signed payload does not match the
 * received message.
 *
 * Streaming RPCs are passed through without verification.
 */
export function createSignatureVerificationInterceptor(
  options: ISignatureVerificationInterceptorOptions,
): Interceptor {
  return (next) => async (req) => {
    if (!req.stream) {
      const jws = req.header.get(SATP_SIGNATURE);
      if (!jws) {
        throw new ConnectError(
          "Missing SATP message signature",
          Code.Unauthenticated,
        );
      }
      const { kid, jwk } = jwsDecodeProtectedHeader(jws);
      const publicKey = await options.resolvePublicKey(kid);
      if (publicKey && jwk && options.resolvePinnedJwk) {
        const pinnedJwk = await options.resolvePinnedJwk(kid);
        if (pinnedJwk && !jwkMatches(jwk, pinnedJwk)) {
          throw new ConnectError(
            `Embedded JWK does not match pinned key for gateway '${kid ?? "unknown"}'`,
            Code.Unauthenticated,
          );
        }
      }
      if (!publicKey) {
        throw new ConnectError(
          `No pinned ENVELOPE_SIGNATURE key for gateway '${kid ?? "unknown"}'; ` +
            "provision the counterparty gateway identity with its public JWK",
          Code.Unauthenticated,
        );
      }
      const result = await jwsVerify(jws, publicKey);
      const expected = toBinary(req.method.input, req.message);
      if (
        !result.verified ||
        result.payload.length !== expected.length ||
        !timingSafeEqual(result.payload, expected)
      ) {
        throw new ConnectError(
          "Invalid SATP message signature",
          Code.Unauthenticated,
        );
      }
    }
    return next(req);
  };
}

/**
 * Create a server interceptor that signs each unary response.
 *
 * Stage 1–3 responses carry no per-message signature fields in v13, so
 * the response is signed as a whole (protobuf binary) and the JWS is
 * placed in the {@link SATP_SIGNATURE} response header. Clients verify
 * it with {@link createResponseVerificationInterceptor}, which makes
 * forged or tampered server responses detectable.
 *
 * Error responses propagate unmodified; streaming RPCs are passed
 * through unsigned.
 */
export function createResponseSigningInterceptor(
  options: IResponseSigningInterceptorOptions,
): Interceptor {
  return (next) => async (req) => {
    const res = await next(req);
    // Streaming responses carry an AsyncIterable message body; only the
    // single message of a unary response is signed.
    if (!req.stream && !(Symbol.asyncIterator in res.message)) {
      const bytes = toBinary(res.method.output, res.message);
      const privateKey = await options.getPrivateKey();
      const jws = await jwsSign(bytes, privateKey, {
        kid: options.gatewayId,
      });
      res.header.set(SATP_SIGNATURE, jws);
    }
    return res;
  };
}

/**
 * Create a client interceptor that verifies the {@link SATP_SIGNATURE}
 * header on each unary response.
 *
 * The signature MUST verify with the pinned ENVELOPE_SIGNATURE public
 * key of the counterparty gateway this channel is connected to, and the
 * signed payload must match the received response message. Missing or
 * invalid signatures fail closed with {@link ConnectError}
 * (`Code.Unauthenticated`) so unsigned stage 1–3 server responses can
 * never reach the protocol layer.
 *
 * Error responses (transport-level rejections) propagate unmodified;
 * streaming RPCs are passed through without verification.
 */
export function createResponseVerificationInterceptor(
  options: IResponseVerificationInterceptorOptions,
): Interceptor {
  return (next) => async (req) => {
    const res = await next(req);
    // Streaming responses carry an AsyncIterable message body; only the
    // single message of a unary response is verified.
    if (!req.stream && !(Symbol.asyncIterator in res.message)) {
      const jws = res.header.get(SATP_SIGNATURE);
      if (!jws) {
        throw new ConnectError(
          "Missing SATP response signature",
          Code.Unauthenticated,
        );
      }
      const publicKey = await options.resolveCounterpartyPublicKey();
      if (!publicKey) {
        throw new ConnectError(
          "No pinned ENVELOPE_SIGNATURE key for the counterparty gateway; " +
            "cannot verify its response signature",
          Code.Unauthenticated,
        );
      }
      const result = await jwsVerify(jws, publicKey);
      const expected = toBinary(res.method.output, res.message);
      if (
        !result.verified ||
        result.payload.length !== expected.length ||
        !timingSafeEqual(result.payload, expected)
      ) {
        throw new ConnectError(
          "Invalid SATP response signature",
          Code.Unauthenticated,
        );
      }
    }
    return res;
  };
}
