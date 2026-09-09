/**
 * ConnectRPC interceptors that place a SATP v13 JWS signature on the
 * wire and verify it on receipt.
 *
 * v13 removes the per-message `clientSignature`/`serverSignature`
 * fields from stage 1–3 message bodies. Instead, every unary request is
 * signed as a whole and the signature is carried out-of-band in the
 * {@link SATP_SIGNATURE} gRPC header as a JWS Compact Serialization.
 *
 * - The client-side {@link createSignatureSigningInterceptor} serializes
 *   the outgoing message to its protobuf binary, signs it with the local
 *   gateway's ES256 key, and sets the header.
 * - The server-side {@link createSignatureVerificationInterceptor} reads
 *   the header, resolves the sender's public key from the JWS `kid`,
 *   verifies the signature, and checks that the signed payload matches
 *   the received message bytes. An invalid or missing signature raises a
 *   {@link ConnectError} (`Code.Unauthenticated`), which ConnectRPC
 *   surfaces as a protocol error response.
 *
 * TODO(stage-0 + crash-recovery): stage 0 and the crash-recovery
 * service still carry per-message `client_signature`/`server_signature`
 * proto fields and are intentionally NOT wrapped by these interceptors
 * yet. Migrate them to JWS envelope signing and remove those fields.
 *
 * @module core/cryptography/jws-interceptors
 * @see ./jws-utils
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-satp-core-13
 */

import { timingSafeEqual } from "node:crypto";
import { toBinary } from "@bufbuild/protobuf";
import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";
import {
  jwsDecodeProtectedHeader,
  jwsSign,
  jwsVerify,
  type CryptoKey,
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
  /** The local gateway id, embedded as the JWS `kid`. */
  gatewayId: string;
}

/** Options for the server-side verification interceptor. */
export interface ISignatureVerificationInterceptorOptions {
  /**
   * Resolve the ES256 public key for the signer identified by the JWS
   * `kid` (the sender gateway id). Returns `undefined` when unknown.
   */
  resolvePublicKey: (kid: string | undefined) => Promise<CryptoKey | undefined>;
}

/**
 * Create a client interceptor that signs each unary request and places
 * the JWS in the {@link SATP_SIGNATURE} header.
 *
 * Streaming RPCs are passed through unsigned.
 */
export function createSignatureSigningInterceptor(
  options: ISignatureSigningInterceptorOptions,
): Interceptor {
  return (next) => async (req) => {
    if (!req.stream) {
      const bytes = toBinary(req.method.input, req.message);
      const privateKey = await options.getPrivateKey();
      const jws = await jwsSign(bytes, privateKey, {
        kid: options.gatewayId,
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
 * Throws {@link ConnectError} with `Code.Unauthenticated` when the
 * signature is missing, the signer key is unknown, the signature is
 * invalid, or the signed payload does not match the received message.
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
      const { kid } = jwsDecodeProtectedHeader(jws);
      const publicKey = await options.resolvePublicKey(kid);
      if (!publicKey) {
        throw new ConnectError(
          `No signature verification key for gateway '${kid ?? "unknown"}'`,
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
