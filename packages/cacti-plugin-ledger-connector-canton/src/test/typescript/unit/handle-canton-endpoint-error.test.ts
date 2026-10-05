import {
  BadRequestError,
  ForbiddenError,
  GatewayTimeoutError,
  PayloadTooLargeError,
  ServiceUnavailableError,
} from "http-errors-enhanced-cjs";

import { CantonLedgerError } from "../../../main/typescript/canton-ledger-error";
import { handleCantonEndpointError } from "../../../main/typescript/web-services/handle-canton-endpoint-error";

function createResponseMock() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const log = { debug: jest.fn(), error: jest.fn() };
  return { json, status, log };
}

describe("handleCantonEndpointError", () => {
  test("does not serialize or log raw SDK error details", () => {
    const toJSON = jest.fn(() => ({
      headers: { Authorization: "Bearer must-not-leak" },
      token: "must-not-leak",
      clientSecret: "must-not-leak",
    }));
    const error = Object.assign(new Error("must-not-leak"), { toJSON });
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const log = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    handleCantonEndpointError({
      error,
      errorMsg: "transaction failed",
      log: log as never,
      res: { status } as never,
    });

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({
      message: "Canton ledger operation failed.",
    });
    expect(toJSON).not.toHaveBeenCalled();
    expect(JSON.stringify(log.error.mock.calls)).not.toContain("must-not-leak");
  });

  test.each([
    { error: new BadRequestError("bad request"), status: 400 },
    { error: new ForbiddenError("forbidden"), status: 403 },
    { error: new PayloadTooLargeError("too large"), status: 413 },
    { error: new ServiceUnavailableError("shut down"), status: 503 },
    { error: new GatewayTimeoutError("timed out"), status: 504 },
  ])(
    "returns connector error $status with its message",
    ({ error, status }) => {
      const { json, status: statusFn, log } = createResponseMock();

      handleCantonEndpointError({
        error,
        errorMsg: "operation failed",
        log: log as never,
        res: { status: statusFn } as never,
      });

      expect(statusFn).toHaveBeenCalledWith(status);
      expect(json).toHaveBeenCalledWith({ message: error.message });
      expect(log.error).not.toHaveBeenCalled();
    },
  );

  test("returns a Canton ledger rejection with its constant error code only", () => {
    const { json, status, log } = createResponseMock();

    handleCantonEndpointError({
      error: new CantonLedgerError(409, "Already exists.", "DUPLICATE_COMMAND"),
      errorMsg: "transaction failed",
      log: log as never,
      res: { status } as never,
    });

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      message: "Already exists.",
      cantonErrorCode: "DUPLICATE_COMMAND",
    });
    expect(log.error).not.toHaveBeenCalled();
  });
});
