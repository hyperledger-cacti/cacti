import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerContainersIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  OracleApi,
  Configuration,
  OracleRegisterRequestTaskTypeEnum,
  OracleRegisterRequestTaskModeEnum,
  OracleExecuteRequestTaskTypeEnum,
} from "../../../../main/typescript";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import OracleTestContract from "../../../solidity/generated/OracleTestContract.sol/OracleTestContract.json";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});

let oracleApi: OracleApi;
let gateway: SATPGateway;

beforeAll(async () => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  //setup satp gateway
  const factoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };
  const factory = new PluginFactorySATPGateway(factoryOptions);

  const server1 = createServer();
  await new Promise<void>((resolve) => server1.listen(0, resolve));
  const gatewayServerPort = (server1.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server1.close(() => resolve()));

  const server2 = createServer();
  await new Promise<void>((resolve) => server2.listen(0, resolve));
  const gatewayClientPort = (server2.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server2.close(() => resolve()));

  const gatewayIdentity = {
    id: "mockID",
    name: "CustomGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    proofID: "mockProofID10",
    address: "http://localhost" as Address,
    gatewayServerPort,
    gatewayClientPort,
  } as GatewayIdentity;

  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    gid: gatewayIdentity,
    ccConfig: {
      oracleConfig: [],
    },
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    monitorService: monitorService,
  };
  gateway = await factory.create(options);
  expect(gateway).toBeInstanceOf(SATPGateway);

  const identity = gateway.Identity;
  // default servers
  expect(identity.gatewayServerPort).toBe(gatewayServerPort);
  expect(identity.gatewayClientPort).toBe(gatewayClientPort);
  expect(identity.address).toBe("http://localhost");
  await gateway.startup();

  const apiServer = await gateway.getOrCreateHttpServer();
  expect(apiServer).toBeInstanceOf(ApiServer);

  oracleApi = new OracleApi(
    new Configuration({ basePath: gateway.getAddressOApiAddress() }),
  );
  expect(oracleApi).toBeTruthy();
});

afterAll(async () => {
  await gateway.shutdown();

  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Oracle throws errors when invalid requests", () => {
  jest.setTimeout(20000);
  it("should fail when executing an Update task without methodName, contractName, params", async () => {
    await oracleApi
      .executeOracleTask({
        destinationNetworkId: {
          id: "invalid-network-id",
          ledgerType: LedgerType.Ethereum,
        },
        destinationContract: {
          contractAddress: "address",
          contractAbi: OracleTestContract.abi,
          contractBytecode: OracleTestContract.bytecode.object,
        },
        taskType: OracleExecuteRequestTaskTypeEnum.Update,
      })
      .catch((err) => {
        const errorObject = JSON.parse(err.response.data.error);

        expect(errorObject).toBeDefined();
        expect(errorObject.cause.message).toBe(
          "Missing required parameters for UPDATE task: methodName, contractName, params",
        );
        expect(errorObject.cause.name).toBe("MissingParameterError");
      });
  });

  it("should fail when executing a Read task without sourceNetworkId, sourceContract", async () => {
    await oracleApi
      .executeOracleTask({
        taskType: OracleExecuteRequestTaskTypeEnum.Read,
      })
      .catch((err) => {
        const errorObject = JSON.parse(err.response.data.error);

        expect(errorObject).toBeDefined();
        expect(errorObject.cause.message).toBe(
          "Missing required parameters for READ task: sourceNetworkId, sourceContract",
        );
        expect(errorObject.cause.name).toBe("MissingParameterError");
      });
  });

  it("should fail when executing a ReadAndUpdate task without sourceNetworkId, sourceContract, destinationNetworkId, destinationContract", async () => {
    await oracleApi
      .executeOracleTask({
        taskType: OracleExecuteRequestTaskTypeEnum.ReadAndUpdate,
      })
      .catch((err) => {
        const errorObject = JSON.parse(err.response.data.error);

        expect(errorObject).toBeDefined();
        expect(errorObject.cause.message).toBe(
          "Missing required parameters for READ_AND_UPDATE task: sourceNetworkId, sourceContract, destinationNetworkId, destinationContract",
        );
        expect(errorObject.cause.name).toBe("MissingParameterError");
      });
  });

  it("should fail when registering a Polling task without pollingInterval", async () => {
    await oracleApi
      .registerOracleTask({
        destinationNetworkId: {
          id: "invalid-network-id",
          ledgerType: LedgerType.Ethereum,
        },
        destinationContract: {
          contractAddress: "address",
          contractAbi: OracleTestContract.abi,
          contractBytecode: OracleTestContract.bytecode.object,
        },
        taskType: OracleRegisterRequestTaskTypeEnum.Update,
        taskMode: OracleRegisterRequestTaskModeEnum.Polling,
      })
      .catch((err) => {
        const errorObject = JSON.parse(err.response.data.error);

        expect(errorObject).toBeDefined();
        expect(errorObject.cause.message).toBe(
          "Missing required parameter for UPDATE task and mode POLLING: pollingInterval",
        );
        expect(errorObject.cause.name).toBe("MissingParameterRegisterError");
      });
  });

  it("should fail when registering an Event Listening task without eventSignature", async () => {
    await oracleApi
      .registerOracleTask({
        sourceNetworkId: {
          id: "invalid-network-id",
          ledgerType: LedgerType.Ethereum,
        },
        sourceContract: {
          contractName: "OracleTestContract",
          contractAddress: "address",
          contractAbi: OracleTestContract.abi,
          contractBytecode: OracleTestContract.bytecode.object,
        },
        listeningOptions: {
          eventSignature: "",
        },
        taskType: OracleRegisterRequestTaskTypeEnum.Read,
        taskMode: OracleRegisterRequestTaskModeEnum.EventListening,
      })
      .catch((err) => {
        const errorObject = JSON.parse(err.response.data.error);

        expect(errorObject).toBeDefined();
        expect(errorObject.cause.message).toBe(
          "Missing required parameter for READ task and mode EVENT_LISTENING: listeningOptions.eventSignature",
        );
        expect(errorObject.cause.name).toBe("MissingParameterRegisterError");
      });
  });

  it("should fail when registering an Event Listening task with pollingInterval", async () => {
    await oracleApi
      .registerOracleTask({
        sourceNetworkId: {
          id: "invalid-network-id",
          ledgerType: LedgerType.Ethereum,
        },
        sourceContract: {
          contractName: "OracleTestContract",
          contractAddress: "address",
          contractAbi: OracleTestContract.abi,
          contractBytecode: OracleTestContract.bytecode.object,
        },
        listeningOptions: {
          eventSignature: "event(bytes32)",
        },
        taskType: OracleRegisterRequestTaskTypeEnum.Read,
        taskMode: OracleRegisterRequestTaskModeEnum.EventListening,
        pollingInterval: 1000,
      })
      .catch((err) => {
        const errorObject = JSON.parse(err.response.data.error);

        expect(errorObject).toBeDefined();
        expect(errorObject.cause.message).toBe(
          "Invalid parameter for READ task and mode EVENT_LISTENING: pollingInterval",
        );
        expect(errorObject.cause.name).toBe("InvalidParameterError");
      });
  });
});
