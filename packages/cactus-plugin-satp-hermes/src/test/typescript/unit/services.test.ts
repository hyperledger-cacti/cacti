import {
  JsObjectSigner,
  type LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import {
  type ISATPServiceOptions,
  type SATPService,
  SATPServiceType,
} from "../../../main/typescript/core/stage-services/satp-service";
import { Stage1ClientService } from "../../../main/typescript/core/stage-services/client/stage1-client-service";
import { Stage2ClientService } from "../../../main/typescript/core/stage-services/client/stage2-client-service";
import { Stage3ClientService } from "../../../main/typescript/core/stage-services/client/stage3-client-service";
import { Stage1ServerService } from "../../../main/typescript/core/stage-services/server/stage1-server-service";
import { Stage2ServerService } from "../../../main/typescript/core/stage-services/server/stage2-server-service";
import { Stage3ServerService } from "../../../main/typescript/core/stage-services/server/stage3-server-service";
import { SATPSession } from "../../../main/typescript/core/satp-session";
import {
  DEFAULT_TLS13_CIPHER_SUITE,
  SATP_VERSION,
} from "../../../main/typescript/core/constants";
import {
  AssetSchema,
  AssignmentAssertionClaimSchema,
  BurnAssertionClaimSchema,
  ClaimFormat,
  LockAssertionClaimFormatSchema,
  LockAssertionClaimSchema,
  LockType,
  MessageType,
  MintAssertionClaimSchema,
  NetworkIdSchema,
  WrapAssertionClaimSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  TransferCommenceRequest,
  TransferCommenceRequestSchema,
  TransferCommenceResponse,
  TransferProposalResponse,
  TransferProposalResponseSchema,
  TransferProposalRequest,
  TransferProposalRequestSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_1_pb";
import {
  LockAssertionRequest,
  LockAssertionResponse,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_2_pb";
import {
  SessionData,
  State as SessionState,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  CommitPreparationResponse,
  TransferCompleteRequest,
  TransferCompleteResponse,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_3_pb";

import { getMessageHash } from "../../../main/typescript/core/session-utils";
import { Stage0ClientService } from "../../../main/typescript/core/stage-services/client/stage0-client-service";
import { Stage0ServerService } from "../../../main/typescript/core/stage-services/server/stage0-server-service";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  PreSATPTransferResponse,
  STATUS,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_0_pb";
import { TokenType } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
  IAuditEntryRepository,
} from "../../../main/typescript/database/repository/interfaces/repository";
import { Knex, knex } from "knex";
import { KnexLocalLogRepository as LocalLogRepository } from "../../../main/typescript/database/repository/knex-local-log-repository";
import { KnexRemoteLogRepository as RemoteLogRepository } from "../../../main/typescript/database/repository/knex-remote-log-repository";
import { KnexAuditEntryRepository as AuditLogRepository } from "../../../main/typescript/database/repository/knex-audit-repository";
import { GatewayPersistence } from "../../../main/typescript/database/gateway-persistence";
import { create, isMessage } from "@bufbuild/protobuf";

let knexInstanceClient: Knex; // test as a client
let knexInstanceRemote: Knex;
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import { BridgeManagerClientInterface } from "../../../main/typescript/cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { BridgeManager } from "../../../main/typescript/cross-chain-mechanisms/bridge/bridge-manager";
import { createMigrationSource } from "../../../main/typescript/database/knex-migration-source";
import { knexLocalInstance } from "../../../main/typescript/database/knexfile";
import { knexRemoteInstance } from "../../../main/typescript/database/knexfile-remote";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import { LockAssertionExpirationError } from "../../../main/typescript/core/errors/satp-service-errors";
import { signClaimFixture } from "../test-utils";

const logLevel: LogLevelDesc = "DEBUG";

const serviceClasses = [
  Stage0ClientService,
  Stage0ServerService,
  Stage1ServerService,
  Stage1ClientService,
  Stage2ServerService,
  Stage2ClientService,
  Stage3ServerService,
  Stage3ClientService,
];

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

const signer = new JsObjectSigner({
  privateKey: new Uint8Array(keyPairs.privateKey),
});

const connectedDLTs = [
  { id: "BESU", ledgerType: LedgerType.Besu2X },
  { id: "FABRIC", ledgerType: LedgerType.Fabric2 },
];
let localRepository: ILocalLogRepository;
let remoteRepository: IRemoteLogRepository;
let auditRepository: IAuditEntryRepository;
let dbLogger: GatewayPersistence;
let dateNowSpy: jest.SpyInstance | undefined;
let persistLogEntrySpy: jest.SpyInstance;
let persistSessionProofSpy: jest.SpyInstance;
let bridgeManager: BridgeManagerClientInterface;

let mockSession: SATPSession;
let satpClientService0: Stage0ClientService;
let satpServerService0: Stage0ServerService;
let satpClientService1: Stage1ClientService;
let satpClientService2: Stage2ClientService;
let satpClientService3: Stage3ClientService;
let satpServerService1: Stage1ServerService;
let satpServerService2: Stage2ServerService;
let satpServerService3: Stage3ServerService;

let newSessionRequestMessage: NewSessionRequest;
let newSessionResponseMessage: NewSessionResponse;
let preSATPTransferRequestMessage: PreSATPTransferRequest;
let preSATPTransferResponseMessage: PreSATPTransferResponse;
let transferProposalRequestMessage: TransferProposalRequest;
let transferProposalResponseMessage: TransferProposalResponse;
let transferCommenceRequestMessage: TransferCommenceRequest;
let transferCommenceResponseMessage: TransferCommenceResponse;
let lockAssertionRequestMessage: LockAssertionRequest;
let lockAssertionReceiptMessage: LockAssertionResponse;
let commitPreparationRequestMessage: CommitPreparationRequest;
let commitReadyResponseMessage: CommitPreparationResponse;
let commitFinalAssertionRequestMessage: CommitFinalAssertionRequest;
let commitFinalAcknowledgementReceiptResponseMessage: CommitFinalAssertionResponse;
let transferCompleteRequestMessage: TransferCompleteRequest;
let transferCompleteResponseMessage: TransferCompleteResponse;

const sessionIDs: string[] = [];

beforeAll(async () => {
  bridgeManager = new BridgeManager({
    logLevel: logLevel,
    monitorService: monitorService,
  });

  jest.spyOn(bridgeManager, "getSATPExecutionLayer").mockImplementation(() => {
    return {
      getNetworkType() {
        return LedgerType.Besu2X;
      },
      async lockAsset() {
        return {
          receipt: "MOCK_LOCK_RECEIPT",
          proof: "MOCK_LOCK_PROOF",
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
  jest.spyOn(bridgeManager, "getBridgeEndPoint").mockImplementation(() => {
    return {
      getApproveAddress() {
        return "MOCK_APPROVE_ADDRESS";
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
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

  localRepository = new LocalLogRepository(knexLocalInstance.default);
  remoteRepository = new RemoteLogRepository(knexRemoteInstance.default);
  auditRepository = new AuditLogRepository(knexRemoteInstance.default);

  dbLogger = new GatewayPersistence({
    localRepository,
    remoteRepository,
    auditRepository,
    signer,
    pubKey: Buffer.from(keyPairs.publicKey).toString("hex"),
    monitorService: monitorService,
  });

  persistLogEntrySpy = jest.spyOn(dbLogger, "persistLogEntry");
  persistSessionProofSpy = jest.spyOn(dbLogger, "persistSessionProof");

  mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
    monitorService: monitorService,
  });

  sessionIDs.push(mockSession.getSessionId());

  const serviceOptions = initializeServiceOptions(
    serviceClasses,
    logLevel,
    "SATPService",
  );

  for (const service of initializeServices(serviceClasses, serviceOptions)) {
    switch (service.constructor) {
      case Stage0ClientService:
        satpClientService0 = service as Stage0ClientService;
        break;
      case Stage0ServerService:
        satpServerService0 = service as Stage0ServerService;
        break;
      case Stage1ServerService:
        satpServerService1 = service as Stage1ServerService;
        break;
      case Stage1ClientService:
        satpClientService1 = service as Stage1ClientService;
        break;
      case Stage2ServerService:
        satpServerService2 = service as Stage2ServerService;
        break;
      case Stage2ClientService:
        satpClientService2 = service as Stage2ClientService;
        break;
      case Stage3ServerService:
        satpServerService3 = service as Stage3ServerService;
        break;
      case Stage3ClientService:
        satpClientService3 = service as Stage3ClientService;
        break;
      default:
        break;
    }
  }
});

afterEach(() => {
  dateNowSpy?.mockRestore();
  dateNowSpy = undefined;
  persistLogEntrySpy.mockClear();
  persistSessionProofSpy.mockClear();
});

afterAll(async () => {
  const services = [
    satpClientService0,
    satpServerService0,
    satpClientService1,
    satpServerService1,
    satpClientService2,
    satpServerService2,
    satpClientService3,
    satpServerService3,
  ];

  for (const service of services) {
    await service.dbLogger.getLocalRepository().destroy();
    const remoteRepo = service.dbLogger.getRemoteRepository();
    if (remoteRepo) {
      await remoteRepo.destroy();
    }
  }

  if (knexInstanceClient) {
    await knexInstanceClient.destroy();
  }
  if (knexInstanceRemote) {
    await knexInstanceRemote.destroy();
  }

  await monitorService.shutdown();
});

describe("SATP Services Testing", () => {
  it("Service0Client newSessionRequest", async () => {
    const sessionData = mockSession.getClientSessionData();
    if (!sessionData) {
      throw new Error("Session data not found");
    }

    sessionData.version = SATP_VERSION;
    sessionData.clientGatewayPubkey = Buffer.from(keyPairs.publicKey).toString(
      "hex",
    );
    sessionData.serverGatewayPubkey = sessionData.clientGatewayPubkey;
    sessionData.digitalAssetId = "MOCK_DIGITAL_ASSET_ID";
    sessionData.assetProfileId = "MOCK_ASSET_PROFILE_ID";
    sessionData.verifiedOriginatorEntityId =
      "MOCK_VERIFIED_ORIGINATOR_ENTITY_ID";
    sessionData.verifiedBeneficiaryEntityId =
      "MOCK_VERIFIED_BENEFICIARY_ENTITY_ID";
    sessionData.receiverGatewayOwnerId = "MOCK_RECEIVER_GATEWAY_OWNER_ID";
    sessionData.recipientGatewayNetworkId = "FABRIC";
    sessionData.senderGatewayOwnerId = "MOCK_SENDER_GATEWAY_OWNER_ID";
    sessionData.senderGatewayNetworkId = "BESU";
    sessionData.signatureAlgorithm = "ES256";
    sessionData.gatewayTlsScheme = DEFAULT_TLS13_CIPHER_SUITE;
    sessionData.lockType = LockType.TIME_LOCK;
    sessionData.lockExpirationTime = BigInt(1000);
    sessionData.loggingProfile = "MOCK_LOGGING_PROFILE";
    sessionData.accessControlProfile = "MOCK_ACCESS_CONTROL_PROFILE";
    sessionData.resourceUrl = "MOCK_RESOURCE_URL";
    sessionData.lockAssertionExpiration = BigInt(99999);
    sessionData.sourceLedgerAssetId = "MOCK_SOURCE_LEDGER_ASSET_ID";

    sessionData.senderAsset = create(AssetSchema, {
      tokenId: "MOCK_TOKEN_ID",
      tokenType: TokenType.NONSTANDARD_FUNGIBLE,
      amount: BigInt(0),
      owner: "MOCK_SENDER_ASSET_OWNER",
      contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
      contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
      networkId: create(NetworkIdSchema, {
        id: "BESU",
        type: LedgerType.Besu2X,
      }),
    });
    sessionData.receiverAsset = create(AssetSchema, {
      tokenType: TokenType.NONSTANDARD_FUNGIBLE,
      amount: BigInt(0),
      owner: "MOCK_RECEIVER_ASSET_OWNER",
      contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
      mspId: "MOCK_RECEIVER_ASSET_MSP_ID",
      channelName: "MOCK_CHANNEL_ID",
      networkId: create(NetworkIdSchema, {
        id: "FABRIC",
        type: LedgerType.Fabric2,
      }),
    });

    expect(satpClientService1).toBeDefined();
    expect(satpClientService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#1`,
    );
    newSessionRequestMessage = await satpClientService0.newSessionRequest(
      mockSession,
      "BESU",
    );
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);

    expect(newSessionRequestMessage).toBeDefined();
    expect(newSessionRequestMessage.contextId).toBe(
      mockSession.getClientSessionData()?.transferContextId,
    );
  });
  it("Service0Server checkNewSessionRequest", async () => {
    expect(satpServerService0).toBeDefined();
    expect(satpServerService0.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#0`,
    );

    await satpServerService0.checkNewSessionRequest(
      newSessionRequestMessage,
      mockSession,
      Buffer.from(keyPairs.publicKey).toString("hex"),
    );

    expect(mockSession.getClientSessionData()).toBeDefined();
    expect(mockSession.getClientSessionData()?.transferContextId).toBe(
      newSessionRequestMessage.contextId,
    );
  });
  it("Service0Server newSessionResponse", async () => {
    newSessionResponseMessage = await satpServerService0.newSessionResponse(
      newSessionRequestMessage,
      mockSession,
    );

    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);

    expect(newSessionResponseMessage).toBeDefined();
    expect(newSessionResponseMessage.contextId).toBe(
      mockSession.getServerSessionData()?.transferContextId,
    );
    expect(newSessionResponseMessage.status).toBe(STATUS.STATUS_ACCEPTED);
  });
  it("Service0Client checkNewSessionResponse", async () => {
    expect(satpClientService0).toBeDefined();
    expect(satpClientService0.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#0`,
    );

    await satpClientService0.checkNewSessionResponse(
      newSessionResponseMessage,
      mockSession,
      sessionIDs,
    );
  });
  it("Service0Client preSATPTransferRequest", async () => {
    expect(satpClientService0).toBeDefined();
    expect(satpClientService0.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#0`,
    );

    const sessionData = mockSession.getClientSessionData();
    if (!sessionData) {
      throw new Error("Session data not found");
    }

    sessionData.senderWrapAssertionClaim = create(WrapAssertionClaimSchema, {});

    preSATPTransferRequestMessage =
      await satpClientService0.preSATPTransferRequest(mockSession);
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);

    expect(preSATPTransferRequestMessage).toBeDefined();
    expect(preSATPTransferRequestMessage.sessionId).toBe(sessionData.id);
    expect(preSATPTransferRequestMessage.contextId).toBe(
      sessionData.transferContextId,
    );
    expect(preSATPTransferRequestMessage.senderGatewayNetworkId).toBe(
      sessionData.senderGatewayNetworkId,
    );
    expect(preSATPTransferRequestMessage.senderAsset).toBeDefined();
    expect(preSATPTransferRequestMessage.receiverAsset).toBeDefined();
    expect(preSATPTransferRequestMessage.wrapAssertionClaim).toBeDefined();
  });
  it("Service0Server checkPreSATPTransferRequest", async () => {
    expect(satpServerService0).toBeDefined();
    expect(satpServerService0.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#0`,
    );

    await satpServerService0.checkPreSATPTransferRequest(
      preSATPTransferRequestMessage,
      mockSession,
    );

    expect(mockSession.getServerSessionData()).toBeDefined();
    expect(mockSession.getServerSessionData()?.senderAsset).toBe(
      preSATPTransferRequestMessage.senderAsset,
    );
    expect(mockSession.getServerSessionData()?.receiverAsset).toBe(
      preSATPTransferRequestMessage.receiverAsset,
    );
    expect(mockSession.getServerSessionData()?.senderGatewayNetworkId).toBe(
      preSATPTransferRequestMessage.senderGatewayNetworkId,
    );
  });
  it("Service0Server preSATPTransferResponse", async () => {
    const sessionData = mockSession.getServerSessionData();
    if (!sessionData) {
      throw new Error("Session data not found");
    }

    sessionData.receiverWrapAssertionClaim = signClaimFixture(
      create(WrapAssertionClaimSchema, {}),
      "MOCK_RECEIVER_WRAP_RECEIPT",
      signer,
    );

    preSATPTransferResponseMessage =
      await satpServerService0.preSATPTransferResponse(
        preSATPTransferRequestMessage,
        mockSession,
      );
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(preSATPTransferResponseMessage).toBeDefined();
    expect(preSATPTransferResponseMessage.sessionId).toBe(
      preSATPTransferRequestMessage.sessionId,
    );
    expect(preSATPTransferResponseMessage.contextId).toBe(
      newSessionResponseMessage.contextId,
    );
    expect(preSATPTransferResponseMessage.wrapAssertionClaim).toBeDefined();
    expect(preSATPTransferResponseMessage.recipientTokenId).toBeDefined();
    expect(
      preSATPTransferResponseMessage.recipientGatewayNetworkId,
    ).toBeDefined();
  });
  it("Service1Client checkPreSATPTransferResponse", async () => {
    expect(satpClientService1).toBeDefined();
    expect(satpClientService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#1`,
    );

    await satpClientService1.checkPreSATPTransferResponse(
      preSATPTransferResponseMessage,
      mockSession,
    );

    expect(persistSessionProofSpy).toHaveBeenCalledTimes(1);
    const wrapProof = persistSessionProofSpy.mock.calls[0][0];
    expect(wrapProof.sessionId).toBe(mockSession.getClientSessionData().id);
    expect(wrapProof.step.tag).toBe("checkPreSATPTransferResponse");
    expect(wrapProof.claim).toContain("MOCK_RECEIVER_WRAP_RECEIPT");
    expect(wrapProof.signedClaim).not.toBe("");

    expect(mockSession.getClientSessionData()).toBeDefined();
    expect(mockSession.getClientSessionData()?.receiverAsset?.tokenId).toBe(
      preSATPTransferResponseMessage.recipientTokenId,
    );
    expect(mockSession.getClientSessionData().recipientGatewayNetworkId).toBe(
      preSATPTransferResponseMessage.recipientGatewayNetworkId,
    );
  });
  it("Service1Client transferProposalRequest", async () => {
    expect(satpClientService1).toBeDefined();
    expect(satpClientService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#1`,
    );

    const sessionData = mockSession.getClientSessionData();
    if (!sessionData) {
      throw new Error("Session data not found");
    }

    transferProposalRequestMessage =
      (await satpClientService1.transferProposalRequest(
        mockSession,
        connectedDLTs,
      )) as TransferProposalRequest;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(
      isMessage(transferProposalRequestMessage, TransferProposalRequestSchema),
    ).toBe(true);

    expect(transferProposalRequestMessage.common?.transferContextId).toBe(
      sessionData.transferContextId,
    );
    expect(transferProposalRequestMessage.common?.version).toBe(SATP_VERSION);
    expect(
      transferProposalRequestMessage.transferInitClaims?.digitalAssetId,
    ).toBe("MOCK_DIGITAL_ASSET_ID");
    expect(
      transferProposalRequestMessage.transferInitClaims?.assetProfileId,
    ).toBe("MOCK_ASSET_PROFILE_ID");
    expect(
      transferProposalRequestMessage.transferInitClaims
        ?.verifiedOriginatorEntityId,
    ).toBe("MOCK_VERIFIED_ORIGINATOR_ENTITY_ID");
    expect(
      transferProposalRequestMessage.transferInitClaims
        ?.verifiedBeneficiaryEntityId,
    ).toBe("MOCK_VERIFIED_BENEFICIARY_ENTITY_ID");
    expect(
      transferProposalRequestMessage.transferInitClaims?.receiverGatewayOwnerId,
    ).toBe("MOCK_RECEIVER_GATEWAY_OWNER_ID");
    expect(
      transferProposalRequestMessage.transferInitClaims?.senderGatewayOwnerId,
    ).toBe("MOCK_SENDER_GATEWAY_OWNER_ID");
    expect(
      transferProposalRequestMessage.transferInitClaims?.senderGatewayNetworkId,
    ).toBe("MOCK_APPROVE_ADDRESS");
  });
  it("Service1Server checkTransferProposalRequest", async () => {
    expect(satpServerService1).toBeDefined();
    expect(satpServerService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#1`,
    );

    await satpServerService1.checkTransferProposalRequestMessage(
      transferProposalRequestMessage,
      mockSession,
      connectedDLTs,
    );
  });
  it("Service1Server transferProposalResponse", async () => {
    transferProposalResponseMessage =
      (await satpServerService1.transferProposalResponse(
        transferProposalRequestMessage,
        mockSession,
      )) as TransferProposalResponse;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(4);
    expect(
      isMessage(
        transferProposalResponseMessage,
        TransferProposalResponseSchema,
      ),
    ).toBe(true);

    expect(transferProposalResponseMessage.common?.transferContextId).toBe(
      transferProposalRequestMessage.common?.transferContextId,
    );
    expect(transferProposalResponseMessage.common?.version).toBe(SATP_VERSION);
    expect(
      transferProposalResponseMessage.hashTransferInitClaims,
    ).toBeDefined();
  });
  it("Service1Client checkTransferProposalResponse", async () => {
    await satpClientService1.checkTransferProposalResponse(
      transferProposalResponseMessage,
      mockSession,
    );
  });
  it("Service1Client transferCommenceRequest", async () => {
    transferCommenceRequestMessage =
      (await satpClientService1.transferCommenceRequest(
        transferProposalResponseMessage,
        mockSession,
      )) as TransferCommenceRequest;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(4);
    expect(
      isMessage(transferCommenceRequestMessage, TransferCommenceRequestSchema),
    ).toBe(true);
    expect(transferCommenceRequestMessage.common?.messageType).toBe(
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );
    expect(transferCommenceRequestMessage.common?.transferContextId).toBe(
      transferProposalResponseMessage.common?.transferContextId,
    );
    expect(transferCommenceRequestMessage.common?.version).toBe(SATP_VERSION);
    expect(transferCommenceRequestMessage.hashTransferInitClaims).toBeDefined();
  });

  it("Service1Server checkTransferCommenceRequest", async () => {
    expect(satpServerService1).toBeDefined();
    expect(satpServerService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#1`,
    );

    await satpServerService1.checkTransferCommenceRequestMessage(
      transferCommenceRequestMessage,
      mockSession,
    );
  });

  it("Service1Server transferCommenceResponse", async () => {
    transferCommenceResponseMessage =
      (await satpServerService1.transferCommenceResponse(
        transferCommenceRequestMessage,
        mockSession,
      )) as TransferCommenceResponse;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(transferCommenceResponseMessage).toBeDefined();
    expect(transferCommenceResponseMessage.common?.transferContextId).toBe(
      transferCommenceRequestMessage.common?.transferContextId,
    );
    expect(transferCommenceResponseMessage.common?.messageType).toBe(
      MessageType.TRANSFER_COMMENCE_RESPONSE,
    );
  });
  it("Service2Client checkTransferCommenceResponse", async () => {
    expect(satpClientService2).toBeDefined();
    expect(satpClientService2.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#2`,
    );

    await satpClientService2.checkTransferCommenceResponse(
      transferCommenceResponseMessage,
      mockSession,
    );
  });
  it("Service2Client lockAssertionRequest", async () => {
    //mock claims

    mockSession.getClientSessionData().lockAssertionClaim = create(
      LockAssertionClaimSchema,
      {},
    );

    mockSession.getClientSessionData().lockAssertionClaimFormat = create(
      LockAssertionClaimFormatSchema,
      {},
    );
    mockSession.getClientSessionData().lockAssertionClaimFormat!.format =
      ClaimFormat.DEFAULT;
    const lockExpirationTime = BigInt(5 * 60 * 1000);
    const currentTime = Date.now();
    const clientSessionData = mockSession.getClientSessionData();
    const serverSessionData = mockSession.getServerSessionData();
    clientSessionData.lockExpirationTime = lockExpirationTime;
    serverSessionData.lockExpirationTime = lockExpirationTime;
    dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(currentTime);

    await satpClientService2.lockAsset(mockSession);
    const expectedExpiration = BigInt(currentTime) + lockExpirationTime;
    expect(clientSessionData.lockAssertionExpiration).toBe(expectedExpiration);
    dateNowSpy.mockRestore();
    dateNowSpy = undefined;

    persistLogEntrySpy.mockClear();

    lockAssertionRequestMessage =
      (await satpClientService2.lockAssertionRequest(
        transferCommenceResponseMessage,
        mockSession,
      )) as LockAssertionRequest;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(lockAssertionRequestMessage).toBeDefined();
    expect(lockAssertionRequestMessage.common?.messageType).toBe(
      MessageType.LOCK_ASSERT,
    );
    expect(lockAssertionRequestMessage.common?.transferContextId).toBe(
      transferCommenceResponseMessage.common?.transferContextId,
    );
    expect(lockAssertionRequestMessage.common?.version).toBe(SATP_VERSION);
    expect(lockAssertionRequestMessage.lockAssertionClaim).toBeDefined();
    expect(lockAssertionRequestMessage.lockAssertionClaimFormat).toBeDefined();
    expect(lockAssertionRequestMessage.lockAssertionExpiration).toBe(
      expectedExpiration,
    );
  });
  it("Service2Server rejects expired lock assertions", async () => {
    const expiration = lockAssertionRequestMessage.lockAssertionExpiration;
    dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(Number(expiration));

    const validation = satpServerService2.checkLockAssertionRequest(
      lockAssertionRequestMessage,
      mockSession,
    );

    await expect(validation).rejects.toBeInstanceOf(
      LockAssertionExpirationError,
    );
  });
  it("Service2Server rejects expiration beyond negotiated window", async () => {
    const serverSessionData = mockSession.getServerSessionData();
    const negotiatedExpirationTime = serverSessionData.lockExpirationTime;
    const expiration = lockAssertionRequestMessage.lockAssertionExpiration;
    serverSessionData.lockExpirationTime = BigInt(1);
    dateNowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValue(Number(expiration - BigInt(2)));

    try {
      const validation = satpServerService2.checkLockAssertionRequest(
        lockAssertionRequestMessage,
        mockSession,
      );

      await expect(validation).rejects.toBeInstanceOf(
        LockAssertionExpirationError,
      );
    } finally {
      serverSessionData.lockExpirationTime = negotiatedExpirationTime;
    }
  });
  it("Service2Server checkLockAssertionRequest", async () => {
    expect(satpServerService2).toBeDefined();
    expect(satpServerService2.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#2`,
    );

    await satpServerService2.checkLockAssertionRequest(
      lockAssertionRequestMessage,
      mockSession,
    );

    expect(persistSessionProofSpy).toHaveBeenCalledTimes(1);
    const lockProof = persistSessionProofSpy.mock.calls[0][0];
    expect(lockProof.sessionId).toBe(mockSession.getServerSessionData().id);
    expect(lockProof.step.tag).toBe("checkLockAssertionRequest");
    expect(lockProof.signedClaim).not.toBe("");
  });
  it("Service2Server lockAssertionResponse", async () => {
    lockAssertionReceiptMessage =
      (await satpServerService2.lockAssertionResponse(
        lockAssertionRequestMessage,
        mockSession,
      )) as LockAssertionResponse;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(lockAssertionReceiptMessage).toBeDefined();
    expect(lockAssertionReceiptMessage.common?.transferContextId).toBe(
      lockAssertionRequestMessage.common?.transferContextId,
    );
    expect(lockAssertionReceiptMessage.common?.version).toBe(SATP_VERSION);
    expect(lockAssertionReceiptMessage.common?.messageType).toBe(
      MessageType.ASSERTION_RECEIPT,
    );
  });
  it("Service3Client checkLockAssertionResponse", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    await satpClientService3.checkLockAssertionResponse(
      lockAssertionReceiptMessage,
      mockSession,
    );
  });
  it("Service3Client commitPreparation", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );
    commitPreparationRequestMessage =
      (await satpClientService3.commitPreparation(
        lockAssertionReceiptMessage,
        mockSession,
      )) as CommitPreparationRequest;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(commitPreparationRequestMessage).toBeDefined();
    expect(commitPreparationRequestMessage.common?.sessionId).toBe(
      mockSession.getSessionId(),
    );
    expect(commitPreparationRequestMessage.common?.transferContextId).toBe(
      lockAssertionReceiptMessage.common?.transferContextId,
    );
    expect(commitPreparationRequestMessage.common?.version).toBe(SATP_VERSION);
    expect(commitPreparationRequestMessage.common?.messageType).toBe(
      MessageType.COMMIT_PREPARE,
    );
  });
  it("Service3Server checkCommitPreparationRequest", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    await satpServerService3.checkCommitPreparationRequest(
      commitPreparationRequestMessage,
      mockSession,
    );
  });
  it("Service3Server commitReady", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );
    //mock claims
    (mockSession.getServerSessionData() as SessionData).mintAssertionClaim =
      signClaimFixture(
        create(MintAssertionClaimSchema, {}),
        "MOCK_MINT_RECEIPT",
        signer,
      );

    commitReadyResponseMessage = (await satpServerService3.commitReadyResponse(
      commitPreparationRequestMessage,
      mockSession,
    )) as CommitPreparationResponse;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(commitReadyResponseMessage).toBeDefined();
    expect(commitReadyResponseMessage.common?.sessionId).toBe(
      commitPreparationRequestMessage.common?.sessionId,
    );
    expect(commitReadyResponseMessage.common?.transferContextId).toBe(
      commitPreparationRequestMessage.common?.transferContextId,
    );
    expect(commitReadyResponseMessage.common?.version).toBe(SATP_VERSION);
    expect(commitReadyResponseMessage.common?.messageType).toBe(
      MessageType.COMMIT_READY,
    );
  });
  it("Service3Client checkCommitPreparationResponse", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );
    await satpClientService3.checkCommitPreparationResponse(
      commitReadyResponseMessage,
      mockSession,
    );

    expect(persistSessionProofSpy).toHaveBeenCalledTimes(1);
    const mintProof = persistSessionProofSpy.mock.calls[0][0];
    expect(mintProof.sessionId).toBe(mockSession.getClientSessionData().id);
    expect(mintProof.step.tag).toBe("checkCommitPreparationResponse");
    expect(mintProof.claim).toContain("MOCK_MINT_RECEIPT");
    expect(mintProof.signedClaim).not.toBe("");
  });
  it("Service3Client commitFinalAssertion", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    //mock claims
    (mockSession.getClientSessionData() as SessionData).burnAssertionClaim =
      signClaimFixture(
        create(BurnAssertionClaimSchema, {}),
        "MOCK_BURN_RECEIPT",
        signer,
      );

    commitFinalAssertionRequestMessage =
      (await satpClientService3.commitFinalAssertion(
        commitReadyResponseMessage,
        mockSession,
      )) as CommitFinalAssertionRequest;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(commitFinalAssertionRequestMessage).toBeDefined();
    expect(commitFinalAssertionRequestMessage.common?.sessionId).toBe(
      commitReadyResponseMessage.common?.sessionId,
    );
    expect(commitFinalAssertionRequestMessage.common?.transferContextId).toBe(
      commitReadyResponseMessage.common?.transferContextId,
    );
    expect(commitFinalAssertionRequestMessage.common?.version).toBe(
      SATP_VERSION,
    );
    expect(commitFinalAssertionRequestMessage.common?.messageType).toBe(
      MessageType.COMMIT_FINAL,
    );
    expect(commitFinalAssertionRequestMessage.burnAssertionClaim).toBeDefined();
  });
  it("Service3Server checkCommitFinalAssertionRequest", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    await satpServerService3.checkCommitFinalAssertionRequest(
      commitFinalAssertionRequestMessage,
      mockSession,
    );

    expect(persistSessionProofSpy).toHaveBeenCalledTimes(1);
    const burnProof = persistSessionProofSpy.mock.calls[0][0];
    expect(burnProof.sessionId).toBe(mockSession.getServerSessionData().id);
    expect(burnProof.step.tag).toBe("checkCommitFinalAssertionRequest");
    expect(burnProof.claim).toContain("MOCK_BURN_RECEIPT");
    expect(burnProof.signedClaim).not.toBe("");
  });
  it("Service3Server commitFinalAcknowledgementReceiptResponse", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    //mock claims
    (
      mockSession.getServerSessionData() as SessionData
    ).assignmentAssertionClaim = signClaimFixture(
      create(AssignmentAssertionClaimSchema, {}),
      "MOCK_ASSIGNMENT_RECEIPT",
      signer,
    );

    commitFinalAcknowledgementReceiptResponseMessage =
      (await satpServerService3.commitFinalAcknowledgementReceiptResponse(
        commitFinalAssertionRequestMessage,
        mockSession,
      )) as CommitFinalAssertionResponse;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(commitFinalAcknowledgementReceiptResponseMessage).toBeDefined();
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common?.sessionId,
    ).toBe(commitFinalAssertionRequestMessage.common?.sessionId);
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.transferContextId,
    ).toBe(commitFinalAssertionRequestMessage.common?.transferContextId);
  });
  it("Service3Client checkCommitFinalAssertionResponse", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    await satpClientService3.checkCommitFinalAssertionResponse(
      commitFinalAcknowledgementReceiptResponseMessage,
      mockSession,
    );

    expect(persistSessionProofSpy).toHaveBeenCalledTimes(1);
    const assignmentProof = persistSessionProofSpy.mock.calls[0][0];
    expect(assignmentProof.sessionId).toBe(
      mockSession.getClientSessionData().id,
    );
    expect(assignmentProof.step.tag).toBe("checkCommitFinalAssertionResponse");
    expect(assignmentProof.claim).toContain("MOCK_ASSIGNMENT_RECEIPT");
    expect(assignmentProof.signedClaim).not.toBe("");
  });
  it("Service3Client transferComplete", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    transferCompleteRequestMessage = (await satpClientService3.transferComplete(
      commitFinalAcknowledgementReceiptResponseMessage,
      mockSession,
    )) as TransferCompleteRequest;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);

    expect(transferCompleteRequestMessage).toBeDefined();
    expect(transferCompleteRequestMessage.common?.sessionId).toBe(
      commitFinalAcknowledgementReceiptResponseMessage.common?.sessionId,
    );
    expect(transferCompleteRequestMessage.common?.transferContextId).toBe(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.transferContextId,
    );
    expect(transferCompleteRequestMessage.common?.version).toBe(SATP_VERSION);
    expect(transferCompleteRequestMessage.common?.messageType).toBe(
      MessageType.COMMIT_TRANSFER_COMPLETE,
    );
    expect(transferCompleteRequestMessage.hashTransferCommence).toBe(
      getMessageHash(
        mockSession.getClientSessionData(),
        MessageType.TRANSFER_COMMENCE_REQUEST,
      ),
    );
  });
  it("Service3Server checkTransferCompleteRequest", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    await satpServerService3.checkTransferCompleteRequest(
      transferCompleteRequestMessage,
      mockSession,
    );
  });
  it("Service3Server transferCompleteResponse", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    transferCompleteResponseMessage =
      (await satpServerService3.transferCompleteResponse(
        transferCompleteRequestMessage,
        mockSession,
      )) as TransferCompleteResponse;
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
    expect(transferCompleteResponseMessage).toBeDefined();
    expect(transferCompleteResponseMessage.common?.sessionId).toBe(
      transferCompleteRequestMessage.common?.sessionId,
    );
    expect(transferCompleteResponseMessage.common?.transferContextId).toBe(
      transferCompleteRequestMessage.common?.transferContextId,
    );
    expect(transferCompleteResponseMessage.common?.version).toBe(SATP_VERSION);
    expect(transferCompleteResponseMessage.common?.messageType).toBe(
      MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
    );
  });
  it("Service3Client checkTransferCompleteResponse", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    await satpClientService3.checkTransferCompleteResponse(
      transferCompleteResponseMessage,
      mockSession,
    );
    expect(mockSession.getClientSessionData().state).toBe(
      SessionState.COMPLETED,
    );
  });
});

function initializeServiceOptions(
  serviceClasses: (new (options: ISATPServiceOptions) => SATPService)[],
  logLevel: LogLevelDesc,
  label: string,
): ISATPServiceOptions[] {
  return serviceClasses.map((_, index) => ({
    signer: signer,
    stage: index.toString() as "0" | "1" | "2" | "3",
    loggerOptions: { level: logLevel, label },
    serviceName: `Service-${index}`,
    serviceType:
      index % 2 === 0 ? SATPServiceType.Server : SATPServiceType.Client,
    bridgeManager: bridgeManager,
    dbLogger: dbLogger,
    monitorService: monitorService,
  }));
}

function initializeServices(
  serviceClasses: (new (options: ISATPServiceOptions) => SATPService)[],
  serviceOptions: ISATPServiceOptions[],
): SATPService[] {
  return serviceClasses.map(
    (ServiceClass, index) => new ServiceClass(serviceOptions[index]),
  );
}
