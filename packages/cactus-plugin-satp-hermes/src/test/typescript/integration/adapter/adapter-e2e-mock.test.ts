/**
 * @fileoverview E2E tests for AdapterManager with fully mocked HTTP layer
 *
 * @description
 * **Test Strategy:**
 * These tests validate adapter execution flow using Jest-mocked fetch calls.
 * No real HTTP requests are made - all webhook responses are simulated.
 * This enables fast, deterministic testing of:
 * - Multi-adapter execution ordering by priority
 * - Outbound webhook payload construction and response handling
 * - YAML configuration loading and binding resolution
 * - Session/context ID propagation through the adapter pipeline
 *
 * **When to use mocked tests:**
 * - Unit-level validation of adapter logic
 * - CI/CD pipelines requiring no network dependencies
 * - Testing edge cases difficult to reproduce with real endpoints
 *
 * @see adapter-e2e-test-server-outbound.test.ts for real HTTP endpoint tests
 * @see adapter-e2e-mock-negative.test.ts for error scenario tests
 *
 * @module adapter-e2e-mock.test
 */

import { describe, expect, it, jest } from "@jest/globals";
import { AdapterManager } from "../../../../main/typescript/adapters/adapter-manager";
import { Stage } from "../../../../main/typescript/types/satp-protocol";
import type {
  AdapterDefinition,
  AdapterLayerConfiguration,
} from "../../../../main/typescript/adapters/adapter-config";
import { SatpStageKey } from "../../../../main/typescript/adapters/adapter-config";
import {
  createFetchResponse,
  createMonitorStub,
  loadAdapterConfigFromYaml,
  STAGE0_NEW_SESSION_REQUEST_CONFIG,
  TEST_SESSION_ID,
  TEST_CONTEXT_ID,
  TEST_GATEWAY_ID,
  TEST_LOG_LEVEL,
} from "../../adapter-test-utils";

/**
 * E2E test suite: Mocked outbound webhooks
 * Validates adapter execution without network dependencies.
 */
describe("AdapterManager E2E with fully mocked webhooks", () => {
  describe("outbound webhook mocking", () => {
    it("mocks multiple outbound adapters and verifies execution order", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "audit-log",
          name: "Audit Log",
          description: "Records SATP events",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage1,
              step: "transferProposalRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://adapter.example/audit",
          },
        },
        {
          id: "risk-engine",
          name: "Risk Engine",
          description: "Performs risk checks",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage1,
              step: "transferProposalRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://adapter.example/risk",
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 250, retryAttempts: 3, retryDelayMs: 0 },
      };

      // Mock outbound webhooks
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock
        .mockResolvedValueOnce(
          createFetchResponse(200, {
            adapter: "audit-log",
            status: "recorded",
          }),
        )
        .mockResolvedValueOnce(
          createFetchResponse(200, {
            adapter: "risk-engine",
            status: "checked",
          }),
        );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const invocation = {
        stage: 1, // Stage.STAGE1 - numeric for executeAdapters
        stepTag: "transferProposalRequest",
        stepOrder: "before" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "multi-outbound-mock" },
        payload: { message: "hello" },
      };

      const result = await manager.executeAdapters(invocation);

      // Verify mocked outbound calls
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result?.steps).toHaveLength(2);
      expect(result?.steps.map((step) => step.binding.adapterId)).toEqual([
        "audit-log",
        "risk-engine",
      ]);
      expect(
        result?.steps.every((step) => step.disposition === "CONTINUE"),
      ).toBe(true);
    });

    it("mocks outbound webhook for newSessionRequest from YAML config", async () => {
      const config = loadAdapterConfigFromYaml(
        "adapter-configuration-newSessionRequest.yml",
      );

      // Mock outbound webhook
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(200, { validated: true, timestamp: Date.now() }),
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      const invocation = {
        stage: 0, // Stage.STAGE0 - numeric for executeAdapters
        stepTag: "newSessionRequest",
        stepOrder: "before" as const,
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { scenario: "yaml-outbound-mock" },
        payload: { sessionType: "transfer" },
      };

      const result = await manager.executeAdapters(invocation);

      // Verify mocked outbound call
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result?.stage).toBe(Stage.STAGE0);
      expect(result?.steps).toHaveLength(1);
      expect(result?.steps[0].binding.adapterId).toBe(
        "newSessionRequest-outbound-validator",
      );
      expect(result?.steps[0].disposition).toBe("CONTINUE");
    });
  });

  describe("inbound webhook mocking", () => {
    it("mocks inbound webhook for adapter with inboundWebhook configuration", async () => {
      // Mock both outbound and inbound webhooks
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

      // First call: outbound webhook for "before" execution point
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(200, { step: "before", validated: true }),
      );

      // Note: Inbound webhooks are not called via fetch but are awaited via internal mechanism
      // The fetch mock here ensures outbound calls are mocked

      const manager = new AdapterManager({
        config: STAGE0_NEW_SESSION_REQUEST_CONFIG,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // Execute "before" adapters (outbound)
      const beforeResult = await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { phase: "before" },
        payload: {},
      });

      expect(beforeResult?.stage).toBe(Stage.STAGE0);
      expect(beforeResult?.steps).toHaveLength(1);
      expect(beforeResult?.steps[0].binding.adapterId).toBe(
        "newSessionRequest-outbound-validator",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Execute "after" adapters (inbound webhook adapter)
      // Inbound webhooks require an external decision, so without one they will timeout
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "after",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { phase: "after" },
          payload: {},
        }),
      ).rejects.toThrow("Inbound webhook timed out");

      // Fetch should still be called once (only from before execution)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("combined outbound and inbound mocking", () => {
    it("tests adapter with both outbound and inbound webhooks configured", async () => {
      const adapters: AdapterDefinition[] = [
        {
          id: "combined-webhook-adapter",
          name: "Combined Webhook Adapter",
          description: "Has both outbound and inbound webhooks",
          active: true,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before",
            },
          ],
          outboundWebhook: {
            url: "https://adapter.example/combined/outbound",
            timeoutMs: 5000,
          },
          inboundWebhook: {
            timeoutMs: 3000,
          },
        },
      ];

      const adapterConfig: AdapterLayerConfiguration = {
        adapters,
        global: { timeoutMs: 5000, retryAttempts: 2, retryDelayMs: 500 },
      };

      // Mock outbound webhook
      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(200, { combined: true, outboundCalled: true }),
      );

      const manager = new AdapterManager({
        config: adapterConfig,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      // Combined adapter has both outbound and inbound, but inbound will timeout
      // without external decision, causing the entire execution to throw
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "before",
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "combined-webhook" },
          payload: { combined: true },
        }),
      ).rejects.toThrow("Inbound webhook timed out");

      // Verify outbound was called (mocked) before inbound timeout
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("verifies mock captures request details for outbound webhook", async () => {
      const config = loadAdapterConfigFromYaml(
        "adapter-configuration-newSessionRequest.yml",
      );

      const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(200, { status: "ok" }),
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        fetchImpl: fetchMock,
        logLevel: TEST_LOG_LEVEL,
      });

      await manager.executeAdapters({
        stage: 0,
        stepTag: "newSessionRequest",
        stepOrder: "before",
        sessionId: TEST_SESSION_ID,
        contextId: TEST_CONTEXT_ID,
        gatewayId: TEST_GATEWAY_ID,
        metadata: { captureTest: true },
        payload: { testData: "value" },
      });

      // Verify the fetch mock captured the request
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:9223/webhook/outbound/validate");
      expect(options?.method).toBe("POST");
      expect(options?.headers).toBeDefined();
    });
  });
});
