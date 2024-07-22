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
): Promise<string | boolean> {
  try {
    // Import the JWK as a public key
    const publicKey: Uint8Array | KeyLike = await importJWK(jwk, "ES256K");

    // Verify the JWT using the public key
    const { payload } = await jwtVerify(token, publicKey);

    // Check if the organization name matches
    if (payload.iss !== expectedOrganization) {
      return false;
    }

    //TODO: verify payload.jti against remote log of the organization.
    if (!payload.exp) {
      return "Your token does not have an expiration date.";
    }
    if (payload.exp < Date.now()) {
      return "The token has expired";
    }

    return true;
  } catch (err) {
    console.error(err);
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
