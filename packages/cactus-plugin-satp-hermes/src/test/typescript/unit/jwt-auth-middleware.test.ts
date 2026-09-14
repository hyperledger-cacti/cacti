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

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader === undefined ? {} : { authorization: authHeader },
    path: "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact",
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
