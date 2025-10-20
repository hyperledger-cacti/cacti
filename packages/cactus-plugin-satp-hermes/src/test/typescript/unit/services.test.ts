import {
  JsObjectSigner,
  type LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
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
import { SATP_VERSION } from "../../../main/typescript/core/constants";
import {
  AssetSchema,
  AssignmentAssertionClaimSchema,
  BurnAssertionClaimSchema,
  ClaimFormat,
  CredentialProfile,
  LockAssertionClaimFormatSchema,
  LockAssertionClaimSchema,
  LockType,
  MessageType,
  MintAssertionClaimSchema,
  NetworkIdSchema,
  SignatureAlgorithm,
  WrapAssertionClaimSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  TransferCommenceRequest,
  TransferCommenceRequestSchema,
  TransferCommenceResponse,
  TransferProposalResponse,
  TransferProposalResponseSchema,
  TransferProposalRequest,
  TransferProposalRequestSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  LockAssertionRequest,
  LockAssertionResponse,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/service/stage_2_pb";
import {
  SessionData,
  State as SessionState,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";
import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  CommitPreparationResponse,
  TransferCompleteRequest,
  TransferCompleteResponse,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/service/stage_3_pb";

import { getMessageHash } from "../../../main/typescript/core/session-utils";
import { Stage0ClientService } from "../../../main/typescript/core/stage-services/client/stage0-client-service";
import { Stage0ServerService } from "../../../main/typescript/core/stage-services/server/stage0-server-service";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  PreSATPTransferResponse,
  STATUS,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/service/stage_0_pb";
import { TokenType } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../../../main/typescript/database/repository/interfaces/repository";
import { Knex, knex } from "knex";
import { KnexLocalLogRepository as LocalLogRepository } from "../../../main/typescript/database/repository/knex-satp-local-log-repository";
import { KnexRemoteLogRepository as RemoteLogRepository } from "../../../main/typescript/database/repository/knex-remote-log-repository";
import { GatewayPersistence } from "../../../main/typescript/database/gateway-persistence";
import { create, isMessage } from "@bufbuild/protobuf";

let knexInstanceClient: Knex; // test as a client
let knexInstanceRemote: Knex;
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BridgeManagerClientInterface } from "../../../main/typescript/cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { BridgeManager } from "../../../main/typescript/cross-chain-mechanisms/bridge/bridge-manager";
import { createMigrationSource } from "../../../main/typescript/database/knex-migration-source";
import { knexLocalInstance } from "../../../main/typescript/database/knexfile";
import { knexRemoteInstance } from "../../../main/typescript/database/knexfile-remote";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";

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
let dbLogger: GatewayPersistence;
let persistLogEntrySpy: jest.SpyInstance;
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
  dbLogger = new GatewayPersistence({
    localRepository,
    remoteRepository,
    signer,
    pubKey: Buffer.from(keyPairs.publicKey).toString("hex"),
    monitorService: monitorService,
  });

  persistLogEntrySpy = jest.spyOn(dbLogger, "persistLogEntry");

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
  persistLogEntrySpy.mockClear();
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
    sessionData.signatureAlgorithm = SignatureAlgorithm.RSA;
    sessionData.lockType = LockType.FAUCET;
    sessionData.lockExpirationTime = BigInt(1000);
    sessionData.credentialProfile = CredentialProfile.X509;
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
    expect(newSessionRequestMessage.clientSignature).not.toBe("");
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
    expect(newSessionResponseMessage.hashPreviousMessage).not.toBe("");
    expect(newSessionResponseMessage.serverSignature).not.toBe("");
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
    expect(preSATPTransferRequestMessage.hashPreviousMessage).toBeDefined();
    expect(preSATPTransferRequestMessage.clientSignature).toBeDefined();
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

    sessionData.receiverWrapAssertionClaim = create(
      WrapAssertionClaimSchema,
      {},
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
    expect(preSATPTransferResponseMessage.hashPreviousMessage).toBeDefined();
    expect(preSATPTransferResponseMessage.serverSignature).toBeDefined();
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
    expect(transferProposalRequestMessage.common?.clientGatewayPubkey).toBe(
      sessionData.clientGatewayPubkey,
    );
    expect(transferProposalRequestMessage.common?.serverGatewayPubkey).toBe(
      sessionData.serverGatewayPubkey,
    );
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
    expect(
      transferProposalRequestMessage.transferInitClaims
        ?.recipientGatewayNetworkId,
    ).toBe("MOCK_APPROVE_ADDRESS");
    expect(
      transferProposalRequestMessage.networkCapabilities?.signatureAlgorithm,
    ).toBe(SignatureAlgorithm.RSA);
    expect(transferProposalRequestMessage.networkCapabilities?.lockType).toBe(
      LockType.FAUCET,
    );
    expect(
      transferProposalRequestMessage.networkCapabilities?.lockExpirationTime,
    ).toBe(BigInt(1000));
    expect(
      transferProposalRequestMessage.networkCapabilities?.credentialProfile,
    ).toBe(CredentialProfile.X509);
    expect(
      transferProposalRequestMessage.networkCapabilities?.loggingProfile,
    ).toBe("MOCK_LOGGING_PROFILE");
    expect(
      transferProposalRequestMessage.networkCapabilities?.accessControlProfile,
    ).toBe("MOCK_ACCESS_CONTROL_PROFILE");
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
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
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
    expect(transferProposalResponseMessage.common?.clientGatewayPubkey).toBe(
      transferProposalRequestMessage.common?.clientGatewayPubkey,
    );
    expect(transferProposalResponseMessage.common?.serverGatewayPubkey).toBe(
      transferProposalRequestMessage.common?.serverGatewayPubkey,
    );
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
    expect(persistLogEntrySpy).toHaveBeenCalledTimes(3);
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
    expect(transferCommenceRequestMessage.common?.clientGatewayPubkey).toBe(
      transferProposalResponseMessage.common?.clientGatewayPubkey,
    );
    expect(transferCommenceRequestMessage.common?.serverGatewayPubkey).toBe(
      transferProposalResponseMessage.common?.serverGatewayPubkey,
    );
    expect(transferCommenceRequestMessage.hashTransferInitClaims).toBeDefined();
    expect(
      transferCommenceRequestMessage.common?.hashPreviousMessage,
    ).toBeDefined();
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
    expect(transferCommenceResponseMessage.common?.clientGatewayPubkey).toBe(
      transferCommenceRequestMessage.common?.clientGatewayPubkey,
    );
    expect(transferCommenceResponseMessage.common?.serverGatewayPubkey).toBe(
      transferCommenceRequestMessage.common?.serverGatewayPubkey,
    );
    expect(
      transferCommenceResponseMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(transferCommenceResponseMessage.serverSignature).toBeDefined();
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
    mockSession.getClientSessionData().lockExpirationTime = BigInt(1000);

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
    expect(lockAssertionRequestMessage.common?.clientGatewayPubkey).toBe(
      transferCommenceResponseMessage.common?.clientGatewayPubkey,
    );
    expect(lockAssertionRequestMessage.common?.serverGatewayPubkey).toBe(
      transferCommenceResponseMessage.common?.serverGatewayPubkey,
    );
    expect(
      lockAssertionRequestMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(lockAssertionRequestMessage.common?.sequenceNumber).toBeDefined();
    expect(lockAssertionRequestMessage.lockAssertionClaim).toBeDefined();
    expect(lockAssertionRequestMessage.lockAssertionClaimFormat).toBeDefined();
    expect(lockAssertionRequestMessage.lockAssertionExpiration).toBeDefined();
    expect(lockAssertionRequestMessage.clientTransferNumber).toBeDefined();
    expect(lockAssertionRequestMessage.clientSignature).toBeDefined();
    expect(
      lockAssertionRequestMessage.common?.hashPreviousMessage,
    ).toBeDefined();
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
    expect(lockAssertionReceiptMessage.common?.clientGatewayPubkey).toBe(
      lockAssertionRequestMessage.common?.clientGatewayPubkey,
    );
    expect(lockAssertionReceiptMessage.common?.serverGatewayPubkey).toBe(
      lockAssertionRequestMessage.common?.serverGatewayPubkey,
    );
    expect(
      lockAssertionReceiptMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(lockAssertionReceiptMessage.serverSignature).toBeDefined();
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
    expect(commitPreparationRequestMessage.common?.clientGatewayPubkey).toBe(
      lockAssertionReceiptMessage.common?.clientGatewayPubkey,
    );
    expect(commitPreparationRequestMessage.common?.serverGatewayPubkey).toBe(
      lockAssertionReceiptMessage.common?.serverGatewayPubkey,
    );
    expect(
      commitPreparationRequestMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(commitPreparationRequestMessage.clientSignature).toBeDefined();
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
      create(MintAssertionClaimSchema, {});

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
    expect(commitReadyResponseMessage.common?.clientGatewayPubkey).toBe(
      commitPreparationRequestMessage.common?.clientGatewayPubkey,
    );
    expect(commitReadyResponseMessage.common?.serverGatewayPubkey).toBe(
      commitPreparationRequestMessage.common?.serverGatewayPubkey,
    );
    expect(
      commitReadyResponseMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(commitReadyResponseMessage.serverSignature).toBeDefined();
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
  });
  it("Service3Client commitFinalAssertion", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    //mock claims
    (mockSession.getClientSessionData() as SessionData).burnAssertionClaim =
      create(BurnAssertionClaimSchema, {});

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
    expect(commitFinalAssertionRequestMessage.common?.clientGatewayPubkey).toBe(
      commitReadyResponseMessage.common?.clientGatewayPubkey,
    );
    expect(commitFinalAssertionRequestMessage.common?.serverGatewayPubkey).toBe(
      commitReadyResponseMessage.common?.serverGatewayPubkey,
    );
    expect(commitFinalAssertionRequestMessage.burnAssertionClaim).toBeDefined();
    expect(
      commitFinalAssertionRequestMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(commitFinalAssertionRequestMessage.clientSignature).toBeDefined();
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
  });
  it("Service3Server commitFinalAcknowledgementReceiptResponse", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    //mock claims
    (
      mockSession.getServerSessionData() as SessionData
    ).assignmentAssertionClaim = create(AssignmentAssertionClaimSchema, {});

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
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common?.version,
    ).toBe(SATP_VERSION);
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common?.messageType,
    ).toBe(MessageType.ACK_COMMIT_FINAL);
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.clientGatewayPubkey,
    ).toBe(commitFinalAssertionRequestMessage.common?.clientGatewayPubkey);
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.serverGatewayPubkey,
    ).toBe(commitFinalAssertionRequestMessage.common?.serverGatewayPubkey);
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.hashPreviousMessage,
    ).toBeDefined();
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaim,
    ).toBeDefined();
    expect(
      commitFinalAcknowledgementReceiptResponseMessage.serverSignature,
    ).toBeDefined();
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
    expect(transferCompleteRequestMessage.common?.clientGatewayPubkey).toBe(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.clientGatewayPubkey,
    );
    expect(transferCompleteRequestMessage.common?.serverGatewayPubkey).toBe(
      commitFinalAcknowledgementReceiptResponseMessage.common
        ?.serverGatewayPubkey,
    );
    expect(transferCompleteRequestMessage.hashTransferCommence).toBe(
      getMessageHash(
        mockSession.getClientSessionData(),
        MessageType.TRANSFER_COMMENCE_REQUEST,
      ),
    );
    expect(
      transferCompleteRequestMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(transferCompleteRequestMessage.clientSignature).toBeDefined();
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
    expect(transferCompleteResponseMessage.common?.clientGatewayPubkey).toBe(
      transferCompleteRequestMessage.common?.clientGatewayPubkey,
    );
    expect(transferCompleteResponseMessage.common?.serverGatewayPubkey).toBe(
      transferCompleteRequestMessage.common?.serverGatewayPubkey,
    );
    expect(
      transferCompleteResponseMessage.common?.hashPreviousMessage,
    ).toBeDefined();
    expect(transferCompleteResponseMessage.serverSignature).toBeDefined();
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
