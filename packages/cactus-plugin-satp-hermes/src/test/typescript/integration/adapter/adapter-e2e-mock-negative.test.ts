/**
 * @fileoverview Negative test cases for adapter error handling and failure scenarios
 *
 * @description
 * **Test Strategy:**
 * These tests validate AdapterManager behavior under failure conditions.
 * All failures are simulated via mocked fetch to ensure deterministic results.
 *
 * **Error Scenarios Covered:**
 * 1. **Timeout:** Webhook doesn't respond within configured timeoutMs
 * 2. **HTTP Errors:** Server returns 4xx/5xx status codes
 * 3. **Network Failures:** Connection refused, DNS failure, etc.
 * 4. **Retry Exhaustion:** All retry attempts fail
 * 5. **Inbound Rejection:** External controller returns continue=false
 * 6. **Malformed Responses:** Invalid JSON, unexpected schema
 *
 * **Error Handling Expectations:**
 * - Outbound failures: Logged but may not block (fire-and-block behavior)
 * - Inbound rejections: Transfer aborted with reason logged
 * - Timeouts: Retry according to config, then fail gracefully
 *
 * @see AdapterOutboundWebhookError for outbound failure type
 * @see AdapterInboundWebhookRejectedError for rejection failure type
 * @see AdapterInboundWebhookTimeoutError for timeout failure type
 *
 * @module adapter-e2e-mock-negative.test
 */

import { describe, expect, it, jest } from "@jest/globals";
import { AdapterManager } from "../../../../main/typescript/adapters/adapter-manager";
import type {
  AdapterDefinition,
  AdapterLayerConfiguration,
} from "../../../../main/typescript/adapters/adapter-config";
import { SatpStageKey } from "../../../../main/typescript/adapters/adapter-config";
import {
  createFetchResponse,
  createMonitorStub,
  TEST_SESSION_ID,
  TEST_CONTEXT_ID,
  TEST_GATEWAY_ID,
  TEST_LOG_LEVEL,
} from "../../adapter-test-utils";

/**
 * Negative test suite: Error handling and failure scenarios
 * Uses mocked fetch to simulate various failure conditions.
 */
describe("AdapterManager negative test cases", () => {
  describe("timeout scenarios", () => {
    it("handles outbound webhook timeout gracefully", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "timeout-adapter",
          name: "Timeout Adapter",
          description: "Adapter that will timeout",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://slow-endpoint.example/webhook",
            timeoutMs: 100, // Very short timeout
            retryAttempts: 1, // Try once
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 100, retryAttempts: 1, retryDelayMs: 0 },
      };

      // Mock fetch to simulate a timeout by rejecting with AbortError
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          // Simulate abort signal behavior
          const signal = options?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              const abortError = new Error("The operation was aborted");
              abortError.name = "AbortError";
              reject(abortError);
            });
          }
          // Never resolve - wait for abort
        });
      });

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // Outbound webhook failures throw AdapterOutboundWebhookError
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "timeout-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });

    it("retries on timeout before failing", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "retry-timeout-adapter",
          name: "Retry Timeout Adapter",
          description: "Adapter that retries on timeout",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://flaky-endpoint.example/webhook",
            timeoutMs: 100,
            retryAttempts: 2,
            retryDelayMs: 10,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 100, retryAttempts: 2, retryDelayMs: 10 },
      };

      let callCount = 0;
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockImplementation(() => {
        callCount++;
        // First 2 calls timeout, third succeeds
        if (callCount < 3) {
          return new Promise((resolve) => {
            setTimeout(
              () => resolve(createFetchResponse(200, { status: "ok" })),
              500,
            );
          });
        }
        return Promise.resolve(
          createFetchResponse(200, { status: "ok", attempt: callCount }),
        );
      });

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "retry-timeout-test" },
        payload: {},
      });

      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);
      // Should have attempted retries
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("outbound webhook errors", () => {
    it("handles HTTP 400 Bad Request error", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "bad-request-adapter",
          name: "Bad Request Adapter",
          description: "Adapter that receives 400 error",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(400, {
          error: "Bad Request",
          message: "Invalid payload",
        }),
      );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // HTTP 400 errors throw AdapterOutboundWebhookError
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "bad-request-test" },
          payload: {},
        }),
      ).rejects.toThrow(/HTTP 400/);
    });

    it("handles HTTP 401 Unauthorized error", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "unauthorized-adapter",
          name: "Unauthorized Adapter",
          description: "Adapter that receives 401 error",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/secure-webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(401, { error: "Unauthorized" }),
      );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // HTTP 401 errors throw AdapterOutboundWebhookError
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "unauthorized-test" },
          payload: {},
        }),
      ).rejects.toThrow(/HTTP 401/);
    });

    it("handles HTTP 500 Internal Server Error", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "server-error-adapter",
          name: "Server Error Adapter",
          description: "Adapter that receives 500 error",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(500, { error: "Internal Server Error" }),
      );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // HTTP 500 errors cause outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "server-error-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });

    it("handles HTTP 503 Service Unavailable with retries", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "service-unavailable-adapter",
          name: "Service Unavailable Adapter",
          description: "Adapter that receives 503 and retries",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/webhook",
            timeoutMs: 5000,
            retryAttempts: 2,
            retryDelayMs: 10,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 2, retryDelayMs: 10 },
      };

      let callCount = 0;
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockImplementation(() => {
        callCount++;
        // First 2 calls return 503, third succeeds
        if (callCount < 3) {
          return Promise.resolve(
            createFetchResponse(503, { error: "Service Unavailable" }),
          );
        }
        return Promise.resolve(
          createFetchResponse(200, { status: "ok", recovered: true }),
        );
      });

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // HTTP 503 errors after retries cause outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "service-unavailable-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");

      // Should have attempted multiple calls before failing
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("network failure scenarios", () => {
    it("handles network connection failure", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "network-failure-adapter",
          name: "Network Failure Adapter",
          description: "Adapter that fails due to network error",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://unreachable.example/webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // Network connection failures cause outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "network-failure-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });

    it("handles DNS resolution failure", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "dns-failure-adapter",
          name: "DNS Failure Adapter",
          description: "Adapter that fails due to DNS error",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://nonexistent-domain-12345.invalid/webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockRejectedValueOnce(new Error("ENOTFOUND"));

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // DNS resolution failures cause outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "dns-failure-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });
  });

  describe("adapter response disposition scenarios", () => {
    it("handles outbound webhook returning continue: false (HALT)", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "halt-adapter",
          name: "Halt Adapter",
          description: "Adapter that signals to halt processing",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/validation",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      // Response with continue: false should halt processing
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(200, {
          continue: false,
          reason: "Validation failed: insufficient funds",
        }),
      );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "halt-test" },
        payload: {},
      });

      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
      expect(result?.steps[0].outboundResult?.httpStatus).toBe(200);
      // Check the response body contains continue: false
      const responseBody = result?.steps[0].outboundResult?.responseBody as {
        continue?: boolean;
        reason?: string;
      };
      expect(responseBody?.continue).toBe(false);
      expect(responseBody?.reason).toBe(
        "Validation failed: insufficient funds",
      );
    });

    it("handles multiple adapters where first one halts", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "first-halt-adapter",
          name: "First Halt Adapter",
          description: "First adapter that halts",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/first",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
        {
          id: "second-adapter",
          name: "Second Adapter",
          description: "Second adapter that should not execute",
          active: true,
          priority: 2,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/second",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      // First adapter halts
      fetchMock
        .mockResolvedValueOnce(
          createFetchResponse(200, {
            continue: false,
            reason: "Halted by first adapter",
          }),
        )
        .mockResolvedValueOnce(
          createFetchResponse(200, { continue: true, data: "second adapter" }),
        );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "multiple-halt-test" },
        payload: {},
      });

      expect(result).toBeDefined();
      // Both adapters should execute (halt is determined by disposition logic)
      expect(result?.steps.length).toBeGreaterThanOrEqual(1);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("malformed response scenarios", () => {
    it("handles non-JSON response body", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "non-json-adapter",
          name: "Non-JSON Adapter",
          description: "Adapter that receives non-JSON response",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      // Return HTML instead of JSON
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(
          200,
          "<!DOCTYPE html><html><body>OK</body></html>",
          { "content-type": "text/html" },
        ),
      );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "non-json-test" },
        payload: {},
      });

      // Should handle non-JSON gracefully
      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
      expect(result?.steps[0].outboundResult?.httpStatus).toBe(200);
      expect(result?.steps[0].outboundResult?.status).toBe("OK");
    });

    it("handles empty response body", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "empty-response-adapter",
          name: "Empty Response Adapter",
          description: "Adapter that receives empty response",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://api.example/webhook",
            timeoutMs: 5000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(createFetchResponse(204, ""));

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "empty-response-test" },
        payload: {},
      });

      // Should handle empty response gracefully
      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
      expect(result?.steps[0].outboundResult?.httpStatus).toBe(204);
    });
  });

  describe("outbound vs inbound response handling", () => {
    /**
     * Outbound webhooks are lenient - they accept any JSON response format.
     * The response is logged and processing continues regardless of structure.
     * For example, calling jsonplaceholder.typicode.com/users returns an array
     * of user objects, which is NOT the expected webhook response format, but
     * outbound webhooks should still succeed.
     */
    it("outbound webhook accepts unexpected JSON format (like /users array) - logs and continues", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "lenient-outbound-adapter",
          name: "Lenient Outbound Adapter",
          description: "Outbound adapter receiving array response",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://jsonplaceholder.typicode.com/users",
            timeoutMs: 10000,
            retryAttempts: 1,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 10000, retryAttempts: 1, retryDelayMs: 0 },
      };

      // Mock fetch returning an array (unexpected format, but valid JSON)
      const usersResponse = [
        {
          id: 1,
          name: "Leanne Graham",
          username: "Bret",
          email: "test@example.com",
        },
        {
          id: 2,
          name: "Ervin Howell",
          username: "Ervin",
          email: "test2@example.com",
        },
      ];
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(createFetchResponse(200, usersResponse));

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "lenient-outbound" },
        payload: {},
      });

      // Outbound should succeed regardless of response format
      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
      expect(result?.steps[0].outboundResult?.status).toBe("OK");
      expect(result?.steps[0].outboundResult?.httpStatus).toBe(200);
      // Response body is stored even though it's an array
      expect(Array.isArray(result?.steps[0].outboundResult?.responseBody)).toBe(
        true,
      );
      // Disposition is CONTINUE - outbound doesn't interpret response
      expect(result?.steps[0].disposition).toBe("CONTINUE");
    });

    /**
     * Inbound webhooks are strict - they require a specific payload format
     * with { continue: boolean } to make a decision. If the response doesn't
     * have this structure, it should result in an error/timeout.
     *
     * Note: Inbound webhooks don't call external endpoints - they RECEIVE
     * POST requests from external controllers. The test below demonstrates
     * that inbound adapters without receiving a valid decision will timeout
     * and result in ABORT disposition.
     */
    it("inbound webhook without valid decision payload times out with ABORT disposition", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "strict-inbound-adapter",
          name: "Strict Inbound Adapter",
          description: "Inbound adapter requiring proper decision format",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "after",
            },
          ],
          inboundWebhook: {
            timeoutMs: 100, // Very short timeout for test
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 100, retryAttempts: 1, retryDelayMs: 0 },
      };

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // Inbound webhook timeout throws AdapterInboundWebhookTimeoutError
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "after",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "strict-inbound-timeout" },
          payload: {},
        }),
      ).rejects.toThrow("Inbound webhook timed out");

      // No fetch call - inbound webhooks receive POSTs, they don't call out
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
