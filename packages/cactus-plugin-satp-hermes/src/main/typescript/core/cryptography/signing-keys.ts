/**
 * ES256 signing-key resolution for SATP gateways.
 *
 * Bridges a {@link GatewayIdentity}'s `ENVELOPE_SIGNATURE` key material (JWK)
 * to the WebCrypto {@link CryptoKey} handles consumed by the JWS signing and
 * verification interceptors in `./jws-interceptors`.
 *
 * The local gateway's private key NEVER lives on the `GatewayIdentity`
 * (which is exposed through `SATPGateway.Identity` and published to
 * counterparties). It is either:
 * - provisioned from local-only configuration via
 *   {@link provisionLocalSigningPrivateKey}, or
 * - generated once as an ephemeral dev/test fallback, warned about loudly,
 *   and only usable when counterparties accept the generated public key.
 *
 * In both cases it is kept in non-exported module state keyed by the
 * identity object.
 *
 * @module core/cryptography/signing_keys
 * @see ./jws-utils
 * @see ./jws-interceptors
 */

import {
  GatewayIdentity,
  GatewayCredential,
  SupportedSigningAlgorithms,
} from "../types";
import { SATPLogger as Logger } from "../satp-logger";
import {
  generateSigningKeyPair,
  importSigningKey,
  derivePublicJwk,
  type CryptoKey,
  type JWK,
} from "./jws-utils";

/**
 * Local private key material for the `ENVELOPE_SIGNATURE` credential,
 * keyed by the gateway identity object that owns the key. Provisioned via
 * {@link provisionLocalSigningPrivateKey} or generated once as an ephemeral
 * fallback. Never exposed through the identity or any serialized gateway
 * state.
 */
const localPrivateJwks = new WeakMap<GatewayIdentity, JWK>();

/**
 * In-flight key-pair resolutions, so that concurrent calls (e.g. the signing
 * interceptor resolving the private key and public JWK in parallel) share a
 * single generation/import cycle and always observe a matching key pair.
 */
const inFlightResolutions = new WeakMap<
  GatewayIdentity,
  Promise<{ privateKey: CryptoKey; publicJwk: JWK }>
>();

/**
 * Provision the local gateway's ES256 private signing key (JWK).
 *
 * Called once at gateway startup with the local-only private key material
 * from configuration. The key is stored in non-exported module state — it is
 * never written onto the {@link GatewayIdentity}, which only ever carries
 * public key material.
 *
 * @param localGateway - The gateway identity that owns the key.
 * @param privateJwk - The private key material in JWK form (must carry the
 *   private `d` parameter).
 * @throws {Error} When the JWK is not an object or does not carry private
 *   key material.
 */
export function provisionLocalSigningPrivateKey(
  localGateway: GatewayIdentity,
  privateJwk: unknown,
): void {
  if (
    typeof privateJwk !== "object" ||
    privateJwk === null ||
    Array.isArray(privateJwk)
  ) {
    throw new Error(
      "envelopeSignaturePrivateKey must be a JWK object (EC P-256, ES256)",
    );
  }
  const jwk = privateJwk as Record<string, unknown>;
  if (typeof jwk.d !== "string" || jwk.d === "") {
    throw new Error(
      "envelopeSignaturePrivateKey must carry the private key material " +
        "(the JWK 'd' parameter)",
    );
  }
  localPrivateJwks.set(localGateway, privateJwk as unknown as JWK);
}

/**
 * Check that two public JWKs describe the same P-256 key.
 */
function publicJwksMatch(a: JWK, b: JWK): boolean {
  return (
    a.kty === b.kty &&
    a.crv === b.crv &&
    a.x === b.x &&
    a.y === b.y &&
    a.x !== undefined &&
    a.y !== undefined
  );
}

/**
 * Resolve the local gateway's ES256 signing key pair.
 *
 * - Private key material comes exclusively from the local-only store
 *   (see {@link provisionLocalSigningPrivateKey}).
 * - The public JWK comes from the identity's `ENVELOPE_SIGNATURE`
 *   credential, so counterparties can pin it.
 * - When both are present they are validated to be a matching pair: a
 *   mismatched configuration signs messages whose advertised public key
 *   cannot verify them, so it is rejected instead of silently breaking
 *   every signed message.
 * - When neither is present, a single ephemeral ES256 key pair is generated
 *   (once, never raced) and a warning is logged: counterparties must pin
 *   the generated public JWK for verification to succeed, so production
 *   deployments should pre-provision the key pair instead.
 *
 * Concurrent calls share a single resolution, guaranteeing the returned
 * private key and public JWK always belong to the same key pair.
 *
 * @param localGateway - The local gateway identity; only its public
 *   `ENVELOPE_SIGNATURE` key is ever mutated.
 * @param logger - Logger used to warn about ephemeral key generation.
 * @returns The imported ES256 private key and the matching public JWK.
 */
async function resolveLocalSigningKeyPair(
  localGateway: GatewayIdentity,
  logger: Logger,
): Promise<{ privateKey: CryptoKey; publicJwk: JWK }> {
  const inFlight = inFlightResolutions.get(localGateway);
  if (inFlight !== undefined) {
    return inFlight;
  }

  const resolution = (async (): Promise<{
    privateKey: CryptoKey;
    publicJwk: JWK;
  }> => {
    const privateJwk = localPrivateJwks.get(localGateway);
    let publicJwk =
      localGateway.credentials?.[GatewayCredential.ENVELOPE_SIGNATURE]
        ?.publicKey;

    if (privateJwk === undefined) {
      const generated = await generateSigningKeyPair();
      localPrivateJwks.set(localGateway, generated.privateKey);
      publicJwk = generated.publicKey as unknown as typeof publicJwk;

      localGateway.credentials = {
        ...localGateway.credentials,
        [GatewayCredential.ENVELOPE_SIGNATURE]: {
          purpose: GatewayCredential.ENVELOPE_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.ES256,
          publicKey: generated.publicKey as unknown as Record<string, unknown>,
        },
      };
      logger.warn(
        "no ENVELOPE_SIGNATURE key pair configured; generated an ephemeral " +
          "ES256 key. Counterparties must pin its public JWK (now in this " +
          "gateway identity's ENVELOPE_SIGNATURE credential) to verify " +
          "signed messages; pre-provision the key pair for production use.",
      );
      return {
        privateKey: await importSigningKey(generated.privateKey),
        publicJwk: generated.publicKey,
      };
    }

    if (publicJwk !== undefined) {
      // Validate that the configured public JWK matches the configured
      // private key; a mismatch would sign messages that cannot be verified
      // with the advertised key.
      const derived = await derivePublicJwk(privateJwk);
      if (!publicJwksMatch(derived, publicJwk as unknown as JWK)) {
        throw new Error(
          "ENVELOPE_SIGNATURE key material mismatch: the configured public " +
            "JWK does not match the configured private key. Messages signed " +
            "with this configuration could not be verified by counterparties.",
        );
      }
    } else {
      // Private key provisioned without a public JWK: derive and publish it
      // so counterparties can pin it.
      const derived = await derivePublicJwk(privateJwk);
      publicJwk = derived as unknown as typeof publicJwk;
      localGateway.credentials = {
        ...localGateway.credentials,
        [GatewayCredential.ENVELOPE_SIGNATURE]: {
          purpose: GatewayCredential.ENVELOPE_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.ES256,
          publicKey: derived as unknown as Record<string, unknown>,
        },
      };
    }

    return {
      privateKey: await importSigningKey(privateJwk),
      publicJwk: publicJwk as unknown as JWK,
    };
  })();

  inFlightResolutions.set(localGateway, resolution);
  try {
    return await resolution;
  } finally {
    inFlightResolutions.delete(localGateway);
  }
}

/**
 * Resolve the local gateway's ES256 signing private key.
 *
 * @param localGateway - The local gateway identity.
 * @param logger - Logger used to warn about ephemeral key generation.
 * @returns The imported ES256 private key.
 */
export async function resolveLocalSigningPrivateKey(
  localGateway: GatewayIdentity,
  logger: Logger,
): Promise<CryptoKey> {
  const { privateKey } = await resolveLocalSigningKeyPair(localGateway, logger);
  return privateKey;
}

/**
 * Resolve the local gateway's ES256 public JWK.
 *
 * This is the JWK embedded in outgoing JWS protected headers so that
 * counterparties can detect key substitution against their pinned key.
 *
 * @param localGateway - The local gateway identity.
 * @param logger - Logger used to warn about ephemeral key generation.
 * @returns The public JWK matching the local signing private key.
 */
export async function resolveLocalSigningPublicJwk(
  localGateway: GatewayIdentity,
  logger: Logger,
): Promise<JWK> {
  const { publicJwk } = await resolveLocalSigningKeyPair(localGateway, logger);
  return publicJwk;
}

/**
 * Resolve the ES256 signing public key for a gateway identity.
 *
 * This is the pinned-key lookup used by the verification interceptor: only
 * keys pre-provisioned in a gateway identity (the local gateway or a
 * configured counterparty) are accepted.
 *
 * @param gateway - The gateway identity whose `ENVELOPE_SIGNATURE` public key
 *   to import, or `undefined` when the gateway is unknown.
 * @returns The imported ES256 public key, or `undefined` when the gateway
 *   or its `ENVELOPE_SIGNATURE` public key is unknown.
 */
export async function resolveSigningPublicKey(
  gateway: GatewayIdentity | undefined,
): Promise<CryptoKey | undefined> {
  const publicJwk =
    gateway?.credentials?.[GatewayCredential.ENVELOPE_SIGNATURE]?.publicKey;
  if (publicJwk === undefined) {
    return undefined;
  }
  // TODO: support PEM / hex-encoded ENVELOPE_SIGNATURE keys; JWK only for now.
  return importSigningKey(publicJwk as unknown as JWK);
}
