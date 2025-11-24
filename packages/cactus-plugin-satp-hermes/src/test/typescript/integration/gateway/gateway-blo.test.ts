import "jest-extended";
import {
  Containers,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { type LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { PluginFactorySATPGateway } from "../../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  type IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import type { SATPGatewayConfig } from "../../../../main/typescript/plugin-satp-hermes-gateway";
import { createClient } from "../../test-utils";
import {
  HealthCheckResponseStatusEnum,
  StatusResponseStatusEnum,
} from "../../../../main/typescript";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

const logLevel: LogLevelDesc = "DEBUG";
const logger = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "satp-gateway-orchestrator-init-test",
});
const factoryOptions: IPluginFactoryOptions = {
  pluginImportType: PluginImportType.Local,
};
const factory = new PluginFactorySATPGateway(factoryOptions);
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});

beforeAll(async () => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

const options: SATPGatewayConfig = {
  logLevel: logLevel,
  instanceId: "gateway-orchestrator-instance-id",
  gid: {
    id: "mockID",
    name: "CustomGateway",
    version: [
      {
        Core: "v1",
        Architecture: "v1",
        Crash: "v1",
      },
    ],
    proofID: "mockProofID10",
    gatewayServerPort: 3010,
    gatewayClientPort: 3011,
    address: "http://localhost",
  },
  pluginRegistry: new PluginRegistry({ plugins: [] }),
  monitorService: monitorService,
};

describe("GetStatus Endpoint and Functionality testing", () => {
  test("GetStatus endpoint returns error for non-existent session", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOapiPort!;

      await gateway.getOrCreateHttpServer();

      const adminApiClient = createClient("AdminApi", address, port, logger);

      const statusRequest = {
        sessionID: "test-session-id",
      };

      await expect(
        adminApiClient.getStatus(statusRequest.sessionID),
      ).rejects.toMatchObject({
        response: {
          data: {
            error: expect.stringContaining("Session not found"),
          },
        },
      });
    } finally {
      await gateway.shutdown();
    }
  });

  test("GetStatus endpoint returns status for an existing session", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOapiPort!;

      await gateway.getOrCreateHttpServer();

      // Get the SATPManager and create a session
      const dispatcher = gateway.BLODispatcherInstance;
      expect(dispatcher).toBeDefined();
      const manager = await dispatcher!.getManager();

      // Create a new session using the manager's getOrCreateSession method
      const session = manager.getOrCreateSession(undefined, "test-context-id");
      const sessionId = session.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);

      const adminApiClient = createClient("AdminApi", address, port, logger);

      // Now getStatus should succeed for this session
      const result = await adminApiClient.getStatus(sessionId);
      expect(result).toBeDefined();
      expect(result.status).toBe(200);
      expect(result.data.status).toBe(StatusResponseStatusEnum.Pending);
    } finally {
      await gateway.shutdown();
    }
  });

  test("Healthcheck works", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOapiPort!;

      await gateway.getOrCreateHttpServer();

      const adminApiClient = createClient("AdminApi", address, port, logger);

      const result = await adminApiClient.getHealthCheck();
      expect(result).toBeDefined();
      expect(result.status).toBe(200);
      expect(result.data.status).toBe(HealthCheckResponseStatusEnum.Available);
    } finally {
      await gateway.shutdown();
    }
  });

  test("Integrations works", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOapiPort!;

      await gateway.getOrCreateHttpServer();

      const transactApiClient = createClient(
        "TransactionApi",
        address,
        port,
        logger,
      );

      const result = await transactApiClient.getIntegrations();
      expect(result).toBeDefined();
      expect(result.status).toBe(200);
      expect(result.data.integrations).toBeDefined();
      expect(result.data.integrations.length).toBe(0); // No integrations yet
    } finally {
      await gateway.shutdown();
    }
  });

  test("Oracle endpoint returns error for non-existent task", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOapiPort!;

      await gateway.getOrCreateHttpServer();

      const oracleApiClient = createClient("OracleApi", address, port, logger);

      await expect(
        oracleApiClient.getOracleTaskStatus("test-task-id"),
      ).rejects.toMatchObject({
        response: {
          data: {
            error: expect.stringContaining("test-task-id not found"),
          },
        },
      });
    } finally {
      await gateway.shutdown();
    }
  });
});

afterAll(async () => {
  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
