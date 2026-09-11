/**
 * Unit tests for the JWT bearer authentication middleware.
 *
 * Verifies JWT + OAuth 2.0 bearer-token authentication for the Client
 * Application API: signature verification (HS256), standard claim checks
 * (exp, nbf, iss, aud) and correct 401 handling.
 */
import type { NextFunction, Request, Response } from "express";
import {
  createJwtAuthMiddleware,
  signTestJwt,
  type IJwtAuthOptions,
} from "../../../main/typescript/core/authentication/jwt-auth-middleware";

function makeReq(authHeader?: string, path?: string): Request {
  return {
    headers: authHeader === undefined ? {} : { authorization: authHeader },
    path:
      path ?? "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact",
  } as unknown as Request;
}

function makeRes(): { res: Response; getStatus: () => number } {
  const state = { status: 0, body: undefined as unknown };
  const res = {
    status(code: number) {
      state.status = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, getStatus: () => state.status };
}

async function runMiddleware(
  middleware: ReturnType<typeof createJwtAuthMiddleware>,
  req: Request,
): Promise<{ calledNext: boolean; status: number }> {
  let calledNext = false;
  const { res, getStatus } = makeRes();
  try {
    await middleware(req, res, (() => {
      calledNext = true;
    }) as NextFunction);
  } catch {
    // middleware signaled an error response
  }
  return { calledNext, status: getStatus() };
}

const SECRET = "test-secret-key-for-hs256";

const BASE_OPTIONS: IJwtAuthOptions = {
  enabled: true,
  issuer: "https://issuer.example.com",
  audience: "satp-gateway",
  secret: SECRET,
};

describe("JWT auth middleware", () => {
  it("passes through when disabled", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      enabled: false,
    });
    const result = await runMiddleware(middleware, makeReq());
    expect(result.calledNext).toBe(true);
  });

  it("rejects a request with no Authorization header (401)", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const result = await runMiddleware(middleware, makeReq());
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects a non-Bearer Authorization header (401)", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const result = await runMiddleware(middleware, makeReq("Basic abc"));
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });

  it("accepts a valid HS256 token with matching claims", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const token = await signTestJwt(
      { sub: "client-app" },
      SECRET,
      BASE_OPTIONS.issuer,
      BASE_OPTIONS.audience,
    );
    const result = await runMiddleware(middleware, makeReq(`Bearer ${token}`));
    expect(result.calledNext).toBe(true);
  });

  it("rejects a token signed with the wrong secret (401)", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const token = await signTestJwt(
      {},
      "wrong-secret",
      BASE_OPTIONS.issuer,
      BASE_OPTIONS.audience,
    );
    const result = await runMiddleware(middleware, makeReq(`Bearer ${token}`));
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects an expired token (401)", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const token = await signTestJwt(
      {},
      SECRET,
      BASE_OPTIONS.issuer,
      BASE_OPTIONS.audience,
      -60,
    );
    const result = await runMiddleware(middleware, makeReq(`Bearer ${token}`));
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects a token from an unexpected issuer (401)", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const token = await signTestJwt(
      {},
      SECRET,
      "https://evil.example.com",
      BASE_OPTIONS.audience,
    );
    const result = await runMiddleware(middleware, makeReq(`Bearer ${token}`));
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects a token with an unexpected audience (401)", async () => {
    const middleware = createJwtAuthMiddleware(BASE_OPTIONS);
    const token = await signTestJwt(
      {},
      SECRET,
      BASE_OPTIONS.issuer,
      "other-audience",
    );
    const result = await runMiddleware(middleware, makeReq(`Bearer ${token}`));
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe("JWT auth middleware unprotected paths (exact match)", () => {
  it("exempts an exact configured path without a token", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      unprotectedPaths: ["/health"],
    });
    const result = await runMiddleware(
      middleware,
      makeReq(undefined, "/health"),
    );
    expect(result.calledNext).toBe(true);
  });

  it("does NOT exempt /health-admin when only /health is listed", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      unprotectedPaths: ["/health"],
    });
    const result = await runMiddleware(
      middleware,
      makeReq(undefined, "/health-admin"),
    );
    expect(result.calledNext).toBe(false);
    expect(result.status).toBe(401);
  });

  it("does NOT exempt deeper paths under a configured path", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      unprotectedPaths: ["/health"],
    });
    for (const path of ["/health/live", "/healthcheck", "/api/health"]) {
      const result = await runMiddleware(middleware, makeReq(undefined, path));
      expect(result.calledNext).toBe(false);
      expect(result.status).toBe(401);
    }
  });

  it("still requires a valid JWT on non-exempt paths", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      unprotectedPaths: ["/health"],
    });
    const token = await signTestJwt(
      { sub: "client-app" },
      SECRET,
      BASE_OPTIONS.issuer,
      BASE_OPTIONS.audience,
    );
    // Business API: no exemption even though it shares no prefix here.
    const business = await runMiddleware(
      middleware,
      makeReq(
        `Bearer ${token}`,
        "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact",
      ),
    );
    expect(business.calledNext).toBe(true);

    // Missing token on a non-exempt path is still rejected.
    const noToken = await runMiddleware(
      middleware,
      makeReq(
        undefined,
        "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact",
      ),
    );
    expect(noToken.calledNext).toBe(false);
    expect(noToken.status).toBe(401);
  });

  it("normalizes a trailing slash: /health/ matches configured /health", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      unprotectedPaths: ["/health"],
    });
    const result = await runMiddleware(
      middleware,
      makeReq(undefined, "/health/"),
    );
    expect(result.calledNext).toBe(true);
  });

  it("matches symmetrically when the configured path has the trailing slash", async () => {
    const middleware = createJwtAuthMiddleware({
      ...BASE_OPTIONS,
      unprotectedPaths: ["/health/"],
    });
    const withoutSlash = await runMiddleware(
      middleware,
      makeReq(undefined, "/health"),
    );
    expect(withoutSlash.calledNext).toBe(true);
    // Trailing-slash normalization is single-slash only; a deeper path
    // is never swallowed by the normalization.
    const deeper = await runMiddleware(
      middleware,
      makeReq(undefined, "/health//"),
    );
    expect(deeper.calledNext).toBe(false);
    expect(deeper.status).toBe(401);
  });
});
