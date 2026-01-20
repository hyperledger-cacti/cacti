import { KnexAuditEntryRepository } from "../../../../main/typescript/database/repository/knex-audit-repository";

import type {
  AuditEntry,
  Audit,
  LocalLog,
} from "../../../../main/typescript/core/types";
import { v4 as uuidv4 } from "uuid";

describe("AuditEntry Repository Integration Tests (Given-When-Then)", () => {
  let repository: KnexAuditEntryRepository;

  const mockLocalLog: LocalLog = {
    sessionId: "691f24ad-3d74-4a32-b40e-0d848339fb2a-MOCK_CONTEXT_ID",
    type: "INIT_RECEIPT",
    key: "691f24ad-3d74-4a32-b40e-0d848339fb2a-MOCK_CONTEXT_ID-INIT_RECEIPT-init",
    operation: "init",
    timestamp: "1751969518906",
    data: JSON.stringify({
      $typeName: "cacti.satp.v02.session.SessionData",
      accessControlProfile: "MOCK_ACCESS_CONTROL_PROFILE",
      applicationProfile: "",
      assetProfileId: "",
      beneficiaryPubkey: "",
      clientGatewayPubkey:
        "03427bc501bb733d9c274841038153349746a8ebec63a4d5c29f77d9529b713993",
      clientTransferNumber: "",
      credentialProfile: 3,
      developerUrn: "",
      digitalAssetId: "MOCK_DIGITAL_ASSET_ID",
      errorCode: 0,
      hashTransferInitClaims: "",
      hashes: {
        $typeName: "cacti.satp.v02.session.MessageStagesHashes",
        stage0: {
          $typeName: "cacti.satp.v02.session.Stage0Hashes",
          newSessionRequestMessageHash: "Server#0#newSessionResponse()",
          newSessionResponseMessageHash: "",
          preSatpTransferRequestMessageHash:
            "Server#0#preSATPTransferResponse()",
          preSatpTransferResponseMessageHash: "",
          preTransferVerificationRequestMessageHash: "",
          preTransferVerificationResponseMessageHash: "",
        },
        stage1: {
          $typeName: "cacti.satp.v02.session.Stage1Hashes",
          transferCommenceRequestMessageHash: "",
          transferCommenceResponseMessageHash: "",
          transferProposalReceiptMessageHash: "",
          transferProposalRejectMessageHash: "",
          transferProposalRequestMessageHash:
            "2817b6d2ee20c3818a8d2012332af1ae945efa381a3cb0ac4410afdb4c4e30c2",
        },
        stage2: {
          $typeName: "cacti.satp.v02.session.Stage2Hashes",
          lockAssertionReceiptMessageHash: "",
          lockAssertionRequestMessageHash: "",
        },
        stage3: {
          $typeName: "cacti.satp.v02.session.Stage3Hashes",
          commitFinalAcknowledgementReceiptResponseMessageHash: "",
          commitFinalAssertionRequestMessageHash: "",
          commitPreparationRequestMessageHash: "",
          commitReadyResponseMessageHash: "",
          transferCompleteMessageHash: "",
          transferCompleteResponseMessageHash: "",
        },
      },
      history: [],
      id: "691f24ad-3d74-4a32-b40e-0d848339fb2a-MOCK_CONTEXT_ID",
      lastMessageHash: "",
      lastMessageReceivedTimestamp: "1751969518905",
      lastSequenceNumber: 0,
      lockAssertionExpiration: 0,
      lockExpirationTime: 1000,
      lockType: 1,
      loggingProfile: "MOCK_LOGGING_PROFILE",
      maxRetries: "",
      maxTimeout: "",
      multipleCancelsAllowed: false,
      multipleClaimsAllowed: false,
      originatorPubkey: "",
      phaseError: 0,
      processedTimestamps: {
        $typeName: "cacti.satp.v02.session.MessageStagesTimestamps",
        stage0: {
          $typeName: "cacti.satp.v02.session.Stage0Timestamps",
          newSessionRequestMessageTimestamp: "1751969518586",
          newSessionResponseMessageTimestamp: "",
          preSatpTransferRequestMessageTimestamp: "1751969518846",
          preSatpTransferResponseMessageTimestamp: "",
          preTransferVerificationRequestMessageTimestamp: "",
          preTransferVerificationResponseMessageTimestamp: "",
        },
        stage1: {
          $typeName: "cacti.satp.v02.session.Stage1Timestamps",
          transferCommenceRequestMessageTimestamp: "",
          transferCommenceResponseMessageTimestamp: "",
          transferProposalReceiptMessageTimestamp: "",
          transferProposalRejectMessageTimestamp: "",
          transferProposalRequestMessageTimestamp: "",
        },
        stage2: {
          $typeName: "cacti.satp.v02.session.Stage2Timestamps",
          lockAssertionReceiptMessageTimestamp: "",
          lockAssertionRequestMessageTimestamp: "",
        },
        stage3: {
          $typeName: "cacti.satp.v02.session.Stage3Timestamps",
          commitFinalAcknowledgementReceiptResponseMessageTimestamp: "",
          commitFinalAssertionRequestMessageTimestamp: "",
          commitPreparationRequestMessageTimestamp: "",
          commitReadyResponseMessageTimestamp: "",
          transferCompleteMessageTimestamp: "",
          transferCompleteResponseMessageTimestamp: "",
        },
      },
      proposedTransferInitClaims: "",
      receivedTimestamps: {
        $typeName: "cacti.satp.v02.session.MessageStagesTimestamps",
        stage0: {
          $typeName: "cacti.satp.v02.session.Stage0Timestamps",
          newSessionRequestMessageTimestamp: "1751969518554",
          newSessionResponseMessageTimestamp: "",
          preSatpTransferRequestMessageTimestamp: "1751969518813",
          preSatpTransferResponseMessageTimestamp: "",
          preTransferVerificationRequestMessageTimestamp: "",
          preTransferVerificationResponseMessageTimestamp: "",
        },
        stage1: {
          $typeName: "cacti.satp.v02.session.Stage1Timestamps",
          transferCommenceRequestMessageTimestamp: "",
          transferCommenceResponseMessageTimestamp: "",
          transferProposalReceiptMessageTimestamp: "",
          transferProposalRejectMessageTimestamp: "",
          transferProposalRequestMessageTimestamp: "1751969518905",
        },
        stage2: {
          $typeName: "cacti.satp.v02.session.Stage2Timestamps",
          lockAssertionReceiptMessageTimestamp: "",
          lockAssertionRequestMessageTimestamp: "",
        },
        stage3: {
          $typeName: "cacti.satp.v02.session.Stage3Timestamps",
          commitFinalAcknowledgementReceiptResponseMessageTimestamp: "",
          commitFinalAssertionRequestMessageTimestamp: "",
          commitPreparationRequestMessageTimestamp: "",
          commitReadyResponseMessageTimestamp: "",
          transferCompleteMessageTimestamp: "",
          transferCompleteResponseMessageTimestamp: "",
        },
      },
      receiverAsset: {
        $typeName: "cacti.satp.v02.common.Asset",
        amount: 0,
        channelName: "MOCK_CHANNEL_ID",
        contractAddress: "",
        contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
        mspId: "MOCK_RECEIVER_ASSET_MSP_ID",
        networkId: {
          $typeName: "cacti.satp.v02.common.NetworkId",
          id: "FABRIC",
          type: "FABRIC_2",
        },
        owner: "MOCK_RECEIVER_ASSET_OWNER",
        referenceId: "",
        tokenId: "bba5c7d1-699b-4bfd-aeda-6cfb32d9a193-MOCK_CONTEXT_ID-1-",
        tokenType: 1,
      },
      receiverGatewayOwnerId: "MOCK_RECEIVER_GATEWAY_OWNER_ID",
      receiverWrapAssertionClaim: {
        $typeName: "cacti.satp.v02.common.WrapAssertionClaim",
        proof: "",
        receipt: "",
        signature: "",
      },
      recipientBasePath: "",
      recipientGatewayNetworkId: "MOCK_APPROVE_ADDRESS",
      recipientLedgerAssetId: "",
      recoveredTried: false,
      resourceUrl: "MOCK_RESOURCE_URL",
      role: 0,
      satpMessages: {
        $typeName: "cacti.satp.v02.session.SATPMessages",
        stage0: { $typeName: "cacti.satp.v02.session.Stage0Messages" },
        stage1: { $typeName: "cacti.satp.v02.session.Stage1Messages" },
        stage2: { $typeName: "cacti.satp.v02.session.Stage2Messages" },
        stage3: { $typeName: "cacti.satp.v02.session.Stage3Messages" },
      },
      senderAsset: {
        $typeName: "cacti.satp.v02.common.Asset",
        amount: 0,
        channelName: "",
        contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
        contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
        mspId: "",
        networkId: {
          $typeName: "cacti.satp.v02.common.NetworkId",
          id: "BESU",
          type: "BESU_2X",
        },
        owner: "MOCK_SENDER_ASSET_OWNER",
        referenceId: "",
        tokenId: "MOCK_TOKEN_ID",
        tokenType: 1,
      },
      senderGatewayNetworkId: "MOCK_APPROVE_ADDRESS",
      senderGatewayOwnerId: "MOCK_SENDER_GATEWAY_OWNER_ID",
      serverGatewayPubkey:
        "03427bc501bb733d9c274841038153349746a8ebec63a4d5c29f77d9529b713993",
      serverTransferNumber: "",
      signatureAlgorithm: 1,
      signatures: {
        $typeName: "cacti.satp.v02.session.MessageStagesSignatures",
        stage0: {
          $typeName: "cacti.satp.v02.session.Stage0Signatures",
          newSessionRequestMessageSignature:
            "afb6120cabb96adbdef18cc337c80669a6ef7a625482cd9599c15b9f2836000e22b63c3fbc8c6e9b027e1d2f5de05de57927f73f69f49b1e6b371d833e67174e",
          newSessionResponseMessageSignature: "",
          preSatpTransferRequestMessageSignature:
            "ef5acfcc35f3bcbe1464e2797fd5fff4c575e7e9ef434e8c4ffd07133cc9f50e1a76b64d4463eef122d3491d9cb0e7de5534163809f5eaade11ac72628614957",
          preSatpTransferResponseMessageSignature: "",
          preTransferVerificationRequestMessageSignature: "",
          preTransferVerificationResponseMessageSignature: "",
        },
        stage1: {
          $typeName: "cacti.satp.v02.session.Stage1Signatures",
          transferCommenceRequestMessageSignature: "",
          transferCommenceResponseMessageSignature: "",
          transferProposalReceiptMessageSignature: "",
          transferProposalRejectMessageSignature: "",
          transferProposalRequestMessageSignature: "",
        },
        stage2: {
          $typeName: "cacti.satp.v02.session.Stage2Signatures",
          lockAssertionReceiptMessageSignature: "",
          lockAssertionRequestMessageSignature: "",
        },
        stage3: {
          $typeName: "cacti.satp.v02.session.Stage3Signatures",
          commitFinalAcknowledgementReceiptResponseMessageSignature: "",
          commitFinalAssertionRequestMessageSignature: "",
          commitPreparationRequestMessageSignature: "",
          commitReadyResponseMessageSignature: "",
          transferCompleteMessageSignature: "",
          transferCompleteResponseMessageSignature: "",
        },
      },
      sourceBasePath: "",
      sourceLedgerAssetId: "",
      state: 1,
      transferContextId: "MOCK_CONTEXT_ID",
      verifiedBeneficiaryEntityId: "",
      verifiedOriginatorEntityId: "",
      version: "v02",
    }),
    sequenceNumber: 0,
  };

  const mockLocalLog2: LocalLog = {
    sessionId: "session-123",
    type: "state-change",
    key: "log-002",
    operation: "commit-ready",
    timestamp: (Date.now() + 1000).toString(),
    data: JSON.stringify({ assetId: "asset-1", status: "unlocked" }),
    sequenceNumber: 2,
  };

  beforeAll(async () => {
    repository = new KnexAuditEntryRepository({
      client: "sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
    });
    await repository.database.migrate.latest();
  });

  beforeEach(async () => {
    await repository.getAuditEntriesTable().del();
  });

  afterAll(async () => {
    await repository.destroy();
  });

  it("Given a valid AuditEntry, When creating and retrieving by ID, Then it should return the same AuditEntry", async () => {
    // Given
    const auditEntry: AuditEntry = {
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: new Date().toString(),
    };

    // When
    await repository.create(auditEntry);
    const retrieved = await repository.readById(auditEntry.auditEntryId);

    // Then
    expect(retrieved).toBeDefined();
    expect(retrieved?.auditEntryId).toEqual(auditEntry.auditEntryId);
    expect(retrieved?.timestamp).toEqual(auditEntry.timestamp);
  });

  it("Given multiple AuditEntries, When reading by time interval, Then it should return only the entries within that interval", async () => {
    // Given
    const now = new Date();
    const later = new Date(now.getTime() + 5000);

    const entries: AuditEntry[] = [
      {
        auditEntryId: uuidv4(),
        session: mockLocalLog,
        timestamp: now.toString(),
      },
      {
        auditEntryId: uuidv4(),
        session: mockLocalLog2,
        timestamp: (now.getTime() + 10000).toString(),
      },
    ];

    for (const entry of entries) {
      await repository.create(entry);
    }

    // When
    const audit: Audit = await repository.readByTimeInterval(
      now.toString(),
      new Date(later.getTime() + 5000).toString(),
    );

    // Then
    expect(audit.auditEntries.length).toEqual(1);
    expect(audit.auditEntries[0].auditEntryId).toEqual(entries[0].auditEntryId);
    expect(audit.auditEntries[0].session.sessionId).toEqual(
      mockLocalLog.sessionId,
    );
  });

  it("Given an empty database, When reading by non-existing ID, Then it should return undefined", async () => {
    // Given / When / Then
    await expect(repository.readById("non-existing-id")).rejects.toThrow(
      TypeError,
    );
  });

  it("Given existing AuditEntries, When resetting the database, Then all entries should be removed", async () => {
    // Given
    const auditEntry: AuditEntry = {
      auditEntryId: uuidv4(),
      session: mockLocalLog,
      timestamp: new Date().toString(),
    };
    await repository.create(auditEntry);

    // When
    await repository.reset();
    const allEntries = await repository.getAuditEntriesTable().select();

    // Then
    expect(allEntries.length).toEqual(0);
  });

  it("Given a repository instance, When destroying it, Then the database connection should close without errors", async () => {
    // Given / When / Then
    await expect(repository.destroy()).resolves.toBeUndefined();
  });
});
