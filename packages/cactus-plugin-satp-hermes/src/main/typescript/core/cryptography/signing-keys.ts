/**
 * ES256 signing-key resolution for SATP gateways.
 *
 * Bridges a {@link GatewayIdentity}'s `SIGNATURE` key material (JWK) to the
 * WebCrypto {@link CryptoKey} handles consumed by the JWS signing and
 * verification interceptors in `./jws-interceptors`.
 *
 * @module core/cryptography/signing-keys
 * @see ./jws-utils
 * @see ./jws-interceptors
 */

import {
  GatewayIdentity,
  GatewayKeyPurpose,
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
 * Resolve the local gateway's ES256 signing private key.
 *
 * Prefers the `SIGNATURE` key from `localGateway`. When none is configured,
 * an ephemeral ES256 key pair is generated and stored on the identity so
 * its public key can be distributed; a warning is logged because
 * counterparties cannot verify signatures until that public key is shared.
 *
 * @param localGateway - The local gateway identity; mutated in place when
 *   an ephemeral key is generated.
 * @param logger - Logger used to warn about ephemeral key generation.
 * @returns The imported ES256 private key.
 */
export async function resolveLocalSigningPrivateKey(
  localGateway: GatewayIdentity,
  logger: Logger,
): Promise<CryptoKey> {
  let privateJwk = localGateway.keys?.[GatewayKeyPurpose.SIGNATURE]?.privateKey;
  if (privateJwk === undefined) {
    const { publicKey, privateKey } = await generateSigningKeyPair();
    localGateway.keys = {
      ...localGateway.keys,
      [GatewayKeyPurpose.SIGNATURE]: {
        purpose: GatewayKeyPurpose.SIGNATURE,
        algorithm: SupportedSigningAlgorithms.ES256,
        publicKey: publicKey as unknown as Record<string, unknown>,
        privateKey: privateKey as unknown as Record<string, unknown>,
      },
    };
    privateJwk = privateKey as unknown as Record<string, unknown>;
    logger.warn(
      "no SIGNATURE key configured; generated an ephemeral ES256 key. " +
        "Counterparty gateways cannot verify this gateway's signatures " +
        "until its public SIGNATURE key is distributed.",
    );
  }
  // TODO: support PEM / hex-encoded SIGNATURE keys; JWK only for now.
  return importSigningKey(privateJwk as unknown as JWK);
}

/**
 * Resolve the ES256 signing public key for a gateway identity.
 *
 * @param gateway - The gateway identity whose `SIGNATURE` public key to
 *   import, or `undefined` when the gateway is unknown.
 * @returns The imported ES256 public key, or `undefined` when the gateway
 *   or its `SIGNATURE` public key is unknown.
 */
export async function resolveSigningPublicKey(
  gateway: GatewayIdentity | undefined,
): Promise<CryptoKey | undefined> {
  const publicJwk = gateway?.keys?.[GatewayKeyPurpose.SIGNATURE]?.publicKey;
  if (publicJwk === undefined) {
    return undefined;
  }
  // TODO: support PEM / hex-encoded SIGNATURE keys; JWK only for now.
  return importSigningKey(publicJwk as unknown as JWK);
}
