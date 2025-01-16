import "jest-extended";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { ApiClient } from "@hyperledger/cactus-api-client";

// import coordinator factory, coordinator and coordinator options
import {
  SATPGateway,
  SATPGatewayConfig,
} from "../../../main/typescript/plugin-satp-hermes-gateway";
import { PluginFactorySATPGateway } from "../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  Configuration,
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  ShutdownHook,
  SupportedChain,
} from "./../../../main/typescript/core/types";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import { AddressInfo } from "net";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { AdminApi } from "../../../main/typescript";
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

describe("SATPGateway initialization", () => {
  it("should initiate gateway with default config", async () => {
    const options: SATPGatewayConfig = {};
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ]);
    expect(identity.supportedDLTs).toEqual([]);
    expect(identity.gatewayServerPort).toBe(DEFAULT_PORT_GATEWAY_SERVER);
    expect(identity.gatewayClientPort).toBe(DEFAULT_PORT_GATEWAY_CLIENT);
    expect(identity.gatewayOpenAPIPort).toBe(DEFAULT_PORT_GATEWAY_API);
    expect(identity.address).toBe("http://localhost");
  });

  it("should initiate gateway with custom config", async () => {
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
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
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
    expect(identity.supportedDLTs).toEqual([
      SupportedChain.FABRIC,
      SupportedChain.BESU,
    ]);
    expect(identity.proofID).toBe("mockProofID10");
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.address).toBe("https://localhost");
  });

  it("should launch gateway server", async () => {
    const options: SATPGatewayConfig = {
      logLevel: logLevel,
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
        proofID: "mockProofID10",
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
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
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
        proofID: "mockProofID10",
        gatewayServerPort: 3014,
        gatewayClientPort: 3015,
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };

    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    // ensure logger is called with "mockHook"
    const loggerSpy = jest.spyOn(logger, "info");

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
      hook: mockHookFn,
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

describe("SATPGateway startup", () => {
  it("initiates with default config", async () => {
    const options: SATPGatewayConfig = {
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.name).toBeDefined();
    expect(identity.version).toEqual([
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ]);
    expect(identity.supportedDLTs).toEqual([]);
    expect(identity.gatewayServerPort).toBe(DEFAULT_PORT_GATEWAY_SERVER);
    expect(identity.gatewayClientPort).toBe(DEFAULT_PORT_GATEWAY_CLIENT);
    expect(identity.gatewayOpenAPIPort).toBe(DEFAULT_PORT_GATEWAY_API);
    expect(identity.address).toBe("http://localhost");
  });

  test("initiates custom config Gateway Coordinator", async () => {
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
        gatewayClientPort: 3001,
        address: "https://localhost",
      },
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
    const gateway = await factory.create(options);

    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
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
    expect(identity.supportedDLTs).toEqual([
      SupportedChain.FABRIC,
      SupportedChain.BESU,
    ]);
    expect(identity.proofID).toBe("mockProofID10");
    expect(identity.gatewayClientPort).toBe(3001);
    expect(identity.address).toBe("https://localhost");
  });

  test("Gateway Server launches", async () => {
    const options: SATPGatewayConfig = {
      logLevel: logLevel,
      gid: {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
        proofID: "mockProofID10",
        gatewayServerPort: 13010,
        gatewayClientPort: 13011,
        gatewayOpenAPIPort: 4010,
        address: "http://localhost",
      },
      enableOpenAPI: true,
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };
    const gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    expect(identity.gatewayServerPort).toBe(13010);
    expect(identity.gatewayClientPort).toBe(13011);
    expect(identity.address).toBe("http://localhost");
    const httpServer2 = await Servers.startOnPreferredPort(
      DEFAULT_PORT_GATEWAY_API,
    );
    const addressInfo1 = httpServer2.address() as AddressInfo;
    const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;
    const pluginRegistry = new PluginRegistry({ plugins: [] });

    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfo1.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.crpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config =
      await configService.newExampleConfigConvict(apiServerOptions);
    pluginRegistry.add(gateway);
    await gateway.onPluginInit();
    const apiServer1 = new ApiServer({
      httpServerApi: httpServer2,
      config: config.getProperties(),
      pluginRegistry,
    });

    await apiServer1.start();
    const config1 = new Configuration({ basePath: node1Host });
    const mainApiClient = new ApiClient(config1);
    const admin = mainApiClient.extendWith(AdminApi);

    const result = await admin.getSessionIds();
    expect(result).toBeDefined();
    expect(result.status).toBe(200);
    apiServer1.shutdown();
    httpServer2.close();
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
