import "jest-extended";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  SATPGateway,
  SATPGatewayConfig,
} from "../../../../main/typescript/plugin-satp-hermes-gateway";
import { PluginFactorySATPGateway } from "../../../../main/typescript/factory/plugin-factory-gateway-orchestrator";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  SupportedChain,
  Address,
} from "../../../../main/typescript/core/types";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "gateway-test",
});

describe("SATPGateway tests", () => {
  it("should initialize two gateways and test their interaction", async () => {
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };

    const factory = new PluginFactorySATPGateway(factoryOptions);
    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      supportedDLTs: [SupportedChain.BESU],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    };

    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    };

    const options1: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [gatewayIdentity2],
      bridgesConfig: [],
    };

    const options2: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [gatewayIdentity1],
      bridgesConfig: [],
    };
    const gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);
    await gateway1.startup();

    const gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    await gateway2.startup();

    log.info("gateway test!");

    await gateway1.shutdown();
    await gateway2.shutdown();
  });
});
