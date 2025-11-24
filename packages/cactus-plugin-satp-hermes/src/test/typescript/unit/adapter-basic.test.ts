import { describe, expect, it, jest } from "@jest/globals";
import { AdapterManager } from "../../../main/typescript/adapters/adapter-manager";
import { SatpStageKey } from "../../../main/typescript/generated/gateway-client/typescript-axios";
import {
  createAdapterHarness,
  createFetchResponse,
  createMonitorStub,
  loadAdapterConfigFromYaml,
  createNewSessionRequestHarness,
  STAGE0_NEW_SESSION_REQUEST_CONFIG,
  TEST_SESSION_ID,
  TEST_CONTEXT_ID,
  TEST_GATEWAY_ID,
  TEST_LOG_LEVEL,
} from "../adapter-test-utils";

describe("AdapterManager basic behaviors", () => {
  it("returns undefined when no adapters are configured", async () => {
    const { manager, fetchMock, invocation } = createAdapterHarness({
      hasAdapters: false,
    });

    const result = await manager.executeAdapters(invocation);

    expect(result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns undefined when the stage has no bindings", async () => {
    const { manager, fetchMock, invocation } = createAdapterHarness();
    const result = await manager.executeAdapters({
      ...invocation,
      stage: 2,
      stepTag: "lockAsset",
    });

    expect(result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("produces a step result when an adapter executes successfully", async () => {
    const { manager, invocation } = createAdapterHarness();

    const result = await manager.executeAdapters(invocation);

    expect(result).toBeDefined();
    expect(result?.stage).toBe(SatpStageKey.Stage1);
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].disposition).toBe("CONTINUE");
    expect(result?.steps[0].outboundResult?.status).toBe("OK");
  });

  it("initializes adapter manager using newSessionRequest YAML configuration", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration-newSessionRequest.yml",
    );
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { success: true }));
    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
    });
    const invocation = {
      stage: 0,
      stepTag: "newSessionRequest",
      stepOrder: "before" as const,
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { scenario: "yaml-config" },
      payload: { request: "newSession" },
    };

    const result = await manager.executeAdapters(invocation);
    const step = result?.steps[0];

    expect(result?.stage).toBe(SatpStageKey.Stage0);
    expect(step?.binding.adapterId).toBe(
      "newSessionRequest-outbound-validator",
    );
    expect(step?.disposition).toBe("CONTINUE");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the createNewSessionRequestHarness for Stage 0 tests", async () => {
    const { manager, fetchMock, invocation } = createNewSessionRequestHarness();

    const result = await manager.executeAdapters(invocation);

    expect(result).toBeDefined();
    expect(result?.stage).toBe(SatpStageKey.Stage0);
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].binding.adapterId).toBe(
      "newSessionRequest-outbound-validator",
    );
    expect(result?.steps[0].disposition).toBe("CONTINUE");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("loads configuration from STAGE0_NEW_SESSION_REQUEST_CONFIG constant", async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { approved: true }));
    const manager = new AdapterManager({
      config: STAGE0_NEW_SESSION_REQUEST_CONFIG,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    const invocation = {
      stage: 0, // SatpStageKey.Stage0 - numeric for executeAdapters
      stepTag: "newSessionRequest",
      stepOrder: "before" as const,
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { test: "constant-config" },
      payload: {},
    };

    const result = await manager.executeAdapters(invocation);

    expect(result?.stage).toBe(SatpStageKey.Stage0);
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].binding.adapterId).toBe(
      "newSessionRequest-outbound-validator",
    );
  });
});

describe("AdapterManager configuration examples", () => {
  it("loads adapter-configuration-simple.example.yml correctly", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration-simple.example.yml",
    );

    expect(config).toBeDefined();
    expect(config.adapters).toHaveLength(2);
    expect(config.adapters[0].id).toBe("validation-adapter-1");
    expect(config.adapters[1].id).toBe("phase0-adapter-2");
    expect(config.global?.logLevel).toBe("debug");
  });

  it("initializes AdapterManager with adapter-configuration-simple.example.yml", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration-simple.example.yml",
    );
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { validated: true }));

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    expect(manager).toBeDefined();

    // Test execution for validation-adapter-1 (checkNewSessionRequest - before)
    // The adapter has both outbound and inbound webhooks, so we need to trigger the decision
    const executionPromise = manager.executeAdapters({
      stage: 0,
      stepTag: "checkNewSessionRequest",
      stepOrder: "before",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { test: "simple-config" },
      payload: {},
    });

    // Give time for the inbound webhook to register, then trigger decision
    await new Promise((resolve) => setTimeout(resolve, 50));
    await manager.decideInboundWebhook({
      adapterId: "validation-adapter-1",
      sessionId: TEST_SESSION_ID,
      continue: true,
      reason: "Test approval",
    });

    const result = await executionPromise;

    expect(result?.stage).toBe(SatpStageKey.Stage0);
    expect(result?.steps).toHaveLength(2);
    expect(result?.steps[0].binding.adapterId).toBe("validation-adapter-1");
    expect(result?.steps[0].disposition).toBe("CONTINUE"); // outbound step
    expect(result?.steps[1].disposition).toBe("CONTINUE"); // inbound step approved
  });

  it("loads adapter-configuration.example.yml (comprehensive) correctly", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration.example.yml",
    );

    expect(config).toBeDefined();
    expect(config.adapters).toHaveLength(5);

    // Verify all adapter IDs
    const adapterIds = config.adapters.map((a) => a.id);
    expect(adapterIds).toContain("phase0-adapter-1");
    expect(adapterIds).toContain("phase0-adapter-2");
    expect(adapterIds).toContain("stage1-compliance-adapter");
    expect(adapterIds).toContain("stage2-lock-monitor");
    expect(adapterIds).toContain("stage3-finalization-adapter");

    expect(config.global?.logLevel).toBe("debug");
  });

  it("initializes AdapterManager with adapter-configuration.example.yml", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration.example.yml",
    );
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { status: "ok" }));

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    expect(manager).toBeDefined();

    // Test execution for phase0-adapter-1 (checkNewSessionRequest - before)
    // The adapter has both outbound and inbound webhooks, so we need to trigger the decision
    const executionPromise = manager.executeAdapters({
      stage: 0,
      stepTag: "checkNewSessionRequest",
      stepOrder: "before",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { test: "comprehensive-config" },
      payload: {},
    });

    // Give time for the inbound webhook to register, then trigger decision
    await new Promise((resolve) => setTimeout(resolve, 50));
    await manager.decideInboundWebhook({
      adapterId: "phase0-adapter-1",
      sessionId: TEST_SESSION_ID,
      continue: true,
      reason: "Test approval",
    });

    const stage0Result = await executionPromise;

    expect(stage0Result?.stage).toBe(SatpStageKey.Stage0);
    expect(stage0Result?.steps).toHaveLength(2);
    expect(stage0Result?.steps[0].binding.adapterId).toBe("phase0-adapter-1");
    expect(stage0Result?.steps[0].disposition).toBe("CONTINUE"); // outbound step
    expect(stage0Result?.steps[1].disposition).toBe("CONTINUE"); // inbound step approved
    expect(fetchMock).toHaveBeenCalled();
  });

  it("executes stage1-compliance-adapter from comprehensive config", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration.example.yml",
    );
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { compliant: true }));

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    // Test execution for stage1-compliance-adapter
    // The adapter has both outbound and inbound webhooks, so we need to trigger the decision
    const executionPromise = manager.executeAdapters({
      stage: 1,
      stepTag: "checkTransferProposalRequestMessage",
      stepOrder: "before",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { test: "compliance-check" },
      payload: {},
    });

    // Give time for the inbound webhook to register, then trigger decision
    await new Promise((resolve) => setTimeout(resolve, 50));
    await manager.decideInboundWebhook({
      adapterId: "stage1-compliance-adapter",
      sessionId: TEST_SESSION_ID,
      continue: true,
      reason: "Compliance approved",
    });

    const result = await executionPromise;

    expect(result?.stage).toBe(SatpStageKey.Stage1);
    expect(result?.steps).toHaveLength(2);
    expect(result?.steps[0].binding.adapterId).toBe(
      "stage1-compliance-adapter",
    );
    expect(result?.steps[0].disposition).toBe("CONTINUE"); // outbound step
    expect(result?.steps[1].disposition).toBe("CONTINUE"); // inbound step approved
  });

  it("executes stage2-lock-monitor adapter from comprehensive config", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration.example.yml",
    );
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { monitored: true }));

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    // Test execution for stage2-lock-monitor (checkLockAssertionRequest - after)
    const result = await manager.executeAdapters({
      stage: 2, // SatpStageKey.Stage2 - numeric for executeAdapters
      stepTag: "checkLockAssertionRequest",
      stepOrder: "after",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { test: "lock-monitor" },
      payload: {},
    });

    expect(result?.stage).toBe(SatpStageKey.Stage2);
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].binding.adapterId).toBe("stage2-lock-monitor");
  });

  it("executes stage3-finalization-adapter from comprehensive config", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration.example.yml",
    );
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { finalized: true }));

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    // Test execution for stage3-finalization-adapter (commitReadyResponse - after)
    const result = await manager.executeAdapters({
      stage: 3, // SatpStageKey.Stage3 - numeric for executeAdapters
      stepTag: "commitReadyResponse",
      stepOrder: "after",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: { test: "finalization" },
      payload: {},
    });

    expect(result?.stage).toBe(SatpStageKey.Stage3);
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].binding.adapterId).toBe(
      "stage3-finalization-adapter",
    );
  });

  it("loads adapter-configuration-integration-test.yml for real endpoint testing", async () => {
    const config = loadAdapterConfigFromYaml(
      "adapter-configuration-integration-test.yml",
    );

    expect(config).toBeDefined();
    expect(config.adapters).toHaveLength(2);
    expect(config.adapters[0].id).toBe("integration-outbound-test");
    expect(config.adapters[1].id).toBe("integration-inbound-test");

    // Verify outbound webhook points to jsonplaceholder.typicode.com
    expect(config.adapters[0].outboundWebhook?.url).toBe(
      "https://jsonplaceholder.typicode.com/posts",
    );
    expect(config.global?.logLevel).toBe("debug");
  });
});

describe("AdapterManager priority ordering", () => {
  it("executes multiple adapters at same execution point in priority order (lower first)", async () => {
    // Create config with 3 adapters at the SAME execution point with different priorities
    const config = {
      adapters: [
        {
          id: "adapter-priority-3",
          name: "Third Priority Adapter",
          active: true,
          priority: 3, // Should execute last
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/priority-3" },
        },
        {
          id: "adapter-priority-1",
          name: "First Priority Adapter",
          active: true,
          priority: 1, // Should execute first
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/priority-1" },
        },
        {
          id: "adapter-priority-2",
          name: "Second Priority Adapter",
          active: true,
          priority: 2, // Should execute second
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/priority-2" },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const callOrder: string[] = [];
    const fetchMock = jest.fn<typeof fetch>().mockImplementation((url) => {
      callOrder.push(url.toString());
      return Promise.resolve(createFetchResponse(200, { ok: true }));
    });

    const manager = new AdapterManager({
      config,
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
      metadata: {},
      payload: {},
    });

    // Verify all 3 adapters executed
    expect(result?.steps).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Verify execution order matches priority (lower priority executes first)
    expect(callOrder[0]).toContain("priority-1");
    expect(callOrder[1]).toContain("priority-2");
    expect(callOrder[2]).toContain("priority-3");

    // Verify step binding order
    expect(result?.steps[0].binding.adapterId).toBe("adapter-priority-1");
    expect(result?.steps[1].binding.adapterId).toBe("adapter-priority-2");
    expect(result?.steps[2].binding.adapterId).toBe("adapter-priority-3");
  });

  it("uses default priority (1000) when not specified", async () => {
    const config = {
      adapters: [
        {
          id: "adapter-no-priority",
          name: "No Priority Adapter",
          active: true,
          // No priority - should default to 1000
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/no-priority" },
        },
        {
          id: "adapter-low-priority",
          name: "Low Priority Adapter",
          active: true,
          priority: 500, // Should execute before default 1000
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/low-priority" },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const callOrder: string[] = [];
    const fetchMock = jest.fn<typeof fetch>().mockImplementation((url) => {
      callOrder.push(url.toString());
      return Promise.resolve(createFetchResponse(200, { ok: true }));
    });

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
      metadata: {},
      payload: {},
    });

    // Adapter with priority 500 should execute before default 1000
    expect(callOrder[0]).toContain("low-priority");
    expect(callOrder[1]).toContain("no-priority");
  });

  it("priority only affects adapters at same execution point", async () => {
    const config = {
      adapters: [
        {
          id: "before-adapter-high-priority",
          name: "Before Adapter (High Priority)",
          active: true,
          priority: 100, // High priority number but different execution point
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/before" },
        },
        {
          id: "after-adapter-low-priority",
          name: "After Adapter (Low Priority)",
          active: true,
          priority: 1, // Low priority number but different execution point
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "after" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/after" },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(createFetchResponse(200, { ok: true }));

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: fetchMock,
      logLevel: TEST_LOG_LEVEL,
    });

    // Execute "before" step
    const beforeResult = await manager.executeAdapters({
      stage: 0,
      stepTag: "newSessionRequest",
      stepOrder: "before",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: {},
      payload: {},
    });

    // Execute "after" step
    const afterResult = await manager.executeAdapters({
      stage: 0,
      stepTag: "newSessionRequest",
      stepOrder: "after",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: {},
      payload: {},
    });

    // Each execution point has exactly 1 adapter
    expect(beforeResult?.steps).toHaveLength(1);
    expect(afterResult?.steps).toHaveLength(1);

    // "before" adapter executes when stepOrder is "before"
    expect(beforeResult?.steps[0].binding.adapterId).toBe(
      "before-adapter-high-priority",
    );

    // "after" adapter executes when stepOrder is "after"
    expect(afterResult?.steps[0].binding.adapterId).toBe(
      "after-adapter-low-priority",
    );
  });

  it("sorts adapters by protocol step sequence (not alphabetically)", async () => {
    // Create config with adapters at different steps in Stage 0
    // Steps in Stage 0 protocol order:
    // 1. newSessionRequest (sequence 1)
    // 2. checkNewSessionRequest (sequence 2)
    // 3. newSessionResponse (sequence 3)
    // 4. checkNewSessionResponse (sequence 4)
    // 5. preSATPTransferRequest (sequence 5)
    // etc.
    // If sorted alphabetically: checkNewSessionRequest < newSessionRequest < newSessionResponse
    // If sorted by protocol sequence: newSessionRequest < checkNewSessionRequest < newSessionResponse
    const config = {
      adapters: [
        {
          id: "adapter-checkNewSessionRequest", // alphabetically first
          name: "Check New Session Request Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "checkNewSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/check-session" },
        },
        {
          id: "adapter-newSessionResponse", // alphabetically last
          name: "New Session Response Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionResponse",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/session-response" },
        },
        {
          id: "adapter-newSessionRequest", // alphabetically middle
          name: "New Session Request Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/session-request" },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      fetchImpl: jest
        .fn<typeof fetch>()
        .mockResolvedValue(createFetchResponse(200, { ok: true })),
      logLevel: TEST_LOG_LEVEL,
    });

    // Get bindings for each step and verify they're sorted by protocol sequence
    const binding1 = manager.getBindingsForExecutionPoint(
      0,
      "newSessionRequest",
      "before",
    );
    const binding2 = manager.getBindingsForExecutionPoint(
      0,
      "checkNewSessionRequest",
      "before",
    );
    const binding3 = manager.getBindingsForExecutionPoint(
      0,
      "newSessionResponse",
      "before",
    );

    expect(binding1).toHaveLength(1);
    expect(binding2).toHaveLength(1);
    expect(binding3).toHaveLength(1);

    // Verify each binding is for the correct step (protocol sequence order)
    expect(binding1[0].adapterId).toBe("adapter-newSessionRequest"); // sequence 1
    expect(binding2[0].adapterId).toBe("adapter-checkNewSessionRequest"); // sequence 2
    expect(binding3[0].adapterId).toBe("adapter-newSessionResponse"); // sequence 3
  });
});

describe("AdapterManager decideInboundWebhook", () => {
  it("accepts a valid inbound webhook decision for existing adapter", async () => {
    const config = {
      adapters: [
        {
          id: "approval-adapter",
          name: "Approval Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "after" as const,
            },
          ],
          inboundWebhook: { timeoutMs: 5000 },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      logLevel: TEST_LOG_LEVEL,
    });

    // Start execution to create a pending inbound decision
    const executionPromise = manager.executeAdapters({
      stage: 0,
      stepTag: "newSessionRequest",
      stepOrder: "after",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: {},
      payload: {},
    });

    // Give time for the inbound webhook to register
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Then trigger the decision
    const result = await manager.decideInboundWebhook({
      adapterId: "approval-adapter",
      sessionId: TEST_SESSION_ID,
      continue: true,
      reason: "Manual approval granted",
    });

    // Wait for execution to complete
    await executionPromise;

    expect(result.accepted).toBe(true);
    expect(result.sessionId).toBe(TEST_SESSION_ID);
    expect(result.message).toContain("resumed");
    expect(result.timestamp).toBeDefined();
  });

  it("rejects decision for unknown adapter", async () => {
    const config = {
      adapters: [
        {
          id: "known-adapter",
          name: "Known Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "after" as const,
            },
          ],
          inboundWebhook: { timeoutMs: 5000 },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      logLevel: TEST_LOG_LEVEL,
    });

    const result = await manager.decideInboundWebhook({
      adapterId: "unknown-adapter",
      sessionId: TEST_SESSION_ID,
      continue: true,
      reason: "Should fail",
    });

    expect(result.accepted).toBe(false);
    expect(result.sessionId).toBe(TEST_SESSION_ID);
    expect(result.message).toContain("Unknown adapter");
    expect(result.timestamp).toBeDefined();
  });

  it("rejects decision for adapter without inbound webhook configured", async () => {
    const config = {
      adapters: [
        {
          id: "outbound-only-adapter",
          name: "Outbound Only Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "before" as const,
            },
          ],
          outboundWebhook: { url: "http://localhost:9999/outbound" },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      logLevel: TEST_LOG_LEVEL,
    });

    const result = await manager.decideInboundWebhook({
      adapterId: "outbound-only-adapter",
      sessionId: TEST_SESSION_ID,
      continue: true,
      reason: "Should fail - no inbound webhook",
    });

    expect(result.accepted).toBe(false);
    expect(result.sessionId).toBe(TEST_SESSION_ID);
    expect(result.message).toContain("not configured for inbound webhooks");
    expect(result.timestamp).toBeDefined();
  });

  it("accepts rejection decision (continue=false) for valid adapter", async () => {
    const config = {
      adapters: [
        {
          id: "compliance-adapter",
          name: "Compliance Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage1,
              step: "checkTransferProposalRequestMessage",
              point: "after" as const,
            },
          ],
          inboundWebhook: { timeoutMs: 30000 },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      logLevel: TEST_LOG_LEVEL,
    });

    // Start execution to create a pending inbound decision
    const executionPromise = manager.executeAdapters({
      stage: 1,
      stepTag: "checkTransferProposalRequestMessage",
      stepOrder: "after",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: {},
      payload: {},
    });

    // Give time for the inbound webhook to register
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await manager.decideInboundWebhook({
      adapterId: "compliance-adapter",
      sessionId: TEST_SESSION_ID,
      continue: false,
      reason: "Compliance check failed - sanctions match",
    });

    // When continue=false, the execution will throw AdapterInboundWebhookRejectedError
    await expect(executionPromise).rejects.toThrow(
      "Inbound webhook rejected by external controller",
    );

    expect(result.accepted).toBe(true);
    expect(result.sessionId).toBe(TEST_SESSION_ID);
    expect(result.message).toContain("aborted");
    expect(result.timestamp).toBeDefined();
  });

  it("accepts decision with optional contextId and data", async () => {
    const config = {
      adapters: [
        {
          id: "data-adapter",
          name: "Data Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "after" as const,
            },
          ],
          inboundWebhook: { timeoutMs: 5000 },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      logLevel: TEST_LOG_LEVEL,
    });

    // Start execution to create a pending inbound decision
    const executionPromise = manager.executeAdapters({
      stage: 0,
      stepTag: "newSessionRequest",
      stepOrder: "after",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      gatewayId: TEST_GATEWAY_ID,
      metadata: {},
      payload: {},
    });

    // Give time for the inbound webhook to register
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await manager.decideInboundWebhook({
      adapterId: "data-adapter",
      sessionId: TEST_SESSION_ID,
      contextId: TEST_CONTEXT_ID,
      continue: true,
      reason: "Decision with additional data",
      data: { customField: "value", score: 95 },
    });

    // Wait for execution to complete
    await executionPromise;

    expect(result.accepted).toBe(true);
    expect(result.sessionId).toBe(TEST_SESSION_ID);
    expect(result.timestamp).toBeDefined();
  });

  it("returns ISO timestamp in decision result", async () => {
    const config = {
      adapters: [
        {
          id: "timestamp-adapter",
          name: "Timestamp Adapter",
          active: true,
          priority: 1,
          executionPoints: [
            {
              stage: SatpStageKey.Stage0,
              step: "newSessionRequest",
              point: "after" as const,
            },
          ],
          inboundWebhook: { timeoutMs: 5000 },
        },
      ],
      global: { logLevel: "debug" as const },
    };

    const manager = new AdapterManager({
      config,
      monitorService: createMonitorStub(),
      logLevel: TEST_LOG_LEVEL,
    });

    const beforeTimestamp = new Date().toISOString();
    const result = await manager.decideInboundWebhook({
      adapterId: "timestamp-adapter",
      sessionId: TEST_SESSION_ID,
      continue: true,
    });
    const afterTimestamp = new Date().toISOString();

    expect(result.timestamp).toBeDefined();
    expect(result.timestamp >= beforeTimestamp).toBe(true);
    expect(result.timestamp <= afterTimestamp).toBe(true);
  });
});
