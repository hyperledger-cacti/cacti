/**
 * Gateway signature interceptors — factory wiring the JWS signing and
 * verification interceptors to a gateway's identity and credential store.
 *
 * Extracted from `GatewayOrchestrator` so the interceptor construction is
 * testable and reusable independently of the orchestrator:
 *
 * - The **signing** interceptor resolves the local gateway's ES256 private
 *   key and public JWK (generating an ephemeral key pair when none is
 *   configured) and signs every outgoing unary request, embedding the
 *   public JWK in the JWS protected header.
 * - The **verification** interceptor resolves the sender's public key from
 *   the gateway identity store: a pre-provisioned (pinned) key takes
 *   precedence, with the JWS-embedded public JWK as fallback.
 *
 * @module core/cryptography/gateway-signature-interceptors
 * @see ./jws-interceptors
 * @see ./signing-keys
 */

import type { Interceptor } from "@connectrpc/connect";

import { GatewayCredential, type GatewayIdentity } from "../types";
import { SATPLogger as Logger } from "../satp-logger";
import {
  resolveLocalSigningPrivateKey,
  resolveLocalSigningPublicJwk,
  resolveSigningPublicKey,
} from "./signing-keys";
import {
  createSignatureSigningInterceptor,
  createSignatureVerificationInterceptor,
} from "./jws-interceptors";
import type { JWK } from "./jws-utils";

/** Options for creating the gateway signature interceptors. */
export interface IGatewaySignatureInterceptorsOptions {
  /** The local gateway identity (its `ENVELOPE_SIGNATURE` credential is used for signing). */
  localGateway: GatewayIdentity;
  /** Resolve a counterparty gateway identity by id (used for verification). */
  getGatewayIdentity: (id: string) => GatewayIdentity | undefined;
  /** Logger for ephemeral-key warnings and resolution failures. */
  logger: Logger;
}

/** The pair of interceptors guarding gateway-to-gateway message signatures. */
export interface IGatewaySignatureInterceptors {
  /** Client-side interceptor that signs outgoing unary requests. */
  signing: Interceptor;
  /** Server-side interceptor that verifies incoming unary requests. */
  verification: Interceptor;
}

/**
 * Create the JWS signing and verification interceptors for a gateway.
 *
 * @param options - Local gateway, identity lookup and logger
 * @returns The signing and verification interceptors
 */
export function createGatewaySignatureInterceptors(
  options: IGatewaySignatureInterceptorsOptions,
): IGatewaySignatureInterceptors {
  const { localGateway, getGatewayIdentity, logger } = options;

  return {
    signing: createSignatureSigningInterceptor({
      getPrivateKey: () => resolveLocalSigningPrivateKey(localGateway, logger),
      getPublicJwk: () => resolveLocalSigningPublicJwk(localGateway, logger),
      gatewayId: localGateway.id,
    }),
    verification: createSignatureVerificationInterceptor({
      resolvePublicKey: (kid) =>
        resolveSigningPublicKey(
          kid === undefined ? undefined : getGatewayIdentity(kid),
        ),
      resolvePinnedJwk: async (kid) => {
        const pinnedJwk =
          kid === undefined
            ? undefined
            : getGatewayIdentity(kid)?.credentials?.[
                GatewayCredential.ENVELOPE_SIGNATURE
              ]?.publicKey;
        return typeof pinnedJwk === "object" && pinnedJwk !== null
          ? (pinnedJwk as unknown as JWK)
          : undefined;
      },
    }),
  };
}
