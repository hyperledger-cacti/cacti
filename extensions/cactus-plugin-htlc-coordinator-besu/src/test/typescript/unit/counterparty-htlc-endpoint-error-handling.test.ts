import "jest-extended";
import type { Request, Response } from "express";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { CounterpartyHTLCEndpoint } from "../../../main/typescript/web-services/counterparty-htlc-endpoint";

const PACKAGE_NAME = "@hyperledger-cacti/cactus-plugin-htlc-coordinator-besu";

/**
 * Tests that the counterparty-htlc endpoint does not echo exception details
 * (message or stack trace) back to the HTTP caller when the connector
 * crashes - the detailed error must stay in the server-side log only.
 */
describe("CounterpartyHTLCEndpoint error handling", () => {
  const makeEndpoint = (connectorImpl: () => Promise<unknown>) => {
    const mockPlugin = {
      getPackageName: () => PACKAGE_NAME,
      counterpartyHTLC: connectorImpl,
    };
    return new CounterpartyHTLCEndpoint({
      pluginRegistry: new PluginRegistry({ plugins: [mockPlugin as any] }),
      logLevel: "SILENT",
    });
  };

  const makeRes = () =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    }) as unknown as Response & { status: jest.Mock; json: jest.Mock };

  const makeReq = (): Request =>
    ({
      body: { contractAddress: "0xabc" },
    }) as unknown as Request;

  test("omits exception details from the response body on a crash", async () => {
    const crash = new Error("BOOM: secret internal detail from the ledger");
    crash.stack =
      "Error: BOOM: secret internal detail from the ledger\n" +
      "    at SECRET_STACK_TOKEN (/only/known/internally/handler.ts:1:1)";

    const endpoint = makeEndpoint(() => Promise.reject(crash));
    const res = makeRes();

    await endpoint.handleRequest(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledTimes(1);

    const body = res.json.mock.calls[0][0];
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("BOOM");
    expect(serialized).not.toContain("SECRET_STACK_TOKEN");
    expect(body.message).toBe("Internal Server Error");
  });

  test("still forwards a successful connector response untouched", async () => {
    const resBody = { txId: "0xdeadbeef" };
    const endpoint = makeEndpoint(() => Promise.resolve(resBody));
    const res = makeRes();

    await endpoint.handleRequest(makeReq(), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(resBody);
  });
});
