/*
import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  SATPGateway,
  SATPGatewayConfig,
} from "../../../main/typescript/plugin-satp-hermes-gateway";
import { PluginFactorySATPGateway } from "../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { SupportedChain } from "./../../../main/typescript/core/types";
import axios from "axios";

const logLevel: LogLevelDesc = "INFO";

const factoryOptions: IPluginFactoryOptions = {
  pluginImportType: PluginImportType.Local,
};
const factory = new PluginFactorySATPGateway(factoryOptions);

describe("SATPGateway Client", () => {
  let gateway: SATPGateway;

  beforeAll(async () => {
    const options: SATPGatewayConfig = {
      logLevel: "INFO",
      gid: {
        id: "testGateway",
        name: "TestGateway",
        version: [
          {
            Core: "v02",
            Architecture: "v02",
            Crash: "v02",
          },
        ],
        supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
        proofID: "testProofID",
        gatewayClientPort: 3020,
        address: "http://localhost",
      },
    };
    gateway = await factory.create(options);
    await gateway.startup();
  });

  afterAll(async () => {
    await gateway.shutdown();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  it("should respond to client requests", async () => {
    const clientPort = gateway.Identity.gatewayClientPort;
    const baseUrl = `http://localhost:${clientPort}`;

    // Test the health endpoint
    const healthResponse = await axios.get(`${baseUrl}/health`);
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data).toHaveProperty("status", "OK");

    // Test getting gateway identity
    const identityResponse = await axios.get(
      `${baseUrl}/api/v1/gateway/identity`,
    );
    expect(identityResponse.status).toBe(200);
    expect(identityResponse.data).toMatchObject({
      id: "testGateway",
      name: "TestGateway",
      supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
      proofID: "testProofID",
    });

    // Test unsupported endpoint
    try {
      await axios.get(`${baseUrl}/unsupported`);
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

  it("should handle client errors gracefully", async () => {
    const clientPort = gateway.Identity.gatewayClientPort;
    const baseUrl = `http://localhost:${clientPort}`;

    // Test invalid request body
    try {
      await axios.post(`${baseUrl}/api/v1/some/endpoint`, {
        invalidData: true,
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
    }

    // Test unauthorized access
    try {
      await axios.get(`${baseUrl}/api/v1/protected/resource`);
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
});
*/
