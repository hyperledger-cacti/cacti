/**
 * ES256 signing-key resolution for SATP gateways.
 *
 * Bridges a {@link GatewayIdentity}'s `ENVELOPE_SIGNATURE` key material (JWK)
 * to the WebCrypto {@link CryptoKey} handles consumed by the JWS signing and
 * verification interceptors in `./jws-interceptors`.
 *
 * Private key material generated here is kept in non-exported module state
 * keyed by the identity object — it is NEVER written onto the
 * `GatewayIdentity`, which is exposed through `SATPGateway.Identity` and
 * must only ever carry public key material.
 *
 * @module core/cryptography/signing-keys
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
  type CryptoKey,
  type JWK,
} from "./jws-utils";

/**
 * Non-exported private key material for locally generated ES256 keys,
 * keyed by the gateway identity object that owns the key. Never exposed
 * through the identity or any serialized gateway state.
 */
const localPrivateJwks = new WeakMap<GatewayIdentity, JWK>();

/**
 * Resolve the local gateway's ES256 signing key pair.
 *
 * Prefers the `ENVELOPE_SIGNATURE` key from `localGateway`. When none is
 * configured, an ephemeral ES256 key pair is generated: the private JWK is
 * retained in non-exported module state and only the public JWK is written
 * to the identity, so it can be advertised and embedded in JWS headers
 * while the signing secret stays private.
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
  let privateJwk =
    localGateway.credentials?.[GatewayCredential.ENVELOPE_SIGNATURE]
      ?.privateKey;
  let publicJwk =
    localGateway.credentials?.[GatewayCredential.ENVELOPE_SIGNATURE]?.publicKey;

  if (privateJwk === undefined) {
    const cached = localPrivateJwks.get(localGateway);
    if (cached !== undefined && publicJwk !== undefined) {
      return {
        privateKey: await importSigningKey(cached),
        publicJwk: publicJwk as unknown as JWK,
      };
    }

    const generated = await generateSigningKeyPair();
    privateJwk = generated.privateKey as unknown as typeof privateJwk;
    publicJwk = generated.publicKey as unknown as typeof publicJwk;
    localPrivateJwks.set(localGateway, generated.privateKey);

    localGateway.credentials = {
      ...localGateway.credentials,
      [GatewayCredential.ENVELOPE_SIGNATURE]: {
        purpose: GatewayCredential.ENVELOPE_SIGNATURE,
        algorithm: SupportedSigningAlgorithms.ES256,
        publicKey: generated.publicKey as unknown as Record<string, unknown>,
      },
    };
    logger.warn(
      "no ENVELOPE_SIGNATURE key configured; generated an ephemeral ES256 " +
        "key. Its public JWK is embedded in outgoing JWS headers so " +
        "counterparties can verify signatures; pre-provision the key for " +
        "pinning.",
    );
  }

  return {
    privateKey: await importSigningKey(privateJwk as unknown as JWK),
    publicJwk: publicJwk as unknown as JWK,
  };
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
 * counterparties without a pre-provisioned key can still verify signatures.
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
