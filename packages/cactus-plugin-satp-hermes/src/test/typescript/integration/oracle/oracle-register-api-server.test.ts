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
  OracleTaskStatusEnum,
  OracleRegisterRequestTaskModeEnum,
  OracleTaskTypeEnum,
  OracleTaskModeEnum,
  OracleOperationStatusEnum,
  OracleOperationTypeEnum,
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
  FabricTestEnvironment,
} from "../../test-utils";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import OracleTestContract from "../../../solidity/generated/oracle-contract.sol/OracleTestContract.json";
import { keccak256 } from "web3-utils";
import { BLODispatcher } from "../../../../main/typescript/api1/dispatcher";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let oracleApi: OracleApi;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let fabricEnv: FabricTestEnvironment;
let gateway: SATPGateway;
let dispatcher: BLODispatcher;
let besuContractAddress: string;
let ethereumContractAddress: string;
let data_hash: string;

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
      besuEnv = await BesuTestEnvironment.setupTestEnvironment({
        contractName: businessLogicContract,
        logLevel,
      });
      log.info("Besu Ledger started successfully");

      ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
        contractName: businessLogicContract,
        logLevel,
      });

      fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
        contractName: businessLogicContract,
        logLevel,
      });
    } catch (err) {
      log.error("Error starting Besu Ledger: ", err);
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

    await fabricEnv.deployAndSetupOracleContracts();
  }

  //setup satp gateway
  const factoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };
  const factory = new PluginFactorySATPGateway(factoryOptions);

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
  } as GatewayIdentity;

  const evmNetworkOptions = ethereumEnv.createEthereumConfig();
  const besuNetworkOptions = besuEnv.createBesuConfig();
  const fabricNetworkOptions = fabricEnv.createFabricConfig();

  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    gid: gatewayIdentity,
    ccConfig: {
      oracleConfig: [
        evmNetworkOptions,
        besuNetworkOptions,
        fabricNetworkOptions,
      ],
    },
    pluginRegistry: new PluginRegistry({ plugins: [] }),
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

  oracleApi = new OracleApi(
    new Configuration({ basePath: gateway.getAddressOApiAddress() }),
  );
  expect(oracleApi).toBeTruthy();

  dispatcher = gateway.BLODispatcherInstance!;
  expect(dispatcher).toBeTruthy();
}, TIMEOUT);

afterAll(async () => {
  await gateway.shutdown();
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();
  await fabricEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

describe("Oracle registering READ, UPDATE, and READ_AND_UPDATE tasks successfully", () => {
  jest.setTimeout(900000);
  it("should read and update using an event listener for events in the source contract (EVM)", async () => {
    const payload1 = "Hello World to Emit Event!";
    const payload2 = "Hello World to Emit Event 2!";

    // first, we will read the data from the destination contract and make sure the data is not there

    let response2;
    try {
      response2 = await besuEnv.readData(
        "OracleTestContract",
        besuContractAddress,
        OracleTestContract.abi,
        "getData",
        [keccak256(payload1)],
      );
    } catch (error) {
      log.info("Expected error occurred while reading data:", error);
      response2 = { success: false, callOutput: null };
    }

    expect(response2.success).toBeFalsy();
    expect(response2.callOutput).toBeNull();

    let response3;
    try {
      response3 = await besuEnv.readData(
        "OracleTestContract",
        besuContractAddress,
        OracleTestContract.abi,
        "getData",
        [keccak256(payload2)],
      );
    } catch (error) {
      log.info("Expected error occurred while reading data:", error);
      response3 = { success: false, callOutput: null };
    }

    expect(response3.success).toBeFalsy();
    expect(response3.callOutput).toBeNull();

    // we register the task to listen to the event and write the data to the destination contract

    const response = await oracleApi.registerOracleTask({
      sourceNetworkId: ethereumEnv.network,
      sourceContract: {
        contractAbi: OracleTestContract.abi,
        contractAddress: ethereumContractAddress,
      },
      destinationNetworkId: besuEnv.network,
      destinationContract: {
        contractName: besuEnv.getTestContractName(),
        contractAddress: besuContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        // we are not providing the params here because we are
        // listening to the event and we will filter the "data"
        // field from the event as specified in the listeningOptions
      },
      listeningOptions: {
        eventSignature: "UpdatedData(bytes32,string,uint256)",
        filterParams: ["data"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.ReadAndUpdate,
      taskMode: OracleRegisterRequestTaskModeEnum.EventListening,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(
      dispatcher?.getOracleManager().getSchedulerManager().listListeners(),
    ).toContain(response.data.taskID);

    // now the event listener is in place, so we will write data twice to the source contract to trigger the event

    await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: [payload1],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: [payload2],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    // wait for both events to be processed and the task to be executed twice
    await new Promise((resolve) => setTimeout(resolve, 5000));

    let task = await oracleApi.getOracleTaskStatus(response.data.taskID ?? "");
    expect(task).toBeDefined();
    expect(task?.data.taskID).toBe(response.data.taskID);
    expect(task.data.status).toBe(OracleTaskStatusEnum.Active);
    expect(task.data.operations.length).toBe(2);
    expect(task.data.operations[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(task.data.operations[1].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    // unregister the task and delete the event listener

    await oracleApi.unregisterOracleTask(response.data.taskID ?? "");

    // check that the task is no longer active

    task = await oracleApi.getOracleTaskStatus(response.data.taskID ?? "");
    expect(task.data.status).toBe(OracleTaskStatusEnum.Inactive);

    // read again from the destination contract to make sure the data written is there

    response2 = await besuEnv.readData(
      "OracleTestContract",
      besuContractAddress,
      OracleTestContract.abi,
      "getData",
      [keccak256(payload1)],
    );

    expect(response2.success).toBeTruthy();
    expect(response2.callOutput).toBe(payload1);

    response3 = await besuEnv.readData(
      "OracleTestContract",
      besuContractAddress,
      OracleTestContract.abi,
      "getData",
      [keccak256(payload2)],
    );

    expect(response3.success).toBeTruthy();
    expect(response3.callOutput).toBe(payload2);
  });

  it("should read and update using an event listener for events in the source contract (Fabric)", async () => {
    const payload1 = "Hello World to Emit Event 3!";
    const payload2 = "Hello World to Emit Event 4!";

    // first, we will read the data from the destination contract and make sure the data is not there

    let response2;
    try {
      response2 = await fabricEnv.readData("oracle-bl-contract", "ReadData", [
        keccak256(payload1),
      ]);
    } catch (error) {
      log.info("Expected error occurred while reading data:", error);
      response2 = { success: false, callOutput: null };
    }

    expect(response2.functionOutput).toBeFalsy();

    let response3;
    try {
      response3 = await fabricEnv.readData("oracle-bl-contract", "ReadData", [
        keccak256(payload2),
      ]);
    } catch (error) {
      log.info("Expected error occurred while reading data:", error);
      response3 = { success: false, callOutput: null };
    }

    expect(response3.functionOutput).toBeFalsy();

    // we register the task to listen to the event and write the data to the destination contract

    const response = await oracleApi.registerOracleTask({
      sourceNetworkId: fabricEnv.network,
      sourceContract: {
        contractName: "oracle-bl-contract",
      },
      destinationNetworkId: besuEnv.network,
      destinationContract: {
        contractName: besuEnv.getTestContractName(),
        contractAddress: besuContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        // we are not providing the params here because we are
        // listening to the event and we will filter the "data"
        // field from the event as specified in the listeningOptions
      },
      listeningOptions: {
        eventSignature: "UpdatedData",
        filterParams: ["payload"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.ReadAndUpdate,
      taskMode: OracleRegisterRequestTaskModeEnum.EventListening,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(
      dispatcher?.getOracleManager().getSchedulerManager().listListeners(),
    ).toContain(response.data.taskID);

    // now the event listener is in place, so we will write data twice to the source contract to trigger the event

    await oracleApi.executeOracleTask({
      destinationNetworkId: fabricEnv.network,
      destinationContract: {
        contractName: "oracle-bl-contract",
        methodName: "WriteData",
        params: [keccak256(payload1), payload1],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await oracleApi.executeOracleTask({
      destinationNetworkId: fabricEnv.network,
      destinationContract: {
        contractName: "oracle-bl-contract",
        methodName: "WriteData",
        params: [keccak256(payload2), payload2],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    // wait for both events to be processed and the task to be executed twice
    await new Promise((resolve) => setTimeout(resolve, 5000));

    let task = await oracleApi.getOracleTaskStatus(response.data.taskID ?? "");
    expect(task).toBeDefined();
    expect(task?.data.taskID).toBe(response.data.taskID);
    expect(task.data.status).toBe(OracleTaskStatusEnum.Active);
    expect(task.data.operations.length).toBe(2);
    expect(task.data.operations[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(task.data.operations[1].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    // unregister the task and delete the event listener

    await oracleApi.unregisterOracleTask(response.data.taskID ?? "");

    // check that the task is no longer active

    task = await oracleApi.getOracleTaskStatus(response.data.taskID ?? "");
    expect(task.data.status).toBe(OracleTaskStatusEnum.Inactive);

    // read again from the destination contract to make sure the data written is there

    response2 = await besuEnv.readData(
      "OracleTestContract",
      besuContractAddress,
      OracleTestContract.abi,
      "getData",
      [keccak256(payload1)],
    );

    expect(response2.success).toBeTruthy();
    expect(response2.callOutput).toBe(payload1);

    response3 = await besuEnv.readData(
      "OracleTestContract",
      besuContractAddress,
      OracleTestContract.abi,
      "getData",
      [keccak256(payload2)],
    );

    expect(response3.success).toBeTruthy();
    expect(response3.callOutput).toBe(payload2);
  });

  it("should read data from a solidity contract calling a function with args with polling mode (5 seconds)", async () => {
    data_hash = keccak256("Hello World!");

    const response = await oracleApi.registerOracleTask({
      destinationNetworkId: besuEnv.network,
      destinationContract: {
        contractName: besuEnv.getTestContractName(),
        contractAddress: besuContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: [data_hash],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
      taskMode: OracleRegisterRequestTaskModeEnum.Polling,
      pollingInterval: 5000,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 23000));

    await oracleApi.unregisterOracleTask(response.data.taskID ?? "");

    const readNonceTask = await oracleApi.executeOracleTask({
      sourceNetworkId: besuEnv.network,
      sourceContract: {
        contractName: besuEnv.getTestContractName(),
        contractAddress: besuContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "getNonce",
        params: [],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Read,
    });

    const task = await oracleApi.getOracleTaskStatus(
      response.data.taskID ?? "",
    );
    expect(task).toBeDefined();
    expect(task?.data.taskID).toBe(response.data.taskID);
    expect(task.data.type).toBe(OracleTaskTypeEnum.Update);
    expect(task.data.mode).toBe(OracleTaskModeEnum.Polling);
    expect(task.data.status).toBe(OracleTaskStatusEnum.Inactive);
    expect(task.data.operations.length).toBe(4);

    for (const operation of task.data.operations ?? []) {
      expect(operation.status).toBe(OracleOperationStatusEnum.Success);
      expect(operation.type).toBe(OracleOperationTypeEnum.Update);
    }

    expect(readNonceTask).toBeDefined();
    expect(readNonceTask?.data.taskID).toBeDefined();
    expect(readNonceTask.data.operations.length).toBe(1);
    expect(readNonceTask?.data.type).toBe(OracleTaskTypeEnum.Read);
    expect(readNonceTask.data.operations[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(readNonceTask.data.operations[0].output?.output).toBe("8"); // 4 + 4 (from the previous tasks)
  });

  it("should read data from a fabric contract calling a function with args with polling mode (5 seconds)", async () => {
    data_hash = keccak256("Hello World!");

    const response = await oracleApi.registerOracleTask({
      destinationNetworkId: fabricEnv.network,
      destinationContract: {
        contractName: fabricEnv.getTestContractName(),
        methodName: "WriteData",
        params: [data_hash, "Hello World!"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
      taskMode: OracleRegisterRequestTaskModeEnum.Polling,
      pollingInterval: 5000,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 23000));

    await oracleApi.unregisterOracleTask(response.data.taskID ?? "");

    const readBalanceTask = await oracleApi.executeOracleTask({
      sourceNetworkId: fabricEnv.network,
      sourceContract: {
        contractName: fabricEnv.getTestContractName(),
        methodName: "ReadNonce",
        params: [],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Read,
    });

    const task = await oracleApi.getOracleTaskStatus(
      response.data.taskID ?? "",
    );
    expect(task).toBeDefined();
    expect(task?.data.taskID).toBe(response.data.taskID);
    expect(task.data.status).toBe(OracleTaskStatusEnum.Inactive);
    expect(task.data.operations.length).toBeGreaterThanOrEqual(3);
    expect(task.data.operations.length).toBeLessThanOrEqual(5);

    for (const operation of task.data.operations ?? []) {
      expect(operation.status).toBe(OracleOperationStatusEnum.Success);
      expect(operation.type).toBe(OracleOperationTypeEnum.Update);
    }

    expect(readBalanceTask).toBeDefined();
    expect(readBalanceTask?.data.taskID).toBeDefined();
    expect(readBalanceTask.data.operations.length).toBe(1);
    expect(readBalanceTask?.data.type).toBe(OracleTaskTypeEnum.Read);
    expect(readBalanceTask.data.operations[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(
      parseInt(readBalanceTask.data.operations[0].output?.output ?? "0", 10),
    ).toBeGreaterThanOrEqual(3);
  });
});
