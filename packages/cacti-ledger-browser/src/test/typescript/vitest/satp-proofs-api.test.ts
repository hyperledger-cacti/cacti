/**
 * `GET /proofs` client: request shape, response hardening and the
 * "endpoint not supported" (404) path for older gateways.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";

import {
  SatpGatewayAdminApi,
  fetchSessionProofs,
} from "../../../main/typescript/apps/satp/api";

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn() },
  };
});

const get = vi.mocked(axios.get);

function httpError(status: number) {
  return new AxiosError(
    "request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status,
      statusText: String(status),
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

const VALID = {
  sessionId: "s-1",
  step: { tag: "lockAsset", description: "lock", role: "client", sequence: 3 },
  claim: "{}",
  signedClaim: "0x5e1a",
};

describe("fetchSessionProofs", () => {
  beforeEach(() => get.mockReset());

  it("calls /proofs with comma-separated session IDs on the gateway", async () => {
    get.mockResolvedValue({ data: { proofs: [VALID] } });
    const api = new SatpGatewayAdminApi({ basePath: "http://gw.test:4010" });

    await expect(fetchSessionProofs(api, ["s-1", "s-2"])).resolves.toEqual([
      VALID,
    ]);
    expect(get).toHaveBeenCalledWith(
      "http://gw.test:4010/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/proofs",
      expect.objectContaining({ params: { sessionIds: "s-1,s-2" } }),
    );
  });

  it("drops malformed proofs from untrusted gateway data", async () => {
    get.mockResolvedValue({
      data: {
        proofs: [
          VALID,
          { ...VALID, claim: 42 },
          { ...VALID, step: null },
          "junk",
          null,
        ],
      },
    });
    const api = new SatpGatewayAdminApi({ basePath: "http://gw.test" });
    await expect(fetchSessionProofs(api, ["s-1"])).resolves.toEqual([VALID]);
  });

  it("returns [] for a response without a proofs array", async () => {
    get.mockResolvedValue({ data: { proofs: "nope" } });
    const api = new SatpGatewayAdminApi({ basePath: "http://gw.test" });
    await expect(fetchSessionProofs(api, ["s-1"])).resolves.toEqual([]);
  });

  /** API stub whose `/proofs` call fails with the given HTTP status. */
  function failingApi(status: number): SatpGatewayAdminApi {
    return {
      getSessionProofs: () => Promise.reject(httpError(status)),
    } as unknown as SatpGatewayAdminApi;
  }

  it("returns null when the gateway has no /proofs endpoint (404)", async () => {
    await expect(
      fetchSessionProofs(failingApi(404), ["s-1"]),
    ).resolves.toBeNull();
  });

  it("rethrows other errors so the view can show them", async () => {
    await expect(fetchSessionProofs(failingApi(500), ["s-1"])).rejects.toThrow(
      "request failed",
    );
  });
});
