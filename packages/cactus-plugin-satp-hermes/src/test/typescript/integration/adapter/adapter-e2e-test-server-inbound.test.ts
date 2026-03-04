/**
 * @fileoverview E2E tests for inbound webhook configurations using local test server
 *
 * @description
 * **Test Strategy:**
 * These tests validate inbound webhook adapter configurations against a real
 * local HTTP server (adapter-test-server.ts). The test server provides
 * deterministic endpoints for simulating external approval workflows.
 *
 * **Inbound Webhook Lifecycle:**
 * 1. Gateway reaches execution point with inbound adapter configured
 * 2. Gateway PAUSES and exposes callback endpoint: POST /api/v1/adapters/inbound/{sessionId}/{adapterId}
 * 3. External controller (compliance, manual review) evaluates transfer
 * 4. External controller POSTs decision: { continue: true/false, reason: "..." }
 * 5. Gateway resumes (continue=true) or aborts (continue=false) the transfer
 *
 * **Test Limitations:**
 * Since tests cannot simulate the full gateway callback infrastructure,
 * inbound adapters return SKIP disposition indicating they're awaiting callback.
 * Full inbound flow requires running gateway with HTTP server exposed.
 *
 * **Fixtures Used:**
 * - adapter-configuration-test-server.yml (newSessionRequest focused)
 * - adapter-configuration-test-server-simple.yml (multi-stage config)
 *
 * @see AdapterHookService.runInboundWebhook() for blocking implementation
 * @see AdapterHookService.processInboundDecision() for callback handling
 *
 * @module adapter-e2e-test-server-inbound.test
 */

import { describe, expect, it, jest, beforeAll, afterAll } from "@jest/globals";
import { AdapterManager } from "../../../../main/typescript/adapters/adapter-manager";
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
 * E2E test suite: Inbound webhooks with local test server
 * Validates configuration loading and SKIP disposition for awaiting callbacks.
 */
describe("AdapterManager E2E inbound webhook tests with test server", () => {
  jest.setTimeout(15000);

  beforeAll(async () => {
    await startAdapterTestServer();
  });

  afterAll(async () => {
    await stopAdapterTestServer();
  });

  describe("adapter-configuration-test-server.yml", () => {
    it("positive: loads configuration with inbound webhook correctly", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      expect(config.adapters).toHaveLength(2);

      // Check the inbound adapter configuration
      const inboundAdapter = config.adapters.find(
        (a) => a.id === "newSessionRequest-inbound-approval",
      );
      expect(inboundAdapter).toBeDefined();
      expect(inboundAdapter?.inboundWebhook).toBeDefined();
      expect(inboundAdapter?.inboundWebhook?.timeoutMs).toBe(3000);
    });

    it("positive: adapter with inbound webhook times out without external callback", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // Execute adapter for the "after" point which has inbound webhook
      // Inbound webhooks require external decision - without one they timeout
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "after" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "inbound-skip-test" },
          payload: { testData: "inbound-approval" },
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });

    it("negative: inbound webhook adapter without external callback times out", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // Inbound webhooks require external decision - without one they timeout
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "newSessionRequest",
          stepOrder: "after" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "inbound-negative-test" },
          payload: {},
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });
  });

  describe("adapter-configuration-test-server-simple.yml", () => {
    it("positive: loads configuration with multiple inbound webhooks correctly", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server-simple.yml",
      );

      expect(config.adapters.length).toBeGreaterThan(0);

      // Check phase0-adapter-1 has inbound webhook
      const phase0Adapter = config.adapters.find(
        (a) => a.id === "phase0-adapter-1",
      );
      expect(phase0Adapter).toBeDefined();
      expect(phase0Adapter?.inboundWebhook).toBeDefined();
      expect(phase0Adapter?.inboundWebhook?.timeoutMs).toBe(3000);

      // Check stage1-compliance-adapter has inbound webhook
      const complianceAdapter = config.adapters.find(
        (a) => a.id === "stage1-compliance-adapter",
      );
      expect(complianceAdapter).toBeDefined();
      expect(complianceAdapter?.inboundWebhook).toBeDefined();
    });

    it("positive: adapter with both outbound and inbound times out on inbound (after outbound succeeds)", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server-simple.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // phase0-adapter-1 is configured for checkNewSessionRequest at "before"
      // It has both outbound AND inbound webhook - outbound succeeds, then inbound times out
      await expect(
        manager.executeAdapters({
          stage: 0,
          stepTag: "checkNewSessionRequest",
          stepOrder: "before" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "outbound-then-inbound" },
          payload: { testData: "check-session-request" },
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });

    it("negative: compliance adapter inbound times out without external trigger", async () => {
      const config = loadAndPatchTestServerConfig(
        "adapter-configuration-test-server-simple.yml",
      );

      const manager = new AdapterManager({
        config,
        monitorService: createMonitorStub(),
        logLevel: TEST_LOG_LEVEL,
      });

      // stage1-compliance-adapter is configured for checkTransferProposalRequestMessage
      // It has both outbound and inbound - outbound succeeds, inbound times out
      await expect(
        manager.executeAdapters({
          stage: 1,
          stepTag: "checkTransferProposalRequestMessage",
          stepOrder: "before" as const,
          sessionId: TEST_SESSION_ID,
          contextId: TEST_CONTEXT_ID,
          gatewayId: TEST_GATEWAY_ID,
          metadata: { scenario: "compliance-inbound-skip" },
          payload: { testData: "compliance-check" },
        }),
      ).rejects.toThrow("Inbound webhook timed out");
    });
  });

  describe("test server inbound endpoint validation", () => {
    it("test server accepts valid InboundWebhookDecisionResponse", async () => {
      const baseUrl = getTestServerBaseUrl();
      const response = await fetch(`${baseUrl}/webhook/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId: "test-adapter",
          continue: true,
          reason: "Approved",
          processedAt: new Date().toISOString(),
        }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.received).toBe(true);
      expect(body.decision.continue).toBe(true);
    });

    it("test server rejects invalid InboundWebhookDecisionResponse (missing continue)", async () => {
      const baseUrl = getTestServerBaseUrl();
      const response = await fetch(`${baseUrl}/webhook/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId: "test-adapter",
          // Missing 'continue' field
          reason: "Invalid payload",
        }),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("continue");
    });

    it("test server accepts InboundWebhookDecisionResponse with continue=false", async () => {
      const baseUrl = getTestServerBaseUrl();
      const response = await fetch(`${baseUrl}/webhook/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId: "compliance-adapter",
          continue: false,
          reason: "Compliance check failed",
          processedAt: new Date().toISOString(),
          message: "Entity on sanctions list",
        }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.received).toBe(true);
      expect(body.decision.continue).toBe(false);
      expect(body.decision.reason).toBe("Compliance check failed");
    });
  });
});
