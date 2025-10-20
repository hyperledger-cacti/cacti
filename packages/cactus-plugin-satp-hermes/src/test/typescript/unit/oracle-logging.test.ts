import "jest-extended";
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../../../main/typescript/database/repository/interfaces/repository";
import {
  OracleManager,
  logOperation,
  IOracleManagerOptions,
} from "../../../main/typescript/cross-chain-mechanisms/oracle/oracle-manager";
import {
  OracleOperation,
  OracleOperationTypeEnum,
  OracleOperationStatusEnum,
  OracleTaskStatusEnum,
  OracleRegisterRequestTaskModeEnum,
  OracleTask,
  NetworkId,
} from "../../../main/typescript/public-api";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { OracleExecutionLayer } from "../../../main/typescript/cross-chain-mechanisms/oracle/oracle-execution-layer";
import { OracleError } from "../../../main/typescript/cross-chain-mechanisms/common/errors";

const mockPersistLogEntry = jest.fn();

jest.mock("../../../main/typescript/gateway-persistence", () => {
  return {
    GatewayPersistence: jest.fn().mockImplementation(() => {
      return {
        persistLogEntry: mockPersistLogEntry,
      };
    }),
  };
});

const mockReadEntry = jest.fn();
const mockUpdateEntry = jest.fn();

describe("OracleManager - dbLogger Logging Tests", () => {
  let oracleManager: OracleManager;
  let mockLocalRepository: ILocalLogRepository;
  let mockRemoteRepository: IRemoteLogRepository;
  let mockSigner: JsObjectSigner;
  let mockMonitorService: MonitorService;

  const TEST_TASK_ID = "test-task-123";
  const TEST_OPERATION_ID = "test-op-456";
  const TEST_OPERATION_ID_UPDATE = "test-op-789";

  const MOCK_NETWORK_ID: NetworkId = {
    ledgerType: LedgerType.Besu1X,
    id: "besu-1",
  };

  const MOCK_NETWORK_ID_2: NetworkId = {
    ledgerType: LedgerType.Besu2X,
    id: "besu-2",
  };

  const MOCK_TASK: OracleTask = {
    taskID: TEST_TASK_ID,
    type: OracleOperationTypeEnum.Read,
    srcNetworkId: MOCK_NETWORK_ID,
    dstNetworkId: MOCK_NETWORK_ID_2,
    srcContract: {
      contractName: "SourceContract",
      contractAddress: "0xABC",
      methodName: "readData",
    },
    dstContract: {
      contractName: "DestinationContract",
      contractAddress: "0xDEF",
      methodName: "writeData",
    },
    mode: OracleRegisterRequestTaskModeEnum.Polling,
    status: OracleTaskStatusEnum.Active,
    timestamp: Date.now(),
    pollingInterval:
      OracleRegisterRequestTaskModeEnum.Polling === "POLLING" ? 100 : undefined,
    operations: [],
    listeningOptions: {
      eventSignature: "EventSignature",
      filterParams: [],
    },
  };

  const MOCK_OPERATION: OracleOperation = {
    id: TEST_OPERATION_ID,
    type: OracleOperationTypeEnum.Read,
    networkId: MOCK_NETWORK_ID,
    contract: MOCK_TASK.srcContract,
    status: OracleOperationStatusEnum.Pending,
    timestamp: 0,
  };

  const MOCK_OPERATION_UPDATE: OracleOperation = {
    id: TEST_OPERATION_ID_UPDATE,
    type: OracleOperationTypeEnum.Update,
    networkId: MOCK_NETWORK_ID_2,
    contract: MOCK_TASK.dstContract,
    status: OracleOperationStatusEnum.Pending,
    timestamp: 0,
  };

  let spyGetOracleExecutionLayer: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLocalRepository = {} as ILocalLogRepository;

    mockLocalRepository = {} as ILocalLogRepository;
    mockRemoteRepository = {} as IRemoteLogRepository;
    mockSigner = {
      sign: jest.fn(),
      getPublicKey: jest.fn().mockReturnValue("TEST_PUBLIC_KEY"),
    } as unknown as JsObjectSigner;

    mockMonitorService = {
      createLog: jest.fn(),

      startSpan: jest.fn().mockReturnValue({
        span: {
          end: jest.fn(),
          setStatus: jest.fn(),
          recordException: jest.fn(),
        },
        context: {},
      }),
    } as unknown as MonitorService;

    const options: IOracleManagerOptions = {
      bungee: undefined,
      monitorService: mockMonitorService,
      localRepository: mockLocalRepository,
      remoteRepository: mockRemoteRepository,
      signer: mockSigner,
      pubKey: "TEST_PUBLIC_KEY",
    };

    oracleManager = new OracleManager(options);

    const mockExecutionLayerInstance = {
      convertOperationToEntry: jest.fn().mockReturnValue({}),
      readEntry: mockReadEntry,
      updateEntry: mockUpdateEntry,
    } as unknown as OracleExecutionLayer;

    spyGetOracleExecutionLayer = jest
      .spyOn(oracleManager as any, "getOracleExecutionLayer")
      .mockReturnValue(mockExecutionLayerInstance);
  });

  afterEach(() => {
    spyGetOracleExecutionLayer.mockRestore();
  });

  it("should persist INIT, EXEC, and DONE logs for a successful read operation", async () => {
    const MOCK_READ_OUTPUT = "successful-data";
    mockReadEntry.mockResolvedValue({ output: MOCK_READ_OUTPUT });

    const result = await oracleManager.relayOperation(
      MOCK_TASK,
      MOCK_OPERATION,
    );

    expect(result.output).toBe(MOCK_READ_OUTPUT);
    expect(mockPersistLogEntry).toHaveBeenCalledTimes(3);

    // Check the INIT log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-read",
        operation: logOperation.INIT,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID,
      }),
    );

    // Check the EXEC log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-read",
        operation: logOperation.EXEC,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID,
      }),
    );

    // Check the DONE log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-read",
        operation: logOperation.DONE,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID,
      }),
    );
  });

  it("should persist INIT, EXEC, and DONE logs for a successful update operation", async () => {
    const MOCK_UPDATE_OUTPUT = "successful-tx-hash";
    mockUpdateEntry.mockResolvedValue({ output: MOCK_UPDATE_OUTPUT });

    const result = await oracleManager.relayOperation(
      MOCK_TASK,
      MOCK_OPERATION_UPDATE,
    );

    expect(result.output).toBe(MOCK_UPDATE_OUTPUT);
    expect(mockUpdateEntry).toHaveBeenCalledTimes(1);
    expect(mockPersistLogEntry).toHaveBeenCalledTimes(3);

    // Check the INIT log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-update",
        operation: logOperation.INIT,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID_UPDATE,
      }),
    );

    // Check the EXEC log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-update",
        operation: logOperation.EXEC,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID_UPDATE,
      }),
    );

    // Check the DONE log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-update",
        operation: logOperation.DONE,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID_UPDATE,
      }),
    );
  });

  it("should persist INIT, EXEC, and FAIL logs for a failing read operation", async () => {
    const ERROR_MESSAGE = "Network connection failed";
    const ERROR_CAUSE = "Timeout";
    const mockErrorWithCause = {
      message: ERROR_MESSAGE,
      name: "OracleError",
      cause: {
        message: ERROR_CAUSE,
      },
    } as unknown as OracleError;

    mockReadEntry.mockRejectedValue(mockErrorWithCause);

    await expect(
      oracleManager.relayOperation(MOCK_TASK, MOCK_OPERATION),
    ).rejects.toThrow(OracleError);

    expect(mockPersistLogEntry).toHaveBeenCalledTimes(3);

    // Check the FAIL log
    expect(mockPersistLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "oracle-read",
        operation: logOperation.FAIL,
        taskId: TEST_TASK_ID,
        oracleOperationId: TEST_OPERATION_ID,
      }),
    );
  });
});
