/**
 * JWT + OAuth 2.0 bearer authentication for the Client Application API.
 *
 * Implements token verification for SATP gateway REST endpoints per the
 * OAuth 2.0 Bearer Token Usage profile (RFC 6750): tokens are extracted
 * from the `Authorization: Bearer` header and verified as JWS-compact
 * JWTs. Signature verification supports HS256 (shared secret, the same
 * primitive family as the SATP v13 JWS envelope signing) with standard
 * claim validation (`exp`, `nbf`, `iss`, `aud`).
 *
 * Enable by setting `jwtAuth` on the gateway configuration; the
 * middleware is applied to the Client Application API routes when the
 * gateway registers its web services.
 *
 * @module core/auth/jwt-auth-middleware
 */

import type { NextFunction, Request, Response } from "express";
import { webcrypto } from "node:crypto";

/** Options for the JWT authentication middleware. */
export interface IJwtAuthOptions {
  /** Enable JWT authentication on the Client Application API. */
  enabled: boolean;
  /**
   * HS256 shared secret. Required when enabled; in OAuth 2.0 terms this
   * models a symmetric client credential. For asymmetric IdP tokens
   * (ES256/RS256) use an API gateway / OAuth2 proxy in front of the SATP
   * gateway.
   */
  secret?: string;
  /** Optional issuer (`iss`) claim to enforce. */
  issuer?: string;
  /** Optional audience (`aud`) claim to enforce. */
  audience?: string;
  /**
   * Optional absolute paths to leave unprotected (e.g. health checks).
   * Matched with `startsWith`.
   */
  unprotectedPaths?: string[];
}

const JWT_HEADER = { alg: "HS256", typ: "JWT" } as const;

function base64UrlJsonEncode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function base64UrlJsonDecode<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

/**
 * Sign an HS256 JWT for tests and local tooling.
 *
 * @param payload - The JWT claims set
 * @param secret - The HS256 shared secret
 * @param issuer - Value for the `iss` claim (omitted when undefined)
 * @param audience - Value for the `aud` claim (omitted when undefined)
 * @param expiresInSeconds - Lifetime; negative values produce expired tokens
 */
export async function signTestJwt(
  payload: Record<string, unknown>,
  secret: string,
  issuer?: string,
  audience?: string,
  expiresInSeconds = 300,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = { iat: now, ...payload };
  if (issuer !== undefined) {
    claims.iss = issuer;
  }
  if (audience !== undefined) {
    claims.aud = audience;
  }
  if (expiresInSeconds !== undefined) {
    claims.exp = now + expiresInSeconds;
  }
  const signingInput = `${base64UrlJsonEncode(JWT_HEADER)}.${base64UrlJsonEncode(claims)}`;
  const key = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await webcrypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${Buffer.from(signature).toString("base64url")}`;
}

/**
 * Create an express middleware enforcing JWT bearer authentication.
 *
 * On failure it responds `401` with a JSON problem body; on success it
 * calls `next()`.
 */
export function createJwtAuthMiddleware(options: IJwtAuthOptions) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!options.enabled) {
      next();
      return;
    }

    for (const path of options.unprotectedPaths ?? []) {
      if (req.path.startsWith(path)) {
        next();
        return;
      }
    }

    const unauthorized = (detail: string) => {
      res.status(401).json({
        error: "unauthorized",
        detail,
      });
    };

    if (!options.secret) {
      unauthorized("JWT auth enabled but no secret configured");
      return;
    }

    const header = req.headers["authorization"];
    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      unauthorized("missing or malformed Authorization header");
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    const parts = token.split(".");
    if (parts.length !== 3) {
      unauthorized("malformed JWT");
      return;
    }
    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let jwtHeader: { alg?: string };
    try {
      jwtHeader = base64UrlJsonDecode(encodedHeader);
    } catch {
      unauthorized("malformed JWT header");
      return;
    }
    if (jwtHeader.alg !== JWT_HEADER.alg) {
      unauthorized(`unsupported JWT algorithm: ${jwtHeader.alg ?? "none"}`);
      return;
    }

    const key = await webcrypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(options.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await webcrypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(encodedSignature, "base64url"),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!valid) {
      unauthorized("invalid JWT signature");
      return;
    }

    let claims: Record<string, unknown>;
    try {
      claims = base64UrlJsonDecode(encodedPayload);
    } catch {
      unauthorized("malformed JWT payload");
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === "number" && claims.exp <= nowSeconds) {
      unauthorized("token expired");
      return;
    }
    if (
      typeof claims.nbf === "number" &&
      claims.nbf > nowSeconds + 60 /* small clock skew allowance */
    ) {
      unauthorized("token not yet valid");
      return;
    }
    if (options.issuer !== undefined && claims.iss !== options.issuer) {
      unauthorized("unexpected token issuer");
      return;
    }
    if (
      options.audience !== undefined &&
      claims.aud !== options.audience &&
      !(
        Array.isArray(claims.aud) &&
        (claims.aud as string[]).includes(options.audience)
      )
    ) {
      unauthorized("unexpected token audience");
      return;
    }

    // Expose the authenticated subject to downstream handlers.
    (req as Request & { satpClientId?: unknown }).satpClientId = claims.sub;
    next();
  };
}
