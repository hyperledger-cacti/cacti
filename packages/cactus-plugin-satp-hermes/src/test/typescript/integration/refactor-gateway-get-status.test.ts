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

import { StatusRequest, StatusResponse, Configuration, AdminApiFactory, AdminApi } from "../../../main/typescript/generated/openapi-blo/typescript-axios";
import { SATPGatewayConfig, SupportedGatewayImplementations } from "../../../main/typescript/core/types";
import { SATPGateway } from "../../../main/typescript/gateway-refactor";
import { createClient } from "../test-utils";
import { log } from "console";

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

// TODO create unit tests of the services to test that GetStatus functionality works (access via BLODispatcher)
describe("GetStatus Endpoint and Functionality testing", () => {

  test("GetStatus endpoint works - SDK call", async () => {
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
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID10",
        gatewayServerPort: 3010,
        gatewayClientPort: 3011,
        address: "http://localhost",
      },
    };

    const gateway = await factory.create(options);

    try {
      await gateway.startup();
      const address = options.gid!.address!;
      const port = options.gid!.gatewayClientPort!;
      const apiType = "AdminApi";

      const adminApiClient = createClient('AdminApi', address, port, logger); 

      const statusRequest = {
        sessionID: "test-session-id",
      };


      const response = await adminApiClient.getStatus(statusRequest.sessionID);

      // expect(response.status).toBe(200);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(response.status).toBe(200)
      expect(response.data).toBeDefined();

    } catch (error) {
      logger.error(`Error: ${error}`);
      throw new Error(`Unexpected error during API call`);
    } finally {
      await gateway.shutdown();
    }
  });

  // TODO create integration tests of the services to test that GetStatus functionality works
  test("GetStatus functionality works", async () => {
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


