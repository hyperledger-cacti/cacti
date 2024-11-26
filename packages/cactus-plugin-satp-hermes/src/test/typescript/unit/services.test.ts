import {
  JsObjectSigner,
  LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { SATPBridgesManager } from "../../../main/typescript/gol/satp-bridges-manager";
import { SupportedChain } from "../../../main/typescript/core/types";

import {
  ISATPServiceOptions,
  SATPService,
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
  SignatureAlgorithm,
  WrapAssertionClaimSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  TransferCommenceRequestMessage,
  TransferCommenceRequestMessageSchema,
  TransferCommenceResponseMessage,
  TransferProposalReceiptMessage,
  TransferProposalReceiptMessageSchema,
  TransferProposalRequestMessage,
  TransferProposalRequestMessageSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/stage_1_pb";
import {
  LockAssertionRequestMessage,
  LockAssertionReceiptMessage,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/stage_2_pb";
import { SessionData } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/session_pb";
import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  TransferCompleteRequestMessage,
  TransferCompleteResponseMessage,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/stage_3_pb";

import { getMessageHash } from "../../../main/typescript/core/session-utils";
import { Stage0ClientService } from "../../../main/typescript/core/stage-services/client/stage0-client-service";
import { Stage0ServerService } from "../../../main/typescript/core/stage-services/server/stage0-server-service";
import {
  NewSessionRequestMessage,
  NewSessionResponseMessage,
  PreSATPTransferRequestMessage,
  PreSATPTransferResponseMessage,
  STATUS,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/stage_0_pb";
import { TokenType } from "../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { create, isMessage } from "@bufbuild/protobuf";

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

const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

const signer = new JsObjectSigner({
  privateKey: keyPairs.privateKey,
});

const supportedDLTs = [SupportedChain.FABRIC, SupportedChain.BESU];

let bridgeManager: SATPBridgesManager;

let mockSession: SATPSession;

let satpClientService0: Stage0ClientService;
let satpServerService0: Stage0ServerService;
let satpClientService1: Stage1ClientService;
let satpClientService2: Stage2ClientService;
let satpClientService3: Stage3ClientService;
let satpServerService1: Stage1ServerService;
let satpServerService2: Stage2ServerService;
let satpServerService3: Stage3ServerService;

let newSessionRequestMessage: NewSessionRequestMessage;
let newSessionResponseMessage: NewSessionResponseMessage;
let preSATPTransferRequestMessage: PreSATPTransferRequestMessage;
let preSATPTransferResponseMessage: PreSATPTransferResponseMessage;
let transferProposalRequestMessage: TransferProposalRequestMessage;
let transferProposalResponseMessage: TransferProposalReceiptMessage;
let transferCommenceRequestMessage: TransferCommenceRequestMessage;
let transferCommenceResponseMessage: TransferCommenceResponseMessage;
let lockAssertionRequestMessage: LockAssertionRequestMessage;
let lockAssertionReceiptMessage: LockAssertionReceiptMessage;
let commitPreparationRequestMessage: CommitPreparationRequestMessage;
let commitReadyResponseMessage: CommitReadyResponseMessage;
let commitFinalAssertionRequestMessage: CommitFinalAssertionRequestMessage;
let commitFinalAcknowledgementReceiptResponseMessage: CommitFinalAcknowledgementReceiptResponseMessage;
let transferCompleteRequestMessage: TransferCompleteRequestMessage;
let transferCompleteResponseMessage: TransferCompleteResponseMessage;

const sessionIDs: string[] = [];

beforeAll(async () => {
  bridgeManager = new SATPBridgesManager({
    supportedDLTs: supportedDLTs,
    networks: [],
    logLevel: logLevel,
  });

  mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
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
    sessionData.originatorPubkey = "MOCK_ORIGINATOR_PUBKEY";
    sessionData.beneficiaryPubkey = "MOCK_BENEFICIARY_PUBKEY";
    sessionData.digitalAssetId = "MOCK_DIGITAL_ASSET_ID";
    sessionData.assetProfileId = "MOCK_ASSET_PROFILE_ID";
    sessionData.verifiedOriginatorEntityId =
      "MOCK_VERIFIED_ORIGINATOR_ENTITY_ID";
    sessionData.verifiedBeneficiaryEntityId =
      "MOCK_VERIFIED_BENEFICIARY_ENTITY_ID";
    sessionData.receiverGatewayOwnerId = "MOCK_RECEIVER_GATEWAY_OWNER_ID";
    sessionData.recipientGatewayNetworkId = SupportedChain.FABRIC;
    sessionData.senderGatewayOwnerId = "MOCK_SENDER_GATEWAY_OWNER_ID";
    sessionData.senderGatewayNetworkId = SupportedChain.BESU;
    sessionData.signatureAlgorithm = SignatureAlgorithm.RSA;
    sessionData.lockType = LockType.FAUCET;
    sessionData.lockExpirationTime = BigInt(1000);
    sessionData.credentialProfile = CredentialProfile.X509;
    sessionData.loggingProfile = "MOCK_LOGGING_PROFILE";
    sessionData.accessControlProfile = "MOCK_ACCESS_CONTROL_PROFILE";
    sessionData.resourceUrl = "MOCK_RESOURCE_URL";
    sessionData.lockAssertionExpiration = BigInt(99999);
    sessionData.receiverContractOntology = "MOCK_RECEIVER_CONTRACT_ONTOLOGY"; //TODO when implemented verification of Contract Ontology change this
    sessionData.senderContractOntology = "MOCK_SENDER_CONTRACT_ONTOLOGY";
    sessionData.sourceLedgerAssetId = "MOCK_SOURCE_LEDGER_ASSET_ID";

    sessionData.senderAsset = create(AssetSchema, {
      tokenId: "MOCK_TOKEN_ID",
      tokenType: TokenType.ERC20,
      amount: BigInt(0),
      owner: "MOCK_SENDER_ASSET_OWNER",
      ontology: "MOCK_SENDER_ASSET_ONTOLOGY",
      contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
      contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
    });
    sessionData.receiverAsset = create(AssetSchema, {
      tokenType: TokenType.ERC20,
      amount: BigInt(0),
      owner: "MOCK_RECEIVER_ASSET_OWNER",
      ontology: "MOCK_RECEIVER_ASSET_ONTOLOGY",
      contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
      mspId: "MOCK_RECEIVER_ASSET_MSP_ID",
      channelName: "MOCK_CHANNEL_ID",
    });

    expect(satpClientService1).toBeDefined();
    expect(satpClientService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#1`,
    );

    newSessionRequestMessage = await satpClientService0.newSessionRequest(
      mockSession,
      SupportedChain.BESU,
    );

    expect(newSessionRequestMessage).toBeDefined();
    expect(newSessionRequestMessage.contextId).toBe(
      mockSession.getClientSessionData()?.transferContextId,
    );
    expect(newSessionRequestMessage.senderGatewayNetworkId).toBe(
      mockSession.getClientSessionData().senderGatewayNetworkId,
    );
    expect(newSessionRequestMessage.recipientGatewayNetworkId).toBe(
      mockSession.getClientSessionData().recipientGatewayNetworkId,
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

    expect(mockSession.getServerSessionData()).toBeDefined();
    expect(mockSession.getServerSessionData()?.transferContextId).toBe(
      newSessionRequestMessage.contextId,
    );
    expect(mockSession.getServerSessionData()?.senderGatewayNetworkId).toBe(
      newSessionRequestMessage.senderGatewayNetworkId,
    );
    expect(mockSession.getServerSessionData()?.recipientGatewayNetworkId).toBe(
      newSessionRequestMessage.recipientGatewayNetworkId,
    );
  });
  it("Service0Server newSessionResponse", async () => {
    newSessionResponseMessage = await satpServerService0.newSessionResponse(
      newSessionRequestMessage,
      mockSession,
    );

    expect(newSessionResponseMessage).toBeDefined();
    expect(newSessionResponseMessage.contextId).toBe(
      mockSession.getClientSessionData()?.transferContextId,
    );
    expect(newSessionResponseMessage.senderGatewayNetworkId).toBe(
      mockSession.getClientSessionData().senderGatewayNetworkId,
    );
    expect(newSessionResponseMessage.recipientGatewayNetworkId).toBe(
      mockSession.getClientSessionData().recipientGatewayNetworkId,
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

    expect(preSATPTransferRequestMessage).toBeDefined();
    expect(preSATPTransferRequestMessage.sessionId).toBe(sessionData.id);
    expect(preSATPTransferRequestMessage.contextId).toBe(
      sessionData.transferContextId,
    );
    expect(preSATPTransferRequestMessage.senderGatewayNetworkId).toBe(
      sessionData.senderGatewayNetworkId,
    );
    expect(preSATPTransferRequestMessage.recipientGatewayNetworkId).toBe(
      sessionData.recipientGatewayNetworkId,
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
        supportedDLTs,
      )) as TransferProposalRequestMessage;

    expect(
      isMessage(
        transferProposalRequestMessage,
        TransferProposalRequestMessageSchema,
      ),
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
      transferProposalRequestMessage.transferInitClaims?.originatorPubkey,
    ).toBe(sessionData.originatorPubkey);
    expect(
      transferProposalRequestMessage.transferInitClaims?.beneficiaryPubkey,
    ).toBe(sessionData.beneficiaryPubkey);
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
    ).toBe(SupportedChain.BESU);
    expect(
      transferProposalRequestMessage.transferInitClaims
        ?.recipientGatewayNetworkId,
    ).toBe(SupportedChain.FABRIC);
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
  it("Service1Server checkTransferProposalRequestMessage", async () => {
    expect(satpServerService1).toBeDefined();
    expect(satpServerService1.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#1`,
    );

    await satpServerService1.checkTransferProposalRequestMessage(
      transferProposalRequestMessage,
      mockSession,
      supportedDLTs,
    );
  });
  it("Service1Server transferProposalResponse", async () => {
    transferProposalResponseMessage =
      (await satpServerService1.transferProposalResponse(
        transferProposalRequestMessage,
        mockSession,
      )) as TransferProposalReceiptMessage;

    expect(
      isMessage(
        transferProposalResponseMessage,
        TransferProposalReceiptMessageSchema,
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
  it("Service1Client checkTransferProposalReceiptMessage", async () => {
    await satpClientService1.checkTransferProposalReceiptMessage(
      transferProposalResponseMessage,
      mockSession,
    );
  });
  it("Service1Client transferCommenceRequest", async () => {
    transferCommenceRequestMessage =
      (await satpClientService1.transferCommenceRequest(
        transferProposalResponseMessage,
        mockSession,
      )) as TransferCommenceRequestMessage;

    expect(
      isMessage(
        transferCommenceRequestMessage,
        TransferCommenceRequestMessageSchema,
      ),
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

  it("Service1Server checkTransferCommenceRequestMessage", async () => {
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
      )) as TransferCommenceResponseMessage;

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
  it("Service2Client checkTransferCommenceResponseMessage", async () => {
    expect(satpClientService2).toBeDefined();
    expect(satpClientService2.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#2`,
    );

    await satpClientService2.checkTransferCommenceResponseMessage(
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
      )) as LockAssertionRequestMessage;

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
  it("Service2Server checkLockAssertionRequestMessage", async () => {
    expect(satpServerService2).toBeDefined();
    expect(satpServerService2.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#2`,
    );

    await satpServerService2.checkLockAssertionRequestMessage(
      lockAssertionRequestMessage,
      mockSession,
    );
  });
  it("Service2Server lockAssertionResponse", async () => {
    lockAssertionReceiptMessage =
      (await satpServerService2.lockAssertionResponse(
        lockAssertionRequestMessage,
        mockSession,
      )) as LockAssertionReceiptMessage;

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
  it("Service3Client checkLockAssertionReceiptMessage", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    await satpClientService3.checkLockAssertionReceiptMessage(
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
      )) as CommitPreparationRequestMessage;

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
  it("Service3Server checkCommitPreparationRequestMessage", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    await satpServerService3.checkCommitPreparationRequestMessage(
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
    )) as CommitReadyResponseMessage;

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
  it("Service3Client checkCommitReadyResponseMessage", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );
    await satpClientService3.checkCommitReadyResponseMessage(
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
      )) as CommitFinalAssertionRequestMessage;

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
  it("Service3Server checkCommitFinalAssertionRequestMessage", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    await satpServerService3.checkCommitFinalAssertionRequestMessage(
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
      )) as CommitFinalAcknowledgementReceiptResponseMessage;

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
  it("Service3Client checkCommitFinalAcknowledgementReceiptResponseMessage", async () => {
    expect(satpClientService3).toBeDefined();
    expect(satpClientService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Client}#3`,
    );

    await satpClientService3.checkCommitFinalAcknowledgementReceiptResponseMessage(
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
    )) as TransferCompleteRequestMessage;

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
  it("Service3Server checkTransferCompleteRequestMessage", async () => {
    expect(satpServerService3).toBeDefined();
    expect(satpServerService3.getServiceIdentifier()).toBe(
      `${SATPServiceType.Server}#3`,
    );

    await satpServerService3.checkTransferCompleteRequestMessage(
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
      )) as TransferCompleteResponseMessage;

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
