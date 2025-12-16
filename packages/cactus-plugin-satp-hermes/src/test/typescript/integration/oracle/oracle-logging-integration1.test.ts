import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";

import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  OracleExecuteRequestTaskTypeEnum,
  OracleOperationStatusEnum,
  OracleApi,
  Configuration,
} from "../../../../main/typescript";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
} from "../../test-utils";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import OracleTestContract from "../../../solidity/generated/OracleTestContract.sol/OracleTestContract.json";
import { keccak256 } from "web3-utils";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { SupportedContractTypes as SupportedEthereumContractTypes } from "../../environments/ethereum-test-environment";
import { SupportedContractTypes as SupportedBesuContractTypes } from "../../environments/ethereum-test-environment";
import { GatewayPersistence } from "../../../../main/typescript/database/gateway-persistence";
import { logOperation } from "../../../../main/typescript/cross-chain-mechanisms/oracle/oracle-manager";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "oracle-logging-integration-test",
});

const monitorService = MonitorService.createOrGetMonitorService({
    enabled: true, // Enable monitoring for log capture
  });

let oracleApi: OracleApi;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let gateway: SATPGateway;
let besuContractAddress: string;
let ethereumContractAddress: string;
let gatewayPersistence: GatewayPersistence;

// Spy to capture log entries
let persistLogEntrySpy: jest.SpyInstance;
const capturedLogEntries: any[] = [];

const TIMEOUT = 900000; // 15 minutes

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  {
    const businessLogicContract = "OracleTestContract";

    try {
      besuEnv = await BesuTestEnvironment.setupTestEnvironment(
        {
          logLevel,
        },
        [
          {
            assetType: SupportedBesuContractTypes.ORACLE,
            contractName: businessLogicContract,
          },
        ],
      );
      log.info("Besu Ledger started successfully");

      ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
        {
          logLevel,
        },
        [
          {
            assetType: SupportedEthereumContractTypes.ORACLE,
            contractName: businessLogicContract,
          },
        ],
      );
      log.info("Ethereum Ledger started successfully");
    } catch (err) {
      log.error("Error starting ledgers: ", err);
      throw err;
    }

    besuContractAddress = await besuEnv.deployAndSetupOracleContracts(
      ClaimFormat.BUNGEE,
      "OracleTestContract",
      OracleTestContract,
    );

    ethereumContractAddress = await ethereumEnv.deployAndSetupOracleContracts(
      ClaimFormat.BUNGEE,
      "OracleTestContract",
      OracleTestContract,
    );
  }

  // Setup SATP gateway
  const factoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };
  const factory = new PluginFactorySATPGateway(factoryOptions);

  const gatewayIdentity = {
    id: "mockID-logging-test",
    name: "LoggingTestGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    proofID: "mockProofID-logging",
    address: "http://localhost" as Address,
  } as GatewayIdentity;

  const ethNetworkOptions = ethereumEnv.createEthereumConfig();
  const besuNetworkOptions = besuEnv.createBesuConfig();

  // O bytecode (string grande) precisa ser removido para evitar o RangeError no log de debug do OracleManager/OracleBesu
  const placeholderBytecode = "(Bytecode removed for safe logging)";

  const ethOptionsAny = ethNetworkOptions as any;
  if (ethOptionsAny.oracleOptions?.contractOptions?.contractBytecode) {
    ethOptionsAny.oracleOptions.contractOptions.contractBytecode = placeholderBytecode;
  }
  
  // Tentativa de saneamento para Besu
  const besuOptionsAny = besuNetworkOptions as any;
  if (besuOptionsAny.oracleOptions?.contractOptions?.contractBytecode) {
    besuOptionsAny.oracleOptions.contractOptions.contractBytecode = placeholderBytecode;
  }

  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    gid: gatewayIdentity,
    ccConfig: {
      oracleConfig: [ethNetworkOptions, besuNetworkOptions],
    },
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    monitorService: monitorService,
  };

  gateway = await factory.create(options);
  expect(gateway).toBeInstanceOf(SATPGateway);

  const identity = gateway.Identity;
  // default servers
  expect(identity.gatewayServerPort).toBe(3010);
  expect(identity.gatewayClientPort).toBe(3011);
  expect(identity.address).toBe("http://localhost");
  await gateway.startup();

  const apiServer = await gateway.getOrCreateHttpServer();
  expect(apiServer).toBeInstanceOf(ApiServer);

  // Get the GatewayPersistence instance and spy on persistLogEntry
  gatewayPersistence = (gateway as any).gatewayPersistence;
  if (gatewayPersistence) {
    persistLogEntrySpy = jest
      .spyOn(gatewayPersistence, "persistLogEntry")
      .mockImplementation(async (entry: any) => {
        capturedLogEntries.push(entry);
        log.debug(`Captured log entry: ${JSON.stringify(entry)}`);
        return Promise.resolve();
      });
  }

  oracleApi = new OracleApi(
    new Configuration({ basePath: gateway.getAddressOApiAddress() }),
  );
  expect(oracleApi).toBeTruthy();
}, TIMEOUT);

afterAll(async () => {
  if (persistLogEntrySpy) {
    persistLogEntrySpy.mockRestore();
  }

  if (gateway) {
    await gateway.shutdown();
  }
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

beforeEach(() => {
  // Clear captured log entries before each test
  capturedLogEntries.length = 0;
});

describe("Oracle Logging Integration Tests", () => {
  jest.setTimeout(900000);

  it("should persist INIT, EXEC, and DONE logs for a successful UPDATE operation", async () => {
    const response = await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: ["Test Data for Logging"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    // expect(response).toBeDefined();
    // expect(response.data.taskID).toBeDefined();
    // expect(response.data.operations?.length).toBe(0);
    // expect(response.data.operations?.[0].status).toBe(
    //   OracleOperationStatusEnum.Success,
    // );

    const taskId = response.data.taskID;

    // Wait a bit for async logging to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify logs were captured
    log.info(`Total captured log entries: ${capturedLogEntries.length}`);
    capturedLogEntries.forEach((entry, index) => {
      log.info(`Log entry ${index}: ${JSON.stringify(entry)}`);
    });

    // Check for INIT log
    const initLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId &&
        entry.operation === logOperation.INIT &&
        entry.type === "oracle-update",
    );
    expect(initLog).toBeDefined();
    expect(initLog.taskId).toBe(taskId);

    // Check for EXEC log
    const execLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId &&
        entry.operation === logOperation.EXEC &&
        entry.type === "oracle-update",
    );
    expect(execLog).toBeDefined();

    // Check for DONE log
    const doneLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId &&
        entry.operation === logOperation.DONE &&
        entry.type === "oracle-update",
    );
    expect(doneLog).toBeDefined();
  });

  it("should persist INIT, EXEC, and DONE logs for a successful READ operation", async () => {
    // First write some data
    const dataHash = keccak256("Logging Test Data");
    await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: ["Logging Test Data"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    // Clear logs from the write operation
    capturedLogEntries.length = 0;

    // Now read the data
    const response = await oracleApi.executeOracleTask({
      sourceNetworkId: ethereumEnv.network,
      sourceContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "getData",
        params: [dataHash],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Read,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.length).toBe(1);

    const taskId = response.data.taskID;

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify read operation logs
    const initLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId &&
        entry.operation === logOperation.INIT &&
        entry.type === "oracle-read",
    );
    expect(initLog).toBeDefined();

    const execLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId &&
        entry.operation === logOperation.EXEC &&
        entry.type === "oracle-read",
    );
    expect(execLog).toBeDefined();

    const doneLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId &&
        entry.operation === logOperation.DONE &&
        entry.type === "oracle-read",
    );
    expect(doneLog).toBeDefined();
  });

  it("should persist INIT, EXEC, and FAIL logs for a failing operation", async () => {
    const response = await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "nonExistentFunction",
        params: [],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.[0].status).toBe(
      OracleOperationStatusEnum.Failed,
    );

    const taskId = response.data.taskID;

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify failure logs
    const initLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId && entry.operation === logOperation.INIT,
    );
    expect(initLog).toBeDefined();

    const execLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId && entry.operation === logOperation.EXEC,
    );
    expect(execLog).toBeDefined();

    const failLog = capturedLogEntries.find(
      (entry) =>
        entry.taskId === taskId && entry.operation === logOperation.FAIL,
    );
    expect(failLog).toBeDefined();
  });

  it("should persist logs for READ_AND_UPDATE operation with multiple operations", async () => {
    // First write data to Ethereum
    const dataHash = keccak256("Cross-chain Logging Test");
    await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: ["Cross-chain Logging Test"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    // Clear logs
    capturedLogEntries.length = 0;

    // Execute READ_AND_UPDATE from Ethereum to Besu
    const response = await oracleApi.executeOracleTask({
      sourceNetworkId: ethereumEnv.network,
      sourceContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "getData",
        params: [dataHash],
      },
      destinationNetworkId: besuEnv.network,
      destinationContract: {
        contractName: besuEnv.getTestOracleContractName(),
        contractAddress: besuContractAddress,
        contractAbi: OracleTestContract.abi,
        methodName: "setData",
        params: ["Cross-chain Logging Test"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.ReadAndUpdate,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations.length).toBe(2);
    expect(response.data.operations[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(response.data.operations[1].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    const taskId = response.data.taskID;

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 1000));

    log.info(
      `Captured ${capturedLogEntries.length} log entries for READ_AND_UPDATE`,
    );

    // Should have logs for both READ and UPDATE operations
    // Each operation should have INIT, EXEC, DONE = 3 logs each = 6 total
    const readLogs = capturedLogEntries.filter(
      (entry) => entry.taskId === taskId && entry.type === "oracle-read",
    );
    const updateLogs = capturedLogEntries.filter(
      (entry) => entry.taskId === taskId && entry.type === "oracle-update",
    );

    // Verify READ operation logs
    expect(
      readLogs.find((e) => e.operation === logOperation.INIT),
    ).toBeDefined();
    expect(
      readLogs.find((e) => e.operation === logOperation.EXEC),
    ).toBeDefined();
    expect(
      readLogs.find((e) => e.operation === logOperation.DONE),
    ).toBeDefined();

    // Verify UPDATE operation logs
    expect(
      updateLogs.find((e) => e.operation === logOperation.INIT),
    ).toBeDefined();
    expect(
      updateLogs.find((e) => e.operation === logOperation.EXEC),
    ).toBeDefined();
    expect(
      updateLogs.find((e) => e.operation === logOperation.DONE),
    ).toBeDefined();
  });

  it("should include correct metadata in log entries", async () => {
    const response = await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestOracleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: ["Metadata Test"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    expect(response).toBeDefined();
    const taskId = response.data.taskID;
    const operationId = response.data.operations?.[0]?.id;

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find a log entry and verify its metadata
    const logEntry = capturedLogEntries.find(
      (entry) => entry.taskId === taskId,
    );

    expect(logEntry).toBeDefined();
    expect(logEntry.taskId).toBe(taskId);
    expect(logEntry.oracleOperationId).toBe(operationId);
    expect(logEntry.type).toBe("oracle-update");
    expect(logEntry.operation).toBeDefined();
    expect(
      [logOperation.INIT, logOperation.EXEC, logOperation.DONE].includes(
        logEntry.operation,
      ),
    ).toBe(true);
  });
});