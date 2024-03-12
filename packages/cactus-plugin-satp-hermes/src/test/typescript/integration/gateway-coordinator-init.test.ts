import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Logger, LoggerProvider } from "@hyperledger/cactus-common";
// import coordinator factory, coordinator and coordinator options
import {
  SATPGateway,
  SATPGatewayConfig,
} from "../../../main/typescript/gateway-refactor";
import { PluginFactorySATPGateway } from "../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ShutdownHook, SupportedGatewayImplementations } from "./../../../main/typescript/core/types";

const logLevel: LogLevelDesc = "INFO";
const logger = LoggerProvider.getOrCreate({
  level: "INFO",
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

describe("SATPGateway initialization", () => {
  it("initiates with default config", async () => {
    const options: SATPGatewayConfig = {};
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.getIdentity();
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: "v02",
        Architecture: "v02",
        Crash: "v02",
      },
    ]);
    expect(identity.supportedChains).toEqual([
      SupportedGatewayImplementations.FABRIC,
      SupportedGatewayImplementations.BESU,
    ]);
    expect(identity.proofID).toBe("mockProofID1");
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.address).toBe("http://localhost");
  });

  test("initiates custom config Gateway Coordinator", async () => {
    const options: SATPGatewayConfig = {
      logLevel: "INFO",
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
        address: "https://localhost",
      },
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.getIdentity();
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: "v1",
        Architecture: "v1",
        Crash: "v1",
      },
    ]);
    expect(identity.supportedChains).toEqual([
      SupportedGatewayImplementations.FABRIC,
      SupportedGatewayImplementations.BESU,
    ]);
    expect(identity.proofID).toBe("mockProofID10");
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.address).toBe("https://localhost");
  });

  test("Gateway Server launches", async () => {
    const options: SATPGatewayConfig = {
      logLevel: "INFO",
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: "v02",
            Architecture: "v02",
            Crash: "v02",
          },
        ],
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID10",
        address: "https://localhost",
      },
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.getIdentity();
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("https://localhost");
    await gateway.startup();
    await gateway.shutdown();
  });

  it("shutdown hooks work", async () => {
const options: SATPGatewayConfig = {
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: "v02",
            Architecture: "v02",
            Crash: "v02",
          },
        ],
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID10",
        gatewayServerPort: 3014,
        gatewayClientPort: 3015,
        address: "https://localhost",
      },
    };

    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
    
    // ensure logger is called with "mockHook"
    const loggerSpy = jest.spyOn(logger, 'info');

    // ensure mockHookFn is called on shutdown
    const mockHookFn = jest.fn(async () => {
        logger.info("mockHook");
      });


    const shutdownHook: ShutdownHook = {
      name: "mockHook",
      hook: async () => {
        logger.info("mockHook");
      },
    };
    
    const shutdownHookFn: ShutdownHook = {
      name: "mockHookFn",
      hook: mockHookFn
    };
    
    gateway.onShutdown(shutdownHook);
    gateway.onShutdown(shutdownHookFn);
    await gateway.startup();
    await gateway.shutdown();

    expect(loggerSpy).toHaveBeenCalledWith("mockHook");
    expect(mockHookFn).toHaveBeenCalled();

    // for now, technically not needed. However if we use more tests with loggerSpy, conflicts could arise. This is a reminder to restore the spy after each test
    loggerSpy.mockRestore();
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
