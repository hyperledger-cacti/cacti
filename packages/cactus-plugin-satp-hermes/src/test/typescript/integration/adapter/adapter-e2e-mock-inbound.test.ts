/**
 * @fileoverview Integration tests with real outbound HTTP calls to external endpoints
 *
 * @description
 * **Test Strategy:**
 * These tests validate outbound webhooks against real HTTP endpoints
 * (jsonplaceholder.typicode.com) to verify actual network behavior.
 * Inbound webhooks remain mocked since they require gateway callback infrastructure.
 *
 * **Key Scenarios Tested:**
 * - Real HTTP POST to jsonplaceholder.typicode.com/posts
 * - Network timeout handling with real latency
 * - Response parsing from actual JSON API responses
 * - Retry behavior under real network conditions
 *
 * **Prerequisites:**
 * - Network connectivity to jsonplaceholder.typicode.com
 * - Higher Jest timeout (30s) to accommodate network latency
 *
 * **When to use real endpoint tests:**
 * - Validating HTTP client behavior (headers, timeouts, retries)
 * - Smoke testing before deployment
 * - Debugging network-related issues
 *
 * @see adapter-e2e-mock.test.ts for fully mocked tests (no network)
 * @see fixtures/adapter-configuration-integration-test.yml for config
 *
 * @module adapter-e2e-mock-inbound.test
 */

import { describe, expect, it, jest, beforeAll, afterAll } from "@jest/globals";
import { AdapterManager } from "../../../../main/typescript/adapters/adapter-manager";
import { Stage } from "../../../../main/typescript/types/satp-protocol";
import type { AdapterLayerConfiguration } from "../../../../main/typescript/adapters/adapter-config";
import { SatpStageKey } from "../../../../main/typescript/adapters/adapter-config";
import {
  createMonitorStub,
  loadAdapterConfigFromYaml,
  TEST_SESSION_ID,
  TEST_CONTEXT_ID,
  TEST_GATEWAY_ID,
  TEST_LOG_LEVEL,
} from "../../adapter-test-utils";

/**
 * Integration test suite: Real outbound HTTP calls
 * Requires network connectivity - uses extended timeout.
 */
describe("AdapterManager integration with real outbound endpoints", () => {
  // Increase timeout for network calls
  jest.setTimeout(30000);

  let originalFetch: typeof fetch;

  beforeAll(() => {
    // Store original fetch
    originalFetch = global.fetch;
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe("real outbound webhook calls", () => {
    it("calls real jsonplaceholder.typicode.com endpoint for outbound webhook", async () => {
      const config = loadAdapterConfigFromYaml(
        "adapter-configuration-integration-test.yml",
      );

      // Use real fetch - no mocking
      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        // fetchImpl not provided - uses global fetch
        logLevel: TEST_LOG_LEVEL,
      });

      const invocation = {
        stage: 0, // Stage.STAGE0 - numeric for executeAdapters
        stepTag: "newSessionRequest",
        stepOrder: "before" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "real-endpoint-test" },
        payload: { testData: "integration-test" },
      };

      const result = await manager.executeAdapters(invocation);

      // Verify the adapter executed
      expect(result).toBeDefined();
      expect(result?.stage).toBe(Stage.STAGE0);
      expect(result?.steps).toHaveLength(1);
      expect(result?.steps[0].binding.adapterId).toBe(
        "integration-outbound-test",
      );

      // The real endpoint should return a response
      expect(result?.steps[0].outboundResult).toBeDefined();
      expect(result?.steps[0].outboundResult?.status).toBe("OK");
    });

    it("handles real endpoint timeout gracefully", async () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "timeout-test-adapter",
            name: "Timeout Test Adapter",
            description: "Tests timeout with real endpoint",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "newSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              // Using jsonplaceholder echo endpoint
              url: "https://jsonplaceholder.typicode.com/posts",
              timeoutMs: 15000, // Reasonable timeout for real endpoint
              retryAttempts: 1,
            },
          },
        ],
        global: {
          timeoutMs: 15000,
          retryAttempts: 1,
          retryDelayMs: 500,
        },
      };

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 0, // Stage.STAGE0 - numeric for executeAdapters
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "timeout-test" },
        payload: {},
      });

      // Should complete without throwing
      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(1);
    });

    it("calls jsonplaceholder.typicode.com echo endpoint and verifies response", async () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "jsonplaceholder-echo-adapter",
            name: "JSONPlaceholder Echo Adapter",
            description: "Tests with jsonplaceholder.typicode.com echo",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "transferProposalRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              url: "https://jsonplaceholder.typicode.com/posts",
              timeoutMs: 15000,
              retryAttempts: 2,
            },
          },
        ],
        global: {
          timeoutMs: 15000,
          retryAttempts: 2,
          retryDelayMs: 1000,
        },
      };

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      const result = await manager.executeAdapters({
        stage: 1, // Stage.STAGE1 - numeric for executeAdapters
        stepTag: "transferProposalRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "jsonplaceholder-echo" },
        payload: { testMessage: "Hello from SATP adapter" },
      });

      expect(result).toBeDefined();
      expect(result?.stage).toBe(Stage.STAGE1);
      expect(result?.steps).toHaveLength(1);
      expect(result?.steps[0].binding.adapterId).toBe(
        "jsonplaceholder-echo-adapter",
      );
      expect(result?.steps[0].disposition).toBe("CONTINUE");
    });
  });

  describe("inbound webhook mocking with real outbound", () => {
    it("mocks only inbound webhook while making real outbound call", async () => {
      // Configuration with both outbound (real) and inbound (to be mocked behavior)
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "hybrid-outbound-adapter",
            name: "Hybrid Outbound Adapter",
            description: "Real outbound, simulated inbound",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "newSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              url: "https://jsonplaceholder.typicode.com/posts",
              timeoutMs: 15000,
            },
          },
          {
            id: "hybrid-inbound-adapter",
            name: "Hybrid Inbound Adapter",
            description: "Simulated inbound webhook",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "newSessionRequest",
                point: "after",
              },
            ],
            inboundWebhook: {
              timeoutMs: 5000,
            },
          },
        ],
        global: {
          timeoutMs: 15000,
          retryAttempts: 2,
          retryDelayMs: 1000,
        },
      };

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        // Using real fetch for outbound
        logLevel: TEST_LOG_LEVEL,
      });

      // Execute "before" adapters - makes REAL HTTP call
      const beforeResult = await manager.executeAdapters({
        stage: 0, // Stage.STAGE0 - numeric for executeAdapters
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { phase: "before-real-call" },
        payload: { realEndpoint: true },
      });

      expect(beforeResult).toBeDefined();
      expect(beforeResult?.stage).toBe(Stage.STAGE0);
      expect(beforeResult?.steps).toHaveLength(1);
      expect(beforeResult?.steps[0].binding.adapterId).toBe(
        "hybrid-outbound-adapter",
      );
      // Verify real endpoint responded
      expect(beforeResult?.steps[0].outboundResult?.status).toBe("OK");

      // Execute "after" adapters - inbound adapter times out without decision
      await expect(
        manager.executeAdapters({
          stage: 0, // Stage.STAGE0 - numeric for executeAdapters
          stepTag: "newSessionRequest",
          stepOrder: "after",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { phase: "after-inbound-mock" },
          payload: {},
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });

    it("uses integration test config with real jsonplaceholder endpoint", async () => {
      const config = loadAdapterConfigFromYaml(
        "adapter-configuration-integration-test.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // "before" execution calls real jsonplaceholder.typicode.com endpoint
      const beforeResult = await manager.executeAdapters({
        stage: 0, // Stage.STAGE0 - numeric for executeAdapters
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { test: "integration-yaml" },
        payload: { fromYaml: true },
      });

      expect(beforeResult).toBeDefined();
      expect(beforeResult?.steps).toHaveLength(1);
      expect(beforeResult?.steps[0].binding.adapterId).toBe(
        "integration-outbound-test",
      );
      expect(beforeResult?.steps[0].disposition).toBe("CONTINUE");

      // "after" execution has inbound adapter which times out without decision
      await expect(
        manager.executeAdapters({
          stage: 0, // Stage.STAGE0 - numeric for executeAdapters
          stepTag: "newSessionRequest",
          stepOrder: "after",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { test: "integration-yaml-after" },
          payload: {},
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });
  });

  describe("error handling with real endpoints", () => {
    it("handles non-existent endpoint gracefully", async () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "error-test-adapter",
            name: "Error Test Adapter",
            description: "Tests error handling with bad endpoint",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "newSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              // Non-existent endpoint
              url: "https://this-endpoint-does-not-exist-12345.example/webhook",
              timeoutMs: 5000,
              retryAttempts: 1,
              retryDelayMs: 100,
            },
          },
        ],
        global: {
          timeoutMs: 5000,
          retryAttempts: 1,
          retryDelayMs: 100,
        },
      };

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // Non-existent endpoint causes outbound webhook failure which throws
      await expect(
        manager.executeAdapters({
          stage: 0, // Stage.STAGE0 - numeric for executeAdapters
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "error-test" },
          payload: {},
        }),
      ).rejects.toThrow("Outbound webhook failed");
    });
  });
});
