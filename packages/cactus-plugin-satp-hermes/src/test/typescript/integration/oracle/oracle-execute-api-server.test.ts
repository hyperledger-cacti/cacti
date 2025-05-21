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
let besuContractAddress: string;
let ethereumContractAddress: string;
let data_hash: string;

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
      log.error("Error starting ledgers: ", err);
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

    await fabricEnv.deployAndSetupContracts();
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

  const ethNetworkOptions = ethereumEnv.createEthereumConfig();
  const besuNetworkOptions = besuEnv.createBesuConfig();
  const fabricNetworkOptions = fabricEnv.createFabricConfig();

  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    gid: gatewayIdentity,
    ccConfig: {
      oracleConfig: [
        ethNetworkOptions,
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
});

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
});

describe("Oracle executing READ, UPDATE, and READ_AND_UPDATE tasks successfully", () => {
  it("should fail when writing to a contract calling a function that does not exist", async () => {
    data_hash = keccak256("Hello World!");

    let response = await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "invalidFunction",
        params: [],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    expect(response).toBeDefined();
    expect(response?.data.taskID).toBeDefined();
    expect(response?.data.operations?.length).toBe(1);
    expect(response?.data.operations?.[0].status).toBe(
      OracleOperationStatusEnum.Failed,
    );

    response = await oracleApi.getOracleTaskStatus(response?.data.taskID ?? "");

    expect(response).toBeDefined();
    expect(response.data.taskID).toBe(response?.data.taskID);
    expect(response.data.status).toBe(OracleTaskStatusEnum.Inactive);
  });

  it("should write data to a contract calling a function with args (EVM and Fabric)", async () => {
    data_hash = keccak256("Hello World!");

    let response = await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "setData",
        params: ["Hello World!"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.length).toBe(1);
    expect(response.data.operations?.[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    let response2 = await oracleApi.getOracleTaskStatus(
      response.data.taskID ?? "",
    );

    expect(response2).toBeDefined();
    expect(response2.data.taskID).toBe(response.data.taskID);
    expect(response2.data.status).toBe(OracleTaskStatusEnum.Inactive);

    // Repeat the same test for Fabric
    response = await oracleApi.executeOracleTask({
      destinationNetworkId: fabricEnv.network,
      destinationContract: {
        contractName: fabricEnv.getTestContractName(),
        methodName: "Mint",
        params: ["500"],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Update,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.length).toBe(1);
    expect(response.data.operations?.[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    response2 = await oracleApi.getOracleTaskStatus(response.data.taskID ?? "");

    expect(response2).toBeDefined();
    expect(response2.data.taskID).toBe(response.data.taskID);
    expect(response2.data.status).toBe(OracleTaskStatusEnum.Inactive);
  });

  it("should read the data from the contract calling a function with args (EVM and Fabric)", async () => {
    let response = await oracleApi.executeOracleTask({
      sourceNetworkId: ethereumEnv.network,
      sourceContract: {
        contractName: ethereumEnv.getTestContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "getData",
        params: [data_hash],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Read,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.length).toBe(1);

    let response2 = await oracleApi.getOracleTaskStatus(
      response.data.taskID ?? "",
    );

    expect(response2).toBeDefined();
    expect(response2?.data.status).toBe(OracleTaskStatusEnum.Inactive);
    expect(response2?.data.taskID).toBe(response.data.taskID);

    // Repeat the same test for Fabric
    response = await oracleApi.executeOracleTask({
      sourceNetworkId: fabricEnv.network,
      sourceContract: {
        contractName: fabricEnv.getTestContractName(),
        methodName: "ClientAccountBalance",
        params: [],
      },
      taskType: OracleExecuteRequestTaskTypeEnum.Read,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.operations?.length).toBe(1);
    expect(response.data.operations?.[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(response.data.operations?.[0]?.output?.output).toBe("500");

    response2 = await oracleApi.getOracleTaskStatus(response.data.taskID ?? "");

    expect(response2).toBeDefined();
    expect(response2.data.taskID).toBe(response.data.taskID);
    expect(response2.data.status).toBe(OracleTaskStatusEnum.Inactive);
  });

  it("should read data and write it to another blockchain (EVM to Besu)", async () => {
    const response = await oracleApi.executeOracleTask({
      sourceNetworkId: ethereumEnv.network,
      sourceContract: {
        contractName: ethereumEnv.getTestContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "getData",
        params: [data_hash],
      },
      destinationNetworkId: besuEnv.network,
      destinationContract: {
        contractName: besuEnv.getTestContractName(),
        contractAddress: besuContractAddress,
        contractAbi: OracleTestContract.abi,
        methodName: "setData",
        params: ["Hello World!"], // overrides the default. The default is what is returned from the source contract
      },
      taskType: OracleExecuteRequestTaskTypeEnum.ReadAndUpdate,
    });

    expect(response).toBeDefined();
    expect(response.data.taskID).toBeDefined();
    expect(response.data.type).toBe(
      OracleExecuteRequestTaskTypeEnum.ReadAndUpdate,
    );
    expect(response.data.operations.length).toBe(2);
    expect(response.data.operations[0].type).toBe(OracleOperationTypeEnum.Read);
    expect(response.data.operations[1].type).toBe(
      OracleOperationTypeEnum.Update,
    );
    expect(response.data.operations[0].status).toBe(
      OracleOperationStatusEnum.Success,
    );
    expect(response.data.operations[1].status).toBe(
      OracleOperationStatusEnum.Success,
    );

    const response2 = await oracleApi.getOracleTaskStatus(
      response.data.taskID ?? "",
    );

    expect(response2).toBeDefined();
    expect(response2).toBeDefined();
    expect(response2?.data.status).toBe(OracleTaskStatusEnum.Inactive);

    const ethereumData = await besuEnv.readData(
      "OracleTestContract",
      besuContractAddress,
      OracleTestContract.abi,
      "getData",
      [keccak256("Hello World!")],
    );

    expect(ethereumData.success).toBeTruthy();
    expect(ethereumData.callOutput).toBe("Hello World!");
    log.info("Data successfully transferred from Ethereum to Besu");
  });
});
