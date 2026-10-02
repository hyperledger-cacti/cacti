import { handleCantonEndpointError } from "../../../main/typescript/web-services/handle-canton-endpoint-error";

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
});
