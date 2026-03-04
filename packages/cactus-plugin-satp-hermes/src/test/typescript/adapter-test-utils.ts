import { jest } from "@jest/globals";
import { AdapterManager } from "../../main/typescript/adapters/adapter-manager";
import type {
  AdapterDefinition,
  AdapterLayerConfiguration,
  GlobalAdapterDefaults,
  StageExecutionStep,
} from "../../main/typescript/adapters/adapter-config";
import {
  SatpStageKey,
  numberToStageKey,
} from "../../main/typescript/adapters/adapter-config";
import type { SATPLogger as Logger } from "../../main/typescript/core/satp-logger";
import type { MonitorService } from "../../main/typescript/services/monitoring/monitor";
import { loadAdapterConfigFromYaml as loadYaml } from "../../main/typescript/services/validation/config-validating-functions/validate-adapter-config";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  startTestServer,
  stopTestServer,
  type TestServerInfo,
} from "./adapter-test-server";

// ============================================================================
// Common Test Constants
// ============================================================================

/** Default log level for tests - DEBUG for visibility */
export const TEST_LOG_LEVEL: LogLevelDesc = "DEBUG";

/** Default timeout for outbound webhooks in tests (ms) */
export const DEFAULT_TIMEOUT_MS = 250;

/** Default retry attempts for webhook calls */
export const DEFAULT_RETRY_ATTEMPTS = 3;

/** Default delay between retry attempts (ms) */
export const DEFAULT_RETRY_DELAY_MS = 0;

/** Test webhook URL for outbound webhooks */
export const TEST_WEBHOOK_URL = "https://adapter.test/outbound";

/** Test session identifier */
export const TEST_SESSION_ID = "session-abc";

/** Test context identifier */
export const TEST_CONTEXT_ID = "ctx-xyz";

/** Test gateway identifier */
export const TEST_GATEWAY_ID = "gateway-test";

/** Fixtures directory path - YAML adapter configuration fixtures */
export const FIXTURES_DIR = path.resolve(__dirname, "..", "yaml", "fixtures");

// ============================================================================
// Pre-built Configurations for Stage 0 newSessionRequest
// ============================================================================

/**
 * Configuration for Stage 0 newSessionRequest with outbound webhook at "before"
 * and inbound webhook at "after" execution point.
 */
export const STAGE0_NEW_SESSION_REQUEST_CONFIG: AdapterLayerConfiguration = {
  adapters: [
    {
      id: "newSessionRequest-outbound-validator",
      name: "New Session Request Validator",
      description: "Validates new session request before processing",
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
        url: "http://localhost:9223/webhook/outbound/validate",
        timeoutMs: 5000,
        retryAttempts: 3,
        retryDelayMs: 1000,
      },
    },
    {
      id: "newSessionRequest-inbound-approval",
      name: "New Session Request Approval",
      description: "Awaits external approval after session request processing",
      active: true,
      priority: 2,
      executionPoints: [
        {
          stage: SatpStageKey.Stage0,
          step: "newSessionRequest",
          point: "after",
        },
      ],
      inboundWebhook: {
        timeoutMs: 3000, // 3 second timeout
      },
    },
  ],
  global: {
    timeoutMs: 5000,
    retryAttempts: 3,
    retryDelayMs: 500,
    logLevel: "info",
  },
};

export interface AdapterHarnessOptions {
  stepOrder?: StageExecutionStep;
  stage?: number;
  stepTag?: string;
  adapterOverrides?: Partial<AdapterDefinition>;
  globalDefaults?: GlobalAdapterDefaults;
  hasAdapters?: boolean;
  /** Log level for the AdapterManager. Defaults to TEST_LOG_LEVEL ("DEBUG"). */
  logLevel?: LogLevelDesc;
}

export interface AdapterInvocation {
  stage: number;
  stepTag: string;
  stepOrder: StageExecutionStep;
  sessionId: string;
  contextId?: string;
  gatewayId: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export interface AdapterHarness {
  manager: AdapterManager;
  fetchMock: jest.MockedFunction<typeof fetch>;
  adapter: AdapterDefinition;
  invocation: AdapterInvocation;
}

export function createAdapterHarness(
  overrides: AdapterHarnessOptions = {},
): AdapterHarness {
  const stage = overrides.stage ?? 1;
  const stageKey = numberToStageKey(stage);
  const stepTag = overrides.stepTag ?? "transferProposalRequest";
  const stepOrder = overrides.stepOrder ?? "before";

  const adapter: AdapterDefinition = {
    id: overrides.adapterOverrides?.id ?? "audit-hook",
    name: overrides.adapterOverrides?.name ?? "Audit Hook",
    description:
      overrides.adapterOverrides?.description ?? "Integration test adapter",
    active: overrides.adapterOverrides?.active ?? true,
    executionPoints: [
      {
        stage: stageKey,
        step: stepTag,
        point: stepOrder,
      },
    ],
    outboundWebhook: {
      url:
        overrides.adapterOverrides?.outboundWebhook?.url ??
        "https://adapter.test/outbound",
      retryAttempts:
        overrides.adapterOverrides?.outboundWebhook?.retryAttempts ?? 3,
      retryDelayMs:
        overrides.adapterOverrides?.outboundWebhook?.retryDelayMs ?? 0,
      timeoutMs: overrides.adapterOverrides?.outboundWebhook?.timeoutMs ?? 250,
    },
    inboundWebhook: overrides.adapterOverrides?.inboundWebhook,
  };

  const config: AdapterLayerConfiguration = {
    adapters: overrides.hasAdapters === false ? [] : [adapter],
    global: overrides.globalDefaults ?? {
      timeoutMs: 250,
      retryAttempts: 3,
      retryDelayMs: 0,
    },
  };

  const fetchMock = jest.fn<typeof fetch>();
  fetchMock.mockResolvedValue(createFetchResponse(200, { status: "ok" }));

  const manager = new AdapterManager({
    config,
    monitorService: createMonitorStub(),
    fetchImpl: fetchMock,
    logLevel: overrides.logLevel ?? TEST_LOG_LEVEL,
  });

  const invocation: AdapterInvocation = {
    stage,
    stepTag,
    stepOrder,
    sessionId: TEST_SESSION_ID,
    contextId: TEST_CONTEXT_ID,
    gatewayId: TEST_GATEWAY_ID,
    metadata: { test: true },
    payload: { sample: "payload" },
  };

  return { manager, fetchMock, adapter, invocation };
}

export function createFetchResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
): Response {
  const serialized =
    typeof body === "string" ? body : JSON.stringify(body ?? {});
  const headerEntries = headers;
  const headerLike = {
    forEach: (callback: (value: string, key: string) => void) => {
      Object.entries(headerEntries).forEach(([key, value]) =>
        callback(value, key),
      );
    },
  } as Headers;
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => serialized,
    headers: headerLike,
  } as unknown as Response;
}

export function createLoggerStub(): Logger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
}

export function createMonitorStub(): MonitorService {
  return {
    createLog: jest.fn(),
  } as unknown as MonitorService;
}

/**
 * Load adapter configuration from a JSON fixture file.
 *
 * @param fixtureName - Name of the JSON fixture file (without path)
 * @returns Parsed AdapterLayerConfiguration
 */
export function loadAdapterConfigFixture(
  fixtureName: string,
): AdapterLayerConfiguration {
  const filePath = path.resolve(FIXTURES_DIR, fixtureName);
  const serialized = readFileSync(filePath, { encoding: "utf-8" });
  return JSON.parse(serialized) as AdapterLayerConfiguration;
}

/**
 * Load adapter configuration from a YAML file.
 * Wrapper around the CLI's loadAdapterConfigFromYaml.
 *
 * @param configPath - Absolute path to YAML configuration file, or fixture name
 * @returns Parsed AdapterLayerConfiguration
 */
export function loadAdapterConfigFromYaml(
  configPath: string,
): AdapterLayerConfiguration {
  // If it's just a filename, resolve from fixtures directory
  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(FIXTURES_DIR, configPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Adapter configuration file not found: ${resolvedPath}`);
  }

  return loadYaml(resolvedPath);
}

/**
 * Create an adapter harness using the newSessionRequest YAML configuration.
 *
 * @param fetchMock - Optional fetch mock to use
 * @param logLevel - Optional log level, defaults to TEST_LOG_LEVEL ("DEBUG")
 * @returns AdapterHarness configured for Stage 0 newSessionRequest
 */
export function createNewSessionRequestHarness(
  fetchMock?: jest.MockedFunction<typeof fetch>,
  logLevel: LogLevelDesc = TEST_LOG_LEVEL,
): AdapterHarness {
  const config = STAGE0_NEW_SESSION_REQUEST_CONFIG;

  const mock = fetchMock ?? jest.fn<typeof fetch>();
  if (!fetchMock) {
    mock.mockResolvedValue(createFetchResponse(200, { status: "ok" }));
  }

  const manager = new AdapterManager({
    config,
    monitorService: createMonitorStub(),
    fetchImpl: mock,
    logLevel,
  });

  const invocation: AdapterInvocation = {
    stage: 0,
    stepTag: "newSessionRequest",
    stepOrder: "before",
    sessionId: TEST_SESSION_ID,
    contextId: TEST_CONTEXT_ID,
    gatewayId: TEST_GATEWAY_ID,
    metadata: { scenario: "newSessionRequest" },
    payload: { sessionData: "example" },
  };

  // Use the first adapter from config as the primary adapter reference
  const adapter = config.adapters[0];

  return { manager, fetchMock: mock, adapter, invocation };
}

// ============================================================================
// Test Server Management
// ============================================================================

// Re-export TestServerInfo type for convenience
export type { TestServerInfo };

// Active test server instance (for cleanup)
let activeTestServer: TestServerInfo | null = null;

/**
 * Start the adapter test server on a random available port.
 * Uses port 0 to let the OS allocate an available port.
 *
 * @returns Promise resolving to TestServerInfo with port and baseUrl
 */
export async function startAdapterTestServer(): Promise<TestServerInfo> {
  if (activeTestServer) {
    // Server already running, return existing instance
    return activeTestServer;
  }
  activeTestServer = await startTestServer();
  return activeTestServer;
}

/**
 * Stop the adapter test server and clean up resources.
 * Should be called in afterAll() to ensure proper cleanup.
 *
 * @returns Promise that resolves when server is stopped
 */
export async function stopAdapterTestServer(): Promise<void> {
  if (activeTestServer) {
    await stopTestServer(activeTestServer);
    activeTestServer = null;
  }
}

/**
 * Get the base URL of the currently running test server.
 * Throws if no test server is running.
 *
 * @returns Base URL like "http://localhost:12345"
 */
export function getTestServerBaseUrl(): string {
  if (!activeTestServer) {
    throw new Error(
      "Test server not running. Call startAdapterTestServer() first.",
    );
  }
  return activeTestServer.baseUrl;
}

/**
 * Patch adapter configuration to use the test server's dynamic port.
 * Replaces http://localhost:9223 with the actual test server base URL.
 *
 * This must be called after startAdapterTestServer() and after loading
 * the config from YAML.
 *
 * @param config - AdapterLayerConfiguration to patch
 * @returns The patched configuration (same object, modified in place)
 */
export function patchConfigWithTestServerUrl(
  config: AdapterLayerConfiguration,
): AdapterLayerConfiguration {
  const baseUrl = getTestServerBaseUrl();
  const oldBaseUrl = "http://localhost:9223";

  for (const adapter of config.adapters) {
    if (adapter.outboundWebhook?.url?.startsWith(oldBaseUrl)) {
      adapter.outboundWebhook.url = adapter.outboundWebhook.url.replace(
        oldBaseUrl,
        baseUrl,
      );
    }
  }

  return config;
}

/**
 * Load adapter config from YAML and patch URLs for test server.
 * Convenience function combining loadAdapterConfigFromYaml and patchConfigWithTestServerUrl.
 *
 * @param configName - Name of the YAML config file in fixtures directory
 * @returns Patched AdapterLayerConfiguration
 */
export function loadAndPatchTestServerConfig(
  configName: string,
): AdapterLayerConfiguration {
  const config = loadAdapterConfigFromYaml(configName);
  return patchConfigWithTestServerUrl(config);
}
