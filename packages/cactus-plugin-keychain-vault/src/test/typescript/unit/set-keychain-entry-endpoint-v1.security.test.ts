import "jest-extended";
import type { Request, Response } from "express";

import { LoggerProvider } from "@hyperledger/cactus-common";

import { PluginKeychainVault } from "../../../main/typescript/plugin-keychain-vault";
import { SetKeychainEntryEndpointV1 } from "../../../main/typescript/web-services/set-keychain-entry-endpoint-v1";

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

function createMockResponse(): Response & MockResponse {
  const res = {} as Response & MockResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("SetKeychainEntryEndpointV1 security regression", () => {
  const key = "sample-key";
  const secretValue = "super-secret-value";

  const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(LoggerProvider, "getOrCreate")
      .mockReturnValue(
        loggerMock as unknown as ReturnType<typeof LoggerProvider.getOrCreate>,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("does not leak secret in logs and does not return stack trace on error", async () => {
    const plugin = Object.create(
      PluginKeychainVault.prototype,
    ) as PluginKeychainVault & {
      set: jest.Mock;
    };
    plugin.set = jest
      .fn()
      .mockRejectedValue(new Error(`backend failure for ${secretValue}`));

    const endpoint = new SetKeychainEntryEndpointV1({
      plugin,
      logLevel: "DEBUG",
    });

    const req = {
      body: { key, value: secretValue },
    } as Request;
    const res = createMockResponse();

    await endpoint.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });

    const loggedCalls = JSON.stringify([
      ...loggerMock.debug.mock.calls,
      ...loggerMock.error.mock.calls,
    ]);
    expect(loggedCalls).not.toContain(secretValue);

    const responseBody = JSON.stringify(res.json.mock.calls[0][0]);
    expect(responseBody).not.toContain(secretValue);
    expect(responseBody).not.toContain("stack");
  });
});
