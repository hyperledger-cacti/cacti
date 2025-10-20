import "jest-extended";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";
import {
  Secp256k1Keys,
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { ICrashRecoveryManagerOptions } from "../../../../main/typescript/services/gateway/crash-manager";
import {
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import { AssetSchema } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import {
  bufArray2HexStr,
  getSatpLogKey,
} from "../../../../main/typescript/utils/gateway-utils";
import { TokenType } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  GatewayOrchestrator,
  IGatewayOrchestratorOptions,
} from "../../../../main/typescript/services/gateway/gateway-orchestrator";
import {
  ISATPCrossChainManagerOptions,
  SATPCrossChainManager,
} from "../../../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import { create } from "@bufbuild/protobuf";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../../../../main/typescript/database/repository/interfaces/repository";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { SATPLocalLog } from "../../../../main/typescript/core/types";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import knex, { Knex } from "knex";
import { Type } from "../../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import path from "path";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexLocalInstance } from "../../../../main/typescript/database/knexfile";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { KnexLocalLogRepository } from "../../../../main/typescript/database/repository/knex-satp-local-log-repository";
import { KnexRemoteLogRepository } from "../../../../main/typescript/database/repository/knex-remote-log-repository";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

let crashManager: CrashManager;
let localRepository: ILocalLogRepository;
let remoteRepository: IRemoteLogRepository;
let knexInstanceClient: Knex;
let knexInstanceRemote: Knex;
const sessionId = uuidv4();
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();
const createMockSession = (
  maxTimeout: string,
  maxRetries: string,
): SATPSession => {
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: true,
    client: true,
    monitorService: monitorService,
  });

  const sessionData = mockSession.getServerSessionData();

  sessionData.id = sessionId;
  sessionData.maxTimeout = maxTimeout;
  sessionData.maxRetries = maxRetries;
  sessionData.version = SATP_VERSION;
  sessionData.role = Type.CLIENT;
  sessionData.senderAsset = create(AssetSchema, {
    tokenId: "MOCK_TOKEN_ID",
    tokenType: TokenType.NONSTANDARD_FUNGIBLE,
    amount: BigInt(100),
    owner: "MOCK_SENDER_ASSET_OWNER",
    contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
    contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
  });
  sessionData.receiverAsset = create(AssetSchema, {
    tokenType: TokenType.NONSTANDARD_FUNGIBLE,
    amount: BigInt(100),
    owner: "MOCK_RECEIVER_ASSET_OWNER",
    contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
    mspId: "MOCK_RECEIVER_ASSET_MSP_ID",
    channelName: "MOCK_CHANNEL_ID",
  });

  return mockSession;
};

beforeAll(async () => {
  localRepository = new KnexLocalLogRepository(knexLocalInstance.default);
  remoteRepository = new KnexRemoteLogRepository(knexRemoteInstance.default);
  const migrationSource = await createMigrationSource();
  knexInstanceClient = knex({
    ...knexLocalInstance.default,
    migrations: {
      migrationSource: migrationSource,
    },
  });
  await knexInstanceClient.migrate.latest();

  knexInstanceRemote = knex({
    ...knexRemoteInstance.default,
    migrations: {
      migrationSource: migrationSource,
    },
  });
  await knexInstanceRemote.migrate.latest();

  const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
  const signerOptions: IJsObjectSignerOptions = {
    privateKey: bufArray2HexStr(keyPairs.privateKey),
    logLevel: "debug",
  };
  const signer = new JsObjectSigner(signerOptions);

  const gatewayIdentity: GatewayIdentity = {
    id: "mockID-1",
    name: "CustomGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    connectedDLTs: [
      {
        id: "BESU",
        ledgerType: LedgerType.Besu2X,
      },
    ],
    proofID: "mockProofID10",
    address: "http://localhost" as Address,
  };

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
    localRepository: localRepository,
    signer: signer,
    pubKey: bufArray2HexStr(keyPairs.publicKey),
    monitorService: monitorService,
  };
  const bridgesManager = new SATPCrossChainManager(bridgesManagerOptions);

  const crashOptions: ICrashRecoveryManagerOptions = {
    instanceId: "test-instance",
    logLevel: "DEBUG",
    ccManager: bridgesManager,
    orchestrator: gatewayOrchestrator,
    localRepository: localRepository,
    remoteRepository: remoteRepository,
    signer: signer,
    monitorService: monitorService,
  };

  crashManager = new CrashManager(crashOptions);
});

afterAll(async () => {
  if (crashManager) {
    crashManager.stopScheduler();
    crashManager.localRepository.destroy();
    crashManager.remoteRepository!.destroy();
  }
  if (knexInstanceClient || knexInstanceRemote) {
    await knexInstanceClient.destroy();
    await knexInstanceRemote.destroy();
  }
  monitorService.shutdown();
});

describe.skip("CrashManager Tests", () => {
  it("Default config test", async () => {
    const mock = jest
      .spyOn(crashManager, "checkAndResolveCrashes")
      .mockResolvedValue();
    const session = createMockSession("40000", "3");
    const serverSessionData = session.getServerSessionData();

    serverSessionData.id = sessionId;

    const key = getSatpLogKey(sessionId, "type2", "done");

    const log: SATPLocalLog = {
      sessionId: sessionId,
      type: "type2",
      key: key,
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(serverSessionData),
      sequenceNumber: Number(serverSessionData.lastSequenceNumber),
    };

    const mockServerLog = crashManager["localRepository"];
    await mockServerLog.create(log);

    await crashManager.recoverSessions();

    // 6 seconds (3 cron intervals of 2 seconds each)
    await new Promise((resolve) => setTimeout(resolve, 6000));

    expect(mock).toHaveBeenCalledTimes(3);

    mock.mockRestore();
  });

  it("Custom config test", async () => {
    const customCrashManager = new CrashManager({
      ...crashManager.options,
      healthCheckInterval: "*/5 * * * * *",
    });
    const mock = jest
      .spyOn(customCrashManager, "checkAndResolveCrashes")
      .mockResolvedValue();

    const session = createMockSession("25000", "3");
    const serverSessionData = session.getServerSessionData();

    serverSessionData.id = sessionId;

    const key = getSatpLogKey(sessionId, "type3", "done");

    const log: SATPLocalLog = {
      sessionId: sessionId,
      type: "type3",
      key: key,
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(serverSessionData),
      sequenceNumber: Number(serverSessionData.lastSequenceNumber),
    };

    const mockServerLog = customCrashManager["localRepository"];
    await mockServerLog.create(log);

    await customCrashManager.recoverSessions();

    // 15 seconds (3 cron intervals of 5 seconds each)
    await new Promise((resolve) => setTimeout(resolve, 15000));

    expect(mock).toHaveBeenCalledTimes(3);
    customCrashManager.stopScheduler();
    mock.mockRestore();
  });
});
