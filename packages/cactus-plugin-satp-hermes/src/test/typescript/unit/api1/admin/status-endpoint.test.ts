/**
 * Unit tests for GetStatusEndpointV1 HTTP status mapping.
 *
 * Covers OpenAPI-aligned responses for missing SessionID (400), unknown
 * session (404), successful lookup (200), and unexpected failures (500).
 */
import type { Request, Response } from "express";
import { GetStatusEndpointV1 } from "../../../../../main/typescript/api1/admin/status-endpoint";
import { SessionNotFoundError } from "../../../../../main/typescript/core/errors/satp-errors";
import type { IRequestOptions } from "../../../../../main/typescript/core/types";
import type { BLODispatcher } from "../../../../../main/typescript/api1/dispatcher";

function makeReq(sessionID?: string): Request {
  const query =
    sessionID === undefined ? {} : { SessionID: sessionID };
  return { query } as unknown as Request;
}

function makeRes(): {
  res: Response;
  getStatus: () => number;
  getBody: () => unknown;
} {
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
  return {
    res,
    getStatus: () => state.status,
    getBody: () => state.body,
  };
}

function makeEndpoint(
  getStatusImpl: BLODispatcher["GetStatus"],
): GetStatusEndpointV1 {
  const dispatcher = {
    GetStatus: getStatusImpl,
  } as unknown as BLODispatcher;
  const options: IRequestOptions = {
    dispatcher,
    logLevel: "ERROR",
  };
  return new GetStatusEndpointV1(options);
}

describe("GetStatusEndpointV1", () => {
  it("returns 400 when SessionID query parameter is missing", async () => {
    const endpoint = makeEndpoint(async () => {
      throw new Error("GetStatus should not be called");
    });
    const { res, getStatus, getBody } = makeRes();

    await endpoint.handleRequest(makeReq(), res);

    expect(getStatus()).toBe(400);
    expect(getBody()).toEqual({
      message: "SessionID query parameter is required.",
    });
  });

  it("returns 404 when the session ID is unknown", async () => {
    const endpoint = makeEndpoint(async () => {
      throw new SessionNotFoundError("does-not-exist");
    });
    const { res, getStatus, getBody } = makeRes();

    await endpoint.handleRequest(makeReq("does-not-exist"), res);

    expect(getStatus()).toBe(404);
    const body = getBody() as { message: string; error: string };
    expect(body.message).toBe("NotFound");
    expect(body.error).toContain("does-not-exist");
  });

  it("returns 200 with the status payload for a known session", async () => {
    const payload = {
      status: "DONE",
      sessionID: "session-123",
    };
    const endpoint = makeEndpoint(async () => payload as never);
    const { res, getStatus, getBody } = makeRes();

    await endpoint.handleRequest(makeReq("session-123"), res);

    expect(getStatus()).toBe(200);
    expect(getBody()).toEqual(payload);
  });

  it("returns 500 for unexpected errors", async () => {
    const endpoint = makeEndpoint(async () => {
      throw new Error("boom");
    });
    const { res, getStatus, getBody } = makeRes();

    await endpoint.handleRequest(makeReq("session-123"), res);

    expect(getStatus()).toBe(500);
    const body = getBody() as { message: string };
    expect(body.message).toBe("InternalServerError");
  });
});
