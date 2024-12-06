import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { PluginFactorySATPGateway } from "../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import {
  SATPGatewayConfig,
  SupportedChain,
} from "../../../main/typescript/core/types";
import { createClient } from "../test-utils";
import { HealthCheckResponseStatusEnum } from "../../../main/typescript";
import {
  knexClientConnection,
  knexSourceRemoteConnection,
} from "../knex.config";

const logLevel: LogLevelDesc = "DEBUG";
const logger = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "satp-gateway-orchestrator-init-test",
});
const factoryOptions: IPluginFactoryOptions = {
  pluginImportType: PluginImportType.Local,
};
const factory = new PluginFactorySATPGateway(factoryOptions);

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
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
    supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
    proofID: "mockProofID10",
    gatewayServerPort: 3010,
    gatewayClientPort: 3011,
    gatewayOpenAPIPort: 4010,
    address: "http://localhost",
  },
  knexLocalConfig: knexClientConnection,
  knexRemoteConfig: knexSourceRemoteConnection,
};

describe("GetStatus Endpoint and Functionality testing", () => {
  test("GetStatus endpoint works", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOpenAPIPort!;

      const adminApiClient = createClient("AdminApi", address, port, logger);

      const statusRequest = {
        sessionID: "test-session-id",
      };

      await adminApiClient.getStatus(statusRequest.sessionID);
    } catch (error) {
      expect(error.response.data.error).toContain("Session not found");
    } finally {
      await gateway.shutdown();
    }
  });

  test("Healthcheck works", async () => {
    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayOpenAPIPort!;

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
      const port = options.gid!.gatewayOpenAPIPort!;

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
      expect(result.data.integrations).toHaveLength(2);
      // the type of the first integration is "fabric"
      expect(result.data.integrations[0].type).toEqual("fabric");
      // the type of the second integration is "besu"
      expect(result.data.integrations[1].type).toEqual("besu");
    } finally {
      await gateway.shutdown();
    }
  });
});

afterAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      logger.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
