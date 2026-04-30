import "jest-extended";
import type { Request, Response } from "express";

import { PluginKeychainVault } from "../../../main/typescript/plugin-keychain-vault";
import { DeleteKeychainEntryEndpointV1 } from "../../../main/typescript/web-services/delete-keychain-entry-endpoint-v1";
import { GetKeychainEntryEndpointV1 } from "../../../main/typescript/web-services/get-keychain-entry-endpoint-v1";
import { GetPrometheusExporterMetricsEndpointV1 } from "../../../main/typescript/web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { HasKeychainEntryEndpointV1 } from "../../../main/typescript/web-services/has-keychain-entry-endpoint-v1";

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

function createMockResponse(): Response & MockResponse {
  const res = {} as Response & MockResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("Keychain vault endpoint security regression", () => {
  const leakMarker = "S3CR3T-LEAK-MARKER";

  const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GetKeychainEntryEndpointV1 does not return stack details", async () => {
    const plugin = Object.create(
      PluginKeychainVault.prototype,
    ) as PluginKeychainVault & { get: jest.Mock };
    plugin.get = jest.fn().mockRejectedValue(new Error(`fail ${leakMarker}`));

    const endpoint = new GetKeychainEntryEndpointV1({
      plugin,
      logLevel: "DEBUG",
    });
    (endpoint as unknown as { log: typeof loggerMock }).log = loggerMock;
    const req = { body: { key: "k1" } } as Request;
    const res = createMockResponse();

    await endpoint.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(leakMarker);
  });

  test("HasKeychainEntryEndpointV1 does not return stack details", async () => {
    const plugin = Object.create(
      PluginKeychainVault.prototype,
    ) as PluginKeychainVault & { has: jest.Mock };
    plugin.has = jest.fn().mockRejectedValue(new Error(`fail ${leakMarker}`));

    const endpoint = new HasKeychainEntryEndpointV1({
      plugin,
      logLevel: "DEBUG",
    });
    (endpoint as unknown as { log: typeof loggerMock }).log = loggerMock;
    const req = { body: { key: "k2" } } as Request;
    const res = createMockResponse();

    await endpoint.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(leakMarker);
  });

  test("DeleteKeychainEntryEndpointV1 does not return stack details", async () => {
    const plugin = Object.create(
      PluginKeychainVault.prototype,
    ) as PluginKeychainVault & { delete: jest.Mock };
    plugin.delete = jest
      .fn()
      .mockRejectedValue(new Error(`fail ${leakMarker}`));

    const endpoint = new DeleteKeychainEntryEndpointV1({
      plugin,
      logLevel: "DEBUG",
    });
    (endpoint as unknown as { log: typeof loggerMock }).log = loggerMock;
    const req = { body: { key: "k3" } } as Request;
    const res = createMockResponse();

    await endpoint.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(leakMarker);
  });

  test("GetPrometheusExporterMetricsEndpointV1 does not return stack details", async () => {
    const plugin = Object.create(
      PluginKeychainVault.prototype,
    ) as PluginKeychainVault & { getPrometheusExporterMetrics: jest.Mock };
    plugin.getPrometheusExporterMetrics = jest
      .fn()
      .mockRejectedValue(new Error(`fail ${leakMarker}`));

    const endpoint = new GetPrometheusExporterMetricsEndpointV1({
      plugin,
      logLevel: "DEBUG",
    });
    (endpoint as unknown as { log: typeof loggerMock }).log = loggerMock;
    const req = {} as Request;
    const res = createMockResponse();

    await endpoint.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(leakMarker);
  });
});
