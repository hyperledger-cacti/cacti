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
import { EthereumTestEnvironment } from "../../test-utils";
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
import { logOperation } from "../../../../main/typescript/cross-chain-mechanisms/oracle/oracle-manager";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "oracle-logging-integration-test",
});

let monitorService: MonitorService;
let oracleApi: OracleApi;
let ethereumEnv: EthereumTestEnvironment;
let gateway: SATPGateway;
let ethereumContractAddress: string;

// Captured log entries for verification
const capturedLogEntries: any[] = [];
let persistLogEntrySpy: jest.SpyInstance;

const TIMEOUT = 900000;

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  monitorService = MonitorService.createOrGetMonitorService({
    enabled: true,
  });

  const businessLogicContract = "OracleTestContract";

  try {
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      { logLevel },
      [
        {
          assetType: SupportedEthereumContractTypes.ORACLE,
          contractName: businessLogicContract,
        },
      ],
    );
    log.info("Ethereum Ledger started successfully");
  } catch (err) {
    log.error("Error starting ledger: ", err);
    throw err;
  }

  ethereumContractAddress = await ethereumEnv.deployAndSetupOracleContracts(
    ClaimFormat.BUNGEE,
    "OracleTestContract",
    OracleTestContract,
  );

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

  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    gid: gatewayIdentity,
    ccConfig: {
      oracleConfig: [ethNetworkOptions],
    },
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    monitorService: monitorService,
  };

  gateway = await factory.create(options);
  expect(gateway).toBeInstanceOf(SATPGateway);

  await gateway.startup();

  const apiServer = await gateway.getOrCreateHttpServer();
  expect(apiServer).toBeInstanceOf(ApiServer);

  // Spy on GatewayPersistence.persistLogEntry
  // Access via OracleManager's dbLogger
  const oracleManager = (gateway as any).satpCrossChainManager?.oracleManager;
  if (oracleManager?.dbLogger) {
    persistLogEntrySpy = jest
      .spyOn(oracleManager.dbLogger, "persistLogEntry")
      .mockImplementation(async (entry: any) => {
        capturedLogEntries.push({ ...entry });
        log.debug(`Captured log entry: type=${entry.type}, operation=${entry.operation}`);
        return Promise.resolve();
      });
  } else {
    log.warn("Could not find dbLogger on OracleManager - logs won't be captured");
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

  await gateway.shutdown();
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

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.length).toBe(1);
    expect(response.data.operations?.[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    const taskId = response.data.taskID;

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 500));

    log.info(`Captured ${capturedLogEntries.length} log entries`);

    // Check for INIT log
    const initLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.INIT,
    );
    expect(initLog).toBeDefined();
    expect(initLog.type).toBe("oracle-update");

    // Check for EXEC log
    const execLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.EXEC,
    );
    expect(execLog).toBeDefined();

    // Check for DONE log
    const doneLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.DONE,
    );
    expect(doneLog).toBeDefined();
  });

  it("should persist INIT, EXEC, and DONE logs for a successful READ operation", async () => {
    // First write data
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

    capturedLogEntries.length = 0;

    // Read the data
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

    const taskId = response.data.taskID;

    await new Promise((resolve) => setTimeout(resolve, 500));

    const initLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.INIT,
    );
    expect(initLog).toBeDefined();
    expect(initLog.type).toBe("oracle-read");

    const execLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.EXEC,
    );
    expect(execLog).toBeDefined();

    const doneLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.DONE,
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

    await new Promise((resolve) => setTimeout(resolve, 500));

    const initLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.INIT,
    );
    expect(initLog).toBeDefined();

    const execLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.EXEC,
    );
    expect(execLog).toBeDefined();

    const failLog = capturedLogEntries.find(
      (e) => e.taskId === taskId && e.operation === logOperation.FAIL,
    );
    expect(failLog).toBeDefined();
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

    await new Promise((resolve) => setTimeout(resolve, 500));

    const logEntry = capturedLogEntries.find((e) => e.taskId === taskId);

    expect(logEntry).toBeDefined();
    expect(logEntry.taskId).toBe(taskId);
    expect(logEntry.oracleOperationId).toBe(operationId);
    expect(logEntry.type).toBe("oracle-update");
    expect(
      [logOperation.INIT, logOperation.EXEC, logOperation.DONE].includes(
        logEntry.operation,
      ),
    ).toBe(true);
  });
});