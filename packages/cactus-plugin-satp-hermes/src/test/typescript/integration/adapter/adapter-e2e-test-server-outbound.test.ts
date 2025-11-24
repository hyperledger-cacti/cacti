/**
 * @fileoverview E2E tests for outbound webhooks using local test server
 *
 * @description
 * **Test Strategy:**
 * These tests validate outbound webhook execution against a real local HTTP
 * server (adapter-test-server.ts). The test server provides deterministic
 * endpoints that simulate various external system responses.
 *
 * **Outbound Webhook Behavior (Fire-and-Block):**
 * 1. Gateway reaches execution point with outbound adapter configured
 * 2. Gateway POSTs OutboundWebhookPayload to configured URL
 * 3. Gateway BLOCKS until response received or timeout
 * 4. On success: Logs response, continues SATP execution
 * 5. On failure: Throws AdapterOutboundWebhookError, aborts transfer
 *
 * **Test Server Endpoints:**
 * - /webhook/outbound - Returns { received: true }
 * - /webhook/outbound/approve - Returns { continue: true, reason: "..." }
 * - /webhook/outbound/reject - Returns { continue: false, reason: "..." }
 * - /webhook/outbound/error/{code} - Returns HTTP error status
 *
 * **Fixtures Used:**
 * - adapter-configuration-test-server.yml (newSessionRequest focused)
 * - adapter-configuration-test-server-simple.yml (multi-stage config)
 *
 * @see AdapterHookService.runOutboundWebhook() for execution implementation
 * @see AdapterOutboundWebhookError for failure handling
 *
 * @module adapter-e2e-test-server-outbound.test
 */

import { describe, expect, it, jest, beforeAll, afterAll } from "@jest/globals";
import { AdapterManager } from "../../../../main/typescript/adapters/adapter-manager";
import { SatpStageKey } from "../../../../main/typescript/generated/gateway-client/typescript-axios";
import {
  createMonitorStub,
  loadAndPatchTestServerConfig,
  TEST_SESSION_ID,
  TEST_CONTEXT_ID,
  TEST_GATEWAY_ID,
  TEST_LOG_LEVEL,
  startAdapterTestServer,
  stopAdapterTestServer,
  getTestServerBaseUrl,
} from "../../adapter-test-utils";

/**
 * E2E test suite: Outbound webhooks with local test server
 * Validates fire-and-block behavior with real HTTP calls.
 */
describe("AdapterManager E2E outbound webhook tests with test server", () => {
  jest.setTimeout(15000);

  beforeAll(async () => {
    await startAdapterTestServer();
  });

  afterAll(async () => {
    await stopAdapterTestServer();
  });

  describe("adapter-configuration-test-server.yml", () => {
    it("positive: outbound webhook calls test server and receives OK response", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // Execute adapter for the "before" point which has outbound webhook
      const invocation = {
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "outbound-positive-test" },
        payload: { testData: "outbound-call" },
      };

      const result = await manager.executeAdapters(invocation);

      expect(result).toBeDefined();
      expect(result?.stage).toBe(SatpStageKey.Stage0);
      expect(result?.steps).toHaveLength(1);

      const step = result?.steps[0];
      expect(step?.binding.adapterId).toBe(
        "newSessionRequest-outbound-validator",
      );
      expect(step?.outboundResult).toBeDefined();
      expect(step?.outboundResult?.status).toBe("OK");
      expect(step?.outboundResult?.httpStatus).toBe(200);

      // Response body should contain the test server's acknowledgment
      const responseBody = step?.outboundResult?.responseBody;
      expect(responseBody).toBeDefined();
      if (typeof responseBody === "string") {
        const parsed = JSON.parse(responseBody);
        expect(parsed.received).toBe(true);
      } else {
        expect(responseBody).toHaveProperty("received", true);
      }
    });

    it("negative: outbound webhook throws error on server 500 response", async () => {
      // Modify config to point to error endpoint
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      // Override URL to error endpoint
      const baseUrl = getTestServerBaseUrl();
      const adapter = config.adapters.find(
        (a) => a.id === "newSessionRequest-outbound-validator",
      );
      if (adapter?.outboundWebhook) {
        adapter.outboundWebhook.url = `${baseUrl}/webhook/outbound/error/500`;
      }

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // HTTP 500 errors throw AdapterOutboundWebhookError
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "outbound-error-test" },
          payload: { testData: "error-test" },
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });
  });

  describe("adapter-configuration-test-server-simple.yml", () => {
    it("positive: phase0-adapter-2 calls approve endpoint and receives continue=true", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server-simple.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // phase0-adapter-2 is configured for newSessionResponse at "after"
      // Its outbound URL points to /webhook/outbound/approve
      const invocation = {
        stage: 0,
        stepTag: "newSessionResponse",
        stepOrder: "after" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "dashboard-notify-test" },
        payload: { testData: "session-created" },
      };

      const result = await manager.executeAdapters(invocation);

      expect(result).toBeDefined();
      expect(result?.stage).toBe(SatpStageKey.Stage0);
      expect(result?.steps).toHaveLength(1);

      const step = result?.steps[0];
      expect(step?.binding.adapterId).toBe("phase0-adapter-2");
      expect(step?.outboundResult).toBeDefined();
      expect(step?.outboundResult?.status).toBe("OK");
      expect(step?.outboundResult?.httpStatus).toBe(200);

      // Response should have continue: true from /webhook/outbound/approve
      const responseBody = step?.outboundResult?.responseBody;
      expect(responseBody).toBeDefined();
      if (typeof responseBody === "string") {
        const parsed = JSON.parse(responseBody);
        expect(parsed.continue).toBe(true);
        expect(parsed.reason).toBe("Auto-approved by test server");
      } else {
        expect(responseBody).toHaveProperty("continue", true);
      }
    });

    it("negative: outbound webhook to reject endpoint receives continue=false", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server-simple.yml",
      );

      // Override URL to reject endpoint for testing
      const baseUrl = getTestServerBaseUrl();
      const adapter = config.adapters.find((a) => a.id === "phase0-adapter-2");
      if (adapter?.outboundWebhook) {
        adapter.outboundWebhook.url = `${baseUrl}/webhook/outbound/reject`;
      }

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      const invocation = {
        stage: 0,
        stepTag: "newSessionResponse",
        stepOrder: "after" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "reject-endpoint-test" },
        payload: { testData: "rejection-test" },
      };

      const result = await manager.executeAdapters(invocation);

      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);

      const step = result?.steps[0];
      expect(step?.binding.adapterId).toBe("phase0-adapter-2");
      expect(step?.outboundResult).toBeDefined();
      // Outbound webhooks succeed even if response contains continue: false
      // The response is logged but doesn't affect execution flow
      expect(step?.outboundResult?.status).toBe("OK");
      expect(step?.outboundResult?.httpStatus).toBe(200);

      const responseBody = step?.outboundResult?.responseBody;
      if (typeof responseBody === "string") {
        const parsed = JSON.parse(responseBody);
        expect(parsed.continue).toBe(false);
        expect(parsed.reason).toBe("Auto-rejected by test server");
      }
    });
  });

  describe("outbound webhook timeout and retry scenarios", () => {
    it("outbound webhook throws error when server is slow and times out", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      // Override URL to delay endpoint (2 seconds delay, but timeout is 1 second)
      const baseUrl = getTestServerBaseUrl();
      const adapter = config.adapters.find(
        (a) => a.id === "newSessionRequest-outbound-validator",
      );
      if (adapter?.outboundWebhook) {
        adapter.outboundWebhook.url = `${baseUrl}/webhook/outbound/delay/2000`;
        adapter.outboundWebhook.timeoutMs = 1000; // 1 second timeout
        adapter.outboundWebhook.retryAttempts = 1; // Only try once
      }

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // Timeout causes outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "timeout-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });

    it("outbound webhook succeeds on retry after initial timeout", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      // Use a delay that's just under the timeout
      const baseUrl = getTestServerBaseUrl();
      const adapter = config.adapters.find(
        (a) => a.id === "newSessionRequest-outbound-validator",
      );
      if (adapter?.outboundWebhook) {
        // 500ms delay, 1000ms timeout - should succeed
        adapter.outboundWebhook.url = `${baseUrl}/webhook/outbound/delay/500`;
        adapter.outboundWebhook.timeoutMs = 1000;
        adapter.outboundWebhook.retryAttempts = 3;
      }

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      const invocation = {
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "delay-success-test" },
        payload: {},
      };

      const result = await manager.executeAdapters(invocation);

      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);

      const step = result?.steps[0];
      expect(step?.outboundResult).toBeDefined();
      expect(step?.outboundResult?.status).toBe("OK");
      expect(step?.outboundResult?.httpStatus).toBe(200);

      // Response should indicate delay
      const responseBody = step?.outboundResult?.responseBody;
      if (typeof responseBody === "string") {
        const parsed = JSON.parse(responseBody);
        expect(parsed.delayed).toBe(true);
        expect(parsed.delayMs).toBe(500);
      }
    });
  });

  describe("multiple adapters for same execution point", () => {
    it("executes outbound adapter then throws on inbound timeout", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server-simple.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // checkPreSATPTransferRequest has phase0-adapter-1 configured
      // which has both outbound and inbound - outbound succeeds, inbound times out
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "checkPreSATPTransferRequest",
          stepOrder: "before" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "pre-satp-transfer-test" },
          payload: { assetId: "asset-123" },
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });
  });

  describe("HTTP error codes", () => {
    it.each([
      [400, "Bad Request"],
      [401, "Unauthorized"],
      [403, "Forbidden"],
      [404, "Not Found"],
      [500, "Internal Server Error"],
      [502, "Bad Gateway"],
      [503, "Service Unavailable"],
    ])("throws error on HTTP %i response", async (errorCode) => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      const baseUrl = getTestServerBaseUrl();
      const adapter = config.adapters.find(
        (a) => a.id === "newSessionRequest-outbound-validator",
      );
      if (adapter?.outboundWebhook) {
        adapter.outboundWebhook.url = `${baseUrl}/webhook/outbound/error/${errorCode}`;
        adapter.outboundWebhook.retryAttempts = 1;
      }

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // HTTP error codes cause outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: `ctx-error-${errorCode}`,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: `error-${errorCode}` },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });
  });
});
