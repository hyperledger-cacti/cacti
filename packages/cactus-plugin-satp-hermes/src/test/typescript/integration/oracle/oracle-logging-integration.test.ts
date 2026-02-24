// --- Imports ---

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
  OracleOperationTypeEnum,
  OracleOperationStatusEnum,
  OracleTaskStatusEnum,
  OracleTask,
  NetworkId,
  OracleRegisterRequestTaskModeEnum,
} from "../../../../main/typescript"; // Ajuste o caminho se necessário
import {
  IPluginFactoryOptions,
  PluginImportType,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import OracleTestContract from "../../../solidity/generated/OracleTestContract.sol/OracleTestContract.json";
import {
  BesuTestEnvironment,
} from "../../test-utils"; // Ajuste o caminho se necessário
import { SupportedContractTypes as SupportedBesuContractTypes } from "../../environments/ethereum-test-environment";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor"; // Ajuste o caminho se necessário
import { ILocalLogRepository } from "../../../../main/typescript/database/repository/interfaces/repository"; // Ajuste o caminho se necessário

// --- Configuração e Variáveis ---

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - OracleLoggingIntegration",
});
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
const TIMEOUT = 900000; // 15 minutos

let besuEnv: BesuTestEnvironment;
let gateway: SATPGateway;
let besuContractAddress: string;

// Um repositório mock para capturar os logs persistidos.
// Este é o coração do teste de integração.
const mockPersistedLogs: any[] = [];
const mockLocalLogRepository = {
  // O único método que precisamos para este teste é o persistLogEntry
  persistLogEntry: jest.fn(async (logEntry: any) => {
    mockPersistedLogs.push(logEntry);
  }),
  // Outros métodos necessários para a interface, mas que não serão usados
  // Adicione mocks vazios ou retorne Promises vazias se a interface exigir
  readLogEntry: jest.fn().mockResolvedValue(undefined),
  readAllLogEntries: jest.fn().mockResolvedValue([]),
  updateLogEntry: jest.fn().mockResolvedValue(undefined),
  deleteLogEntry: jest.fn().mockResolvedValue(undefined),
  pruneLogEntries: jest.fn().mockResolvedValue(undefined),
} as unknown as ILocalLogRepository;


// --- Setup e Teardown ---

beforeAll(async () => {
  await pruneDockerAllIfGithubAction({ logLevel });

  const businessLogicContract = "OracleTestContract";

  // 1. Setup do Ledger Besu
  try {
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      { logLevel },
      [
        {
          assetType: SupportedBesuContractTypes.ORACLE,
          contractName: businessLogicContract,
        },
      ],
    );
    log.info("Besu Ledger started successfully");

    besuContractAddress = await besuEnv.deployAndSetupOracleContracts(
      "BUNGEE" as any, // Tipo Bungee para compatibilidade
      "OracleTestContract",
      OracleTestContract,
    );
  } catch (err) {
    log.error("Error starting ledgers: ", err);
    fail("Failed to start Besu environment");
  }

  // 2. Setup do SATP Gateway
  const factoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };
  const factory = new PluginFactorySATPGateway(factoryOptions);

  const besuNetworkOptions = besuEnv.createBesuConfig();

  // Configuração do Gateway, injetando nosso mockLocalLogRepository
  const options: SATPGatewayConfig = {
    instanceId: uuidv4(),
    logLevel: "DEBUG",
    // Opcional: injetar o repositório diretamente na configuração se o Gateway
    // ou OracleManager o aceitarem, ou usar um mock para o repositório
    // que o Gateway normalmente inicializaria.
    ccConfig: {
      oracleConfig: [besuNetworkOptions],
    },
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    monitorService: monitorService,
    // INJETANDO O REPOSITÓRIO FALSO
    // Se o seu SATPGateway aceitar localRepository na config (ideal para testes)
    // Se não aceitar, teremos que espiar (spyOn) a inicialização do OracleManager
    // dentro do Gateway, o que é mais complexo. Assumimos que a injeção é possível.
    localRepository: mockLocalLogRepository as any, 
  } as SATPGatewayConfig;
  
  // Se o `SATPGatewayConfig` não incluir `localRepository`, este trecho
  // precisa ser adaptado para espiar a função de persistência usada pelo
  // `OracleManager` dentro do `SATPGateway`.

  gateway = await factory.create(options);
  expect(gateway).toBeInstanceOf(SATPGateway);

  await gateway.startup();

  // 3. Inicializar dados no contrato (opcional, para garantir que a leitura funcione)
  await besuEnv.writeData(
    "OracleTestContract",
    besuContractAddress,
    OracleTestContract.abi,
    "setData",
    ["Hello World from Test!"],
  );
  
}, TIMEOUT);

afterAll(async () => {
  await gateway.shutdown();
  await besuEnv.tearDown();
  await pruneDockerAllIfGithubAction({ logLevel });
}, TIMEOUT);


// --- Testes de Integração de Logging ---

describe("OracleManager - Integração de Logging com Gateway Real", () => {
  jest.setTimeout(TIMEOUT);

  beforeEach(() => {
      // Limpa os logs antes de cada teste
      mockPersistedLogs.length = 0; 
      (mockLocalLogRepository as any).persistLogEntry.mockClear();
  });

  it("deve persistir logs INIT, EXEC e DONE para uma operação de leitura (Read) bem-sucedida", async () => {
    // 1. Preparar a Task e Operation
    const MOCK_NETWORK_ID: NetworkId = {
      ledgerType: LedgerType.Besu1X,
      id: besuEnv.network.id,
    };
    
    const TEST_TASK_ID = uuidv4();

    // Uma task de leitura
    const MOCK_TASK: OracleTask = {
      taskID: TEST_TASK_ID,
      type: OracleOperationTypeEnum.Read,
      srcNetworkId: MOCK_NETWORK_ID,
      dstNetworkId: MOCK_NETWORK_ID, // Não relevante para uma Read simples
      srcContract: {
        contractName: "OracleTestContract",
        contractAddress: besuContractAddress,
        methodName: "getData",
        params: ["0x617f65f0134f71120286819a5528829f078208a8a4869894e6501a4e40e02c50"], // Hash de "Hello World from Test!"
      },
      dstContract: {
        contractName: "OracleTestContract",
        contractAddress: besuContractAddress,
        methodName: "getData",
        params: ["0x617f65f0134f71120286819a5528829f078208a8a4869894e6501a4e40e02c50"],
      },
      mode: OracleRegisterRequestTaskModeEnum.Polling,
      status: OracleTaskStatusEnum.Active,
      timestamp: Date.now(),
      operations: [],
    };
    
    // Pegar a instância real do OracleManager do Gateway
    const oracleManager = (gateway as any).oracleManager;
    expect(oracleManager).toBeDefined();

    // 2. Executar a operação (Read)
    const result = await (oracleManager as any).startTask(MOCK_TASK);
    
    // Esperar que a task termine (opcionalmente)
    expect(result.taskID).toBe(TEST_TASK_ID);
    
    // Pode ser necessário um pequeno delay ou loop de poll para garantir que os logs sejam persistidos
    // para um teste de integração completo, mas para um teste de unidade com um mock de persistência
    // síncrono, o ideal seria que fosse imediato. No contexto real, vamos verificar o mock de persistência:
    
    // 3. Verificar os Logs Persistidos
    // A tarefa de 'Read' deve gerar uma operação, e essa operação 
    // deve gerar 3 logs (INIT, EXEC, DONE/SUCCESS).
    
    // O startTask irá criar a primeira operação. Precisamos encontrar o ID da operação.
    const operationId = result.operations[0].id;
    
    // Garantir que 3 logs foram persistidos.
    expect((mockLocalLogRepository as any).persistLogEntry).toHaveBeenCalledTimes(3);

    // Filtrar os logs que correspondem à operação
    const logsDaOperacao = mockPersistedLogs.filter(log => log.oracleOperationId === operationId);
    
    // Verificar os tipos de log
    expect(logsDaOperacao.some(log => log.operation === 'INIT')).toBeTruthy();
    expect(logsDaOperacao.some(log => log.operation === 'EXEC')).toBeTruthy();
    expect(logsDaOperacao.some(log => log.operation === 'DONE')).toBeTruthy();

    // Verificar os conteúdos dos logs (opcional, mas bom)
    expect(mockPersistedLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "oracle-read",
          operation: "INIT",
          taskId: TEST_TASK_ID,
          oracleOperationId: operationId,
        }),
        expect.objectContaining({
          type: "oracle-read",
          operation: "EXEC",
          taskId: TEST_TASK_ID,
          oracleOperationId: operationId,
        }),
        expect.objectContaining({
          type: "oracle-read",
          operation: "DONE",
          taskId: TEST_TASK_ID,
          oracleOperationId: operationId,
          // Verifica se o output está no log DONE (depende da sua implementação)
          data: expect.objectContaining({
              output: expect.objectContaining({
                  callOutput: "Hello World from Test!" 
              })
          }),
        }),
      ])
    );
  });
});