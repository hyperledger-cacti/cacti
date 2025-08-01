import "jest-extended";
import { RollbackStrategyFactory } from "../../../../main/typescript/core/crash-management/rollback/rollback-strategy-factory";
import { Stage0RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage3-rollback-strategy";
import {
  ISATPCrossChainManagerOptions,
  SATPCrossChainManager,
} from "../../../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import { create } from "@bufbuild/protobuf";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import {
  type MessageStagesHashes,
  MessageStagesHashesSchema,
  Stage0HashesSchema,
  Stage1HashesSchema,
  Stage2HashesSchema,
  Stage3HashesSchema,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";
import {
  IJsObjectSignerOptions,
  JsObjectSigner,
  type LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { SatpLoggerProvider as LoggerProvider } from "../../../../main/typescript/core/satp-logger-provider";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import path from "path";
import {
  SATP_CORE_VERSION,
  SATP_ARCHITECTURE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import {
  IGatewayOrchestratorOptions,
  GatewayOrchestrator,
} from "../../../../main/typescript/services/gateway/gateway-orchestrator";
import { bufArray2HexStr } from "../../../../main/typescript/gateway-utils";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

const createMockSession = (hashes?: MessageStagesHashes): SATPSession => {
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
    monitorService: monitorService,
  });

  const sessionData = mockSession.getClientSessionData();
  sessionData.id = "mock-session-id";
  sessionData.hashes = hashes;

  return mockSession;
};

const logLevel: LogLevelDesc = "DEBUG";
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();
const log = LoggerProvider.getOrCreate(
  {
    level: logLevel,
    label: "RollbackStrategyFactory",
  },
  monitorService,
);

describe.skip("RollbackStrategyFactory Tests", () => {
  let factory: RollbackStrategyFactory;
  let bridgesManager: SATPCrossChainManager;

  beforeAll(async () => {
    const gatewayIdentity = {
      id: "mockID-1",
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

    const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
    const signerOptions: IJsObjectSignerOptions = {
      privateKey: bufArray2HexStr(keyPairs.privateKey),
      logLevel: "debug",
    };
    const signer = new JsObjectSigner(signerOptions);

    const orchestratorOptions: IGatewayOrchestratorOptions = {
      logLevel: "DEBUG",
      localGateway: gatewayIdentity,
      counterPartyGateways: [],
      signer: signer,
      monitorService: monitorService,
    };
    const gatewayOrchestrator = new GatewayOrchestrator(orchestratorOptions);
    const ontologiesPath = path.join(__dirname, "../../../ontologies");
    const bridgesManagerOptions: ISATPCrossChainManagerOptions = {
      orquestrator: gatewayOrchestrator,
      logLevel: "DEBUG",
      ontologyOptions: {
        ontologiesPath: ontologiesPath,
      },
      monitorService: monitorService,
    };
    bridgesManager = new SATPCrossChainManager(bridgesManagerOptions);

    factory = new RollbackStrategyFactory(
      bridgesManager.getClientBridgeManagerInterface(),
      log,
      monitorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    monitorService.shutdown();
  });

  it("should return Stage0RollbackStrategy if no hashes are present", () => {
    const hashes = create(MessageStagesHashesSchema, {
      stage0: undefined,
      stage1: undefined,
      stage2: undefined,
      stage3: undefined,
    });
    const mockSession = createMockSession(hashes).getClientSessionData();

    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage0RollbackStrategy);
  });

  it("should return Stage0RollbackStrategy if Stage0 is partially complete", () => {
    const partialStage0 = create(Stage0HashesSchema, {
      newSessionRequestMessageHash: "hash1",
      // missing other Stage0 hashes
    });
    const hashes = create(MessageStagesHashesSchema, {
      stage0: partialStage0,
    });
    const mockSession = createMockSession(hashes).getClientSessionData();

    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage0RollbackStrategy);
  });

  it("should return Stage1RollbackStrategy if Stage0 is complete but Stage1 is partially complete", () => {
    const completeStage0 = create(Stage0HashesSchema, {
      newSessionRequestMessageHash: "hash1",
      newSessionResponseMessageHash: "hash2",
      preSatpTransferRequestMessageHash: "hash3",
      preSatpTransferResponseMessageHash: "hash4",
    });
    const partialStage1 = create(Stage1HashesSchema, {
      transferProposalRequestMessageHash: "hash1",
      // missing other Stage1 hashes
    });
    const hashes = create(MessageStagesHashesSchema, {
      stage0: completeStage0,
      stage1: partialStage1,
    });
    const mockSession = createMockSession(hashes).getClientSessionData();

    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage1RollbackStrategy);
  });

  it("should return Stage2RollbackStrategy if Stage0 and Stage1 are complete but Stage2 is partially complete", () => {
    const completeStage0 = create(Stage0HashesSchema, {
      newSessionRequestMessageHash: "hash1",
      newSessionResponseMessageHash: "hash2",
      preSatpTransferRequestMessageHash: "hash3",
      preSatpTransferResponseMessageHash: "hash4",
    });
    const completeStage1 = create(Stage1HashesSchema, {
      transferProposalRequestMessageHash: "hash1",
      transferProposalReceiptMessageHash: "hash2",
      transferProposalRejectMessageHash: "hash3",
      transferCommenceRequestMessageHash: "hash4",
      transferCommenceResponseMessageHash: "hash5",
    });
    const partialStage2 = create(Stage2HashesSchema, {
      lockAssertionRequestMessageHash: "hash1",
      // missing lockAssertionReceiptMessageHash
    });
    const hashes = create(MessageStagesHashesSchema, {
      stage0: completeStage0,
      stage1: completeStage1,
      stage2: partialStage2,
    });
    const mockSession = createMockSession(hashes).getClientSessionData();

    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage2RollbackStrategy);
  });

  it("should return Stage3RollbackStrategy if Stage0, Stage1, and Stage2 are complete but Stage3 is partially complete", () => {
    const completeStage0 = create(Stage0HashesSchema, {
      newSessionRequestMessageHash: "h1",
      newSessionResponseMessageHash: "h2",
      preSatpTransferRequestMessageHash: "h3",
      preSatpTransferResponseMessageHash: "h4",
    });
    const completeStage1 = create(Stage1HashesSchema, {
      transferProposalRequestMessageHash: "h1",
      transferProposalReceiptMessageHash: "h2",
      transferProposalRejectMessageHash: "h3",
      transferCommenceRequestMessageHash: "h4",
      transferCommenceResponseMessageHash: "h5",
    });
    const completeStage2 = create(Stage2HashesSchema, {
      lockAssertionRequestMessageHash: "h1",
      lockAssertionReceiptMessageHash: "h2",
    });
    const partialStage3 = create(Stage3HashesSchema, {
      commitPreparationRequestMessageHash: "h1",
      // missing other Stage3 hashes
    });
    const hashes = create(MessageStagesHashesSchema, {
      stage0: completeStage0,
      stage1: completeStage1,
      stage2: completeStage2,
      stage3: partialStage3,
    });
    const mockSession = createMockSession(hashes).getClientSessionData();

    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage3RollbackStrategy);
  });

  it("should not rollback if all stages are complete", () => {
    const completeStage0 = create(Stage0HashesSchema, {
      newSessionRequestMessageHash: "h1",
      newSessionResponseMessageHash: "h2",
      preSatpTransferRequestMessageHash: "h3",
      preSatpTransferResponseMessageHash: "h4",
    });
    const completeStage1 = create(Stage1HashesSchema, {
      transferProposalRequestMessageHash: "h1",
      transferProposalReceiptMessageHash: "h2",
      transferProposalRejectMessageHash: "h3",
      transferCommenceRequestMessageHash: "h4",
      transferCommenceResponseMessageHash: "h5",
    });
    const completeStage2 = create(Stage2HashesSchema, {
      lockAssertionRequestMessageHash: "h1",
      lockAssertionReceiptMessageHash: "h2",
    });
    const completeStage3 = create(Stage3HashesSchema, {
      commitPreparationRequestMessageHash: "h1",
      commitReadyResponseMessageHash: "h2",
      commitFinalAssertionRequestMessageHash: "h3",
      commitFinalAcknowledgementReceiptResponseMessageHash: "h4",
      transferCompleteMessageHash: "h5",
      transferCompleteResponseMessageHash: "h6",
    });
    const hashes = create(MessageStagesHashesSchema, {
      stage0: completeStage0,
      stage1: completeStage1,
      stage2: completeStage2,
      stage3: completeStage3,
    });
    const mockSession = createMockSession(hashes).getClientSessionData();

    expect(() => factory.createStrategy(mockSession)).toThrowError(
      "No rollback needed as all stages are complete.",
    );
  });
});
