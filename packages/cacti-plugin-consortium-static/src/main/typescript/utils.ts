import {
  generateKeyPair,
  exportJWK,
  jwtVerify,
  importJWK,
  JWK,
  SignJWT,
  KeyLike,
} from "jose";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { v4 as uuidv4 } from "uuid";

export async function generateES256JWK(): Promise<{ pub: JWK; priv: JWK }> {
  // Generate an ES256 (Elliptic Curve using P-256) key pair
  const { publicKey, privateKey } = await generateKeyPair("ES256K");

  // Export the public key as a JWK
  const publicJWK: JWK = await exportJWK(publicKey);

  // Export the private key as a JWK
  const privateJWK: JWK = await exportJWK(privateKey);

  return { pub: publicJWK, priv: privateJWK };
}

export async function verifyOrganization(
  token: string,
  jwk: JWK,
  expectedOrganization: string,
  seenJtis?: Map<string, number>,
): Promise<boolean> {
  try {
    const publicKey: Uint8Array | KeyLike = await importJWK(jwk, "ES256K");

    // jwtVerify throws JWTExpired / JWTInvalid on bad tokens, so no manual expiry check needed
    const { payload } = await jwtVerify(token, publicKey);

    if (payload.iss !== expectedOrganization) {
      return false;
    }

    // jwtVerify does not require exp to be present; reject tokens that omit it
    if (payload.exp === undefined) {
      return false;
    }

    if (seenJtis !== undefined) {
      const { jti } = payload;
      if (!jti) {
        return false;
      }

      // Prune expired entries on each call to prevent unbounded memory growth
      const nowSecs = Math.floor(Date.now() / 1000);
      for (const [key, expiry] of seenJtis) {
        if (expiry <= nowSecs) {
          seenJtis.delete(key);
        }
      }

      // Namespace by issuer: jti uniqueness is only guaranteed within an issuer
      // payload.iss and payload.exp are guaranteed non-undefined at this point
      const cacheKey = `${payload.iss}:${jti}`;
      if (seenJtis.has(cacheKey)) {
        return false;
      }
      seenJtis.set(cacheKey, payload.exp as number);
    }

    return true;
  } catch (_err) {
    return false;
  }
}

interface TokenPayload {
  iss: string; // Issuer (e.g., the issuing authority)
  exp: number; // Expiration time (UNIX timestamp)
  jti?: string; // id of token
}
export async function issueOrgToken(
  jwk: JWK,
  parameters: TokenPayload,
  memberId: string,
  pubKey: string,
): Promise<string> {
  // Import the JWK to get the key object
  const key = await importJWK(jwk, "ES256K");
  const payloadObject = { pubKey, memberId };
  const payload = safeStableStringify(payloadObject);
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const _protected = {
    iat: Date.now(),
    jti: parameters.jti ? parameters.jti : uuidv4(),
    iss: parameters.iss,
    exp: parameters.exp,
  };
  // Create and sign the JWT
  const jwt = await new SignJWT({ data: Array.from(data) })
    .setProtectedHeader({ alg: "ES256K", typ: "JWT" }) // Set the algorithm and token type
    .setExpirationTime(_protected.exp)
    .setIssuer(_protected.iss)
    .setJti(_protected.jti)
    .setIssuedAt(_protected.iat)
    .sign(key); // Sign the JWT with the JWK
  return jwt;
}
