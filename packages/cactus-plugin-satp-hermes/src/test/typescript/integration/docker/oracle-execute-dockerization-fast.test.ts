import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerContainersIfGithubAction,
  Containers,
  SATPGatewayRunner,
  ISATPGatewayRunnerConstructorOptions,
} from "@hyperledger/cactus-test-tooling";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  setupGatewayDockerFiles,
  EthereumTestEnvironment,
  createPGDatabase,
  setupDBTable,
  BesuTestEnvironment,
  CI_TEST_TIMEOUT,
} from "../../test-utils";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_OAPI,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Container } from "dockerode";
import { Knex } from "knex";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  NetworkId,
  OracleApi,
  OracleExecuteRequestTaskTypeEnum,
  OracleOperationStatusEnum,
  OracleOperationTypeEnum,
  OracleRegisterRequestTaskModeEnum,
  OracleTaskStatusEnum,
} from "../../../../main/typescript";
import OracleTestContract from "../../../solidity/generated/OracleTestContract.sol/OracleTestContract.json";
import {
  SATP_DOCKER_IMAGE_NAME,
  SATP_DOCKER_IMAGE_VERSION,
} from "../../constants";
import { keccak256 } from "web3-utils";
import { SupportedContractTypes as SupportedEthereumContractTypes } from "../../environments/ethereum-test-environment";
import { SupportedContractTypes as SupportedBesuContractTypes } from "../../environments/ethereum-test-environment";

const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;

let db_local_config: Knex.Config;
let db_remote_config: Knex.Config;
let db_local: Container;
let db_remote: Container;
let gatewayRunner: SATPGatewayRunner;
let oracleApi: OracleApi;

const testNetwork = "test-network";

const gatewayAddress = "gateway.satp-hermes";

let ethereumContractAddress: string;
let besuContractAddress: string;

afterAll(async () => {
  await gatewayRunner.stop();
  await gatewayRunner.destroy();
  await db_local.stop();
  await db_local.remove();
  await db_remote.stop();
  await db_remote.remove();

  await besuEnv.tearDown();
  await ethereumEnv.tearDown();

  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, CI_TEST_TIMEOUT);

beforeEach(() => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, CI_TEST_TIMEOUT);

beforeAll(async () => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  ({ config: db_local_config, container: db_local } = await createPGDatabase({
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  ({ config: db_remote_config, container: db_remote } = await createPGDatabase({
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  await setupDBTable(db_remote_config);

  const businessLogicContract = "OracleTestContract";

  {
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      {
        logLevel,
        network: testNetwork,
      },
      [
        {
          assetType: SupportedEthereumContractTypes.FUNGIBLE,
          contractName: businessLogicContract,
        },
      ],
    );
    log.info("Ethereum Ledger started successfully");

    ethereumContractAddress = await ethereumEnv.deployAndSetupOracleContracts(
      ClaimFormat.BUNGEE,
      "OracleTestContract",
      OracleTestContract,
    );
  }
  {
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      {
        logLevel,
        network: testNetwork,
      },
      [
        {
          assetType: SupportedBesuContractTypes.FUNGIBLE,
          contractName: businessLogicContract,
        },
      ],
    );
    log.info("Besu Ledger started successfully");

    besuContractAddress = await besuEnv.deployAndSetupOracleContracts(
      ClaimFormat.BUNGEE,
      "OracleTestContract",
      OracleTestContract,
    );
  }

  const address: Address = `http://${gatewayAddress}`;

  // gateway setup:
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
    address,
    gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
    gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
    gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
  } as GatewayIdentity;

  // besuConfig Json object setup:
  const besuConfig = await besuEnv.createBesuDockerConfig();

  // ethereumConfig Json object setup:
  let ethereumConfig =
    (await ethereumEnv.createEthereumDockerConfig()) as unknown as {
      networkIdentification: NetworkId;
      connectorOptions: {
        rpcApiHttpHost: string | undefined;
        rpcApiWsHost: string;
      };
    };

  // drop rpcApiHttpHost from ethereumConfig because we will only use the websocket
  ethereumConfig = {
    ...ethereumConfig,
    connectorOptions: {
      rpcApiHttpHost: undefined,
      rpcApiWsHost: ethereumConfig.connectorOptions.rpcApiWsHost,
    },
  };

  // gateway configuration setup:
  const files = setupGatewayDockerFiles({
    gatewayIdentity,
    logLevel,
    counterPartyGateways: [], //only knows itself
    enableCrashRecovery: false, // Crash recovery disabled
    ccConfig: { oracleConfig: [besuConfig, ethereumConfig] },
    localRepository: db_local_config,
    remoteRepository: db_remote_config,
  });

  // gatewayRunner setup:
  const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
    containerImageVersion: SATP_DOCKER_IMAGE_VERSION,
    containerImageName: SATP_DOCKER_IMAGE_NAME,
    logLevel,
    emitContainerLogs: true,
    configPath: files.configPath,
    logsPath: files.logsPath,
    ontologiesPath: files.ontologiesPath,
    networkName: testNetwork,
    url: gatewayAddress,
  };

  gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
  log.debug("starting gatewayRunner...");
  await gatewayRunner.start(false);
  log.debug("gatewayRunner started successfully");

  oracleApi = new OracleApi(
    new Configuration({
      basePath: `http://${await gatewayRunner.getOApiHost()}`,
    }),
  );
}, CI_TEST_TIMEOUT);

describe("Oracle executing UPDATE tasks successfully", () => {
  jest.setTimeout(CI_TEST_TIMEOUT);
  it("should realize a transfer", async () => {
    const response = await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestFungibleContractName(),
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

    const response2 = await oracleApi.getOracleTaskStatus(
      response.data.taskID ?? "",
    );

    expect(response2).toBeDefined();
    expect(response2.data.taskID).toBe(response.data.taskID);
    expect(response2.data.status).toBe(OracleTaskStatusEnum.Inactive);
  });
});

describe("Oracle executing READ_AND_UPDATE tasks successfully", () => {
  jest.setTimeout(CI_TEST_TIMEOUT);
  const data_hash = keccak256("Hello World!");
  it("should realize a transfer", async () => {
    const response = await oracleApi.executeOracleTask({
      sourceNetworkId: ethereumEnv.network,
      sourceContract: {
        contractName: ethereumEnv.getTestFungibleContractName(),
        contractAddress: ethereumContractAddress,
        contractAbi: OracleTestContract.abi,
        contractBytecode: OracleTestContract.bytecode.object,
        methodName: "getData",
        params: [data_hash],
      },
      destinationNetworkId: besuEnv.network,
      destinationContract: {
        contractName: besuEnv.getTestFungibleContractName(),
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

describe("Oracle event listener for EVM working", () => {
  jest.setTimeout(CI_TEST_TIMEOUT);
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
      log.info("Received expected error because payload1 does not exist");
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
      log.info("Received expected error because payload1 does not exist");
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
        contractName: besuEnv.getTestFungibleContractName(),
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

    // now the event listener is in place, so we will write data twice to the source contract to trigger the event

    await oracleApi.executeOracleTask({
      destinationNetworkId: ethereumEnv.network,
      destinationContract: {
        contractName: ethereumEnv.getTestFungibleContractName(),
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
        contractName: ethereumEnv.getTestFungibleContractName(),
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

    log.info(
      "Data successfully copied from Ethereum to Besu using event listener",
    );
  });
});
