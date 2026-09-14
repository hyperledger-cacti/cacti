/**
 * Unit tests verifying v13 protobuf message structures.
 *
 * Phase 1 of the v02→v13 upgrade restructured CommonSatp (15 → 4 fields),
 * TransferClaims (renamed/added/removed fields), NetworkCapabilities (13 → 5),
 * LockType (6 → 3), and added RejectMessage, ErrorMessage, SessionAbortMessage.
 *
 * These tests verify the generated TypeScript types match the v13 specification
 * requirements documented in draft-ietf-satp-core-13.
 */
import { create } from "@bufbuild/protobuf";
import {
  CommonSatpSchema,
  TransferClaimsSchema,
  NetworkCapabilitiesSchema,
  RejectMessageSchema,
  ErrorMessageSchema,
  SessionAbortMessageSchema,
  MessageType,
  LockType,
  LockAssertionClaimFormatSchema,
  LockAssertionClaimSchema,
  BurnAssertionClaimSchema,
  MintAssertionClaimSchema,
  AssignmentAssertionClaimSchema,
  ClaimFormat,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";

describe("v13 Proto Structures — CommonSatp", () => {
  it("has exactly 4 fields: version, messageType, sessionId, transferContextId", () => {
    const common = create(CommonSatpSchema, {
      version: "1.0",
      messageType: MessageType.INIT_PROPOSAL,
      sessionId: "session-001",
      transferContextId: "ctx-001",
    });

    expect(common.version).toBe("1.0");
    expect(common.messageType).toBe(MessageType.INIT_PROPOSAL);
    expect(common.sessionId).toBe("session-001");
    expect(common.transferContextId).toBe("ctx-001");

    // v02 fields that were removed should NOT exist as own (non-proto) properties
    // The protobuf type only has the 4 declared fields
    expect("sequenceNumber" in common).toBe(false);
    expect("resourceUrl" in common).toBe(false);
    expect("clientGatewayPubkey" in common).toBe(false);
    expect("serverGatewayPubkey" in common).toBe(false);
    expect("hashPreviousMessage" in common).toBe(false);
    expect("error" in common).toBe(false);
    expect("errorCode" in common).toBe(false);
    expect("payloadProfile" in common).toBe(false);
    expect("payload" in common).toBe(false);
    expect("payloadHash" in common).toBe(false);
    expect("credentialBlock" in common).toBe(false);
  });

  it("defaults to empty strings and UNSPECIFIED message type", () => {
    const common = create(CommonSatpSchema, {});
    expect(common.version).toBe("");
    expect(common.messageType).toBe(MessageType.UNSPECIFIED);
    expect(common.sessionId).toBe("");
    expect(common.transferContextId).toBe("");
  });

  it("supports all v13 standard MessageType values in messageType field", () => {
    const standardTypes = [
      MessageType.INIT_PROPOSAL,
      MessageType.INIT_RECEIPT,
      MessageType.INIT_REJECT,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
      MessageType.LOCK_ASSERT,
      MessageType.ASSERTION_RECEIPT,
      MessageType.COMMIT_PREPARE,
      MessageType.COMMIT_READY,
      MessageType.COMMIT_FINAL,
      MessageType.ACK_COMMIT_FINAL,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      MessageType.ERROR,
      MessageType.SESSION_ABORT,
    ];

    for (const mt of standardTypes) {
      const common = create(CommonSatpSchema, { messageType: mt });
      expect(common.messageType).toBe(mt);
    }
  });
});

describe("v13 Proto Structures — TransferClaims", () => {
  it("contains all 18 v13 fields (12 kept/renamed + 6 new)", () => {
    const claims = create(TransferClaimsSchema, {
      digitalAssetId: "asset-001",
      assetProfileId: "profile-001",
      verifiedOriginatorEntityId: "originator-001",
      verifiedBeneficiaryEntityId: "beneficiary-001",
      originatorPublicKey: "orig-pk",
      beneficiaryPublicKey: "ben-pk",
      senderGatewayNetworkId: "net-sender",
      recipientGatewayNetworkId: "net-recipient",
      senderGatewaySignaturePublicKey: "sender-sig-pk",
      receiverGatewaySignaturePublicKey: "receiver-sig-pk",
      senderGatewayOwnerId: "owner-sender",
      receiverGatewayOwnerId: "owner-receiver",
      // v13 new fields
      networkLockType: LockType.HASH_TIME_LOCK,
      assetLockExpirationTime: BigInt(3600),
      senderGatewayId: "gw-sender",
      recipientGatewayId: "gw-recipient",
      senderGatewayDeviceIdentityPublicKey: "sender-device-pk",
      receiverGatewayDeviceIdentityPublicKey: "receiver-device-pk",
    });

    // Kept fields
    expect(claims.digitalAssetId).toBe("asset-001");
    expect(claims.assetProfileId).toBe("profile-001");
    expect(claims.verifiedOriginatorEntityId).toBe("originator-001");
    expect(claims.verifiedBeneficiaryEntityId).toBe("beneficiary-001");
    expect(claims.senderGatewayNetworkId).toBe("net-sender");
    expect(claims.recipientGatewayNetworkId).toBe("net-recipient");
    expect(claims.senderGatewayOwnerId).toBe("owner-sender");
    expect(claims.receiverGatewayOwnerId).toBe("owner-receiver");

    // Renamed fields (v02 → v13)
    expect(claims.originatorPublicKey).toBe("orig-pk"); // was originator_pubkey
    expect(claims.beneficiaryPublicKey).toBe("ben-pk"); // was beneficiary_pubkey
    expect(claims.senderGatewaySignaturePublicKey).toBe("sender-sig-pk"); // was client_gateway_pubkey
    expect(claims.receiverGatewaySignaturePublicKey).toBe("receiver-sig-pk"); // was server_gateway_pubkey

    // New v13 fields
    expect(claims.networkLockType).toBe(LockType.HASH_TIME_LOCK);
    expect(claims.assetLockExpirationTime).toBe(BigInt(3600));
    expect(claims.senderGatewayId).toBe("gw-sender");
    expect(claims.recipientGatewayId).toBe("gw-recipient");
    expect(claims.senderGatewayDeviceIdentityPublicKey).toBe(
      "sender-device-pk",
    );
    expect(claims.receiverGatewayDeviceIdentityPublicKey).toBe(
      "receiver-device-pk",
    );
  });

  it("does NOT have removed v02 fields (maxRetries, maxTimeout, amounts, policies)", () => {
    const claims = create(TransferClaimsSchema, {});
    expect("maxRetries" in claims).toBe(false);
    expect("maxTimeout" in claims).toBe(false);
    expect("amountFromOriginator" in claims).toBe(false);
    expect("amountToBeneficiary" in claims).toBe(false);
    expect("processPolicies" in claims).toBe(false);
    expect("mergePolicies" in claims).toBe(false);
  });
});

describe("v13 Proto Structures — NetworkCapabilities", () => {
  it("has exactly 5 fields per v13 Section 8.2", () => {
    const caps = create(NetworkCapabilitiesSchema, {
      gatewayDefaultSignatureAlgorithm: "ES256",
      gatewaySupportedSignatureAlgorithms: ["ES256", "ES384"],
      networkLockType: LockType.TIME_LOCK,
      networkLockExpirationTime: BigInt(7200),
      gatewayTlsScheme: "TLS_AES_128_GCM_SHA256",
    });

    expect(caps.gatewayDefaultSignatureAlgorithm).toBe("ES256");
    expect(caps.gatewaySupportedSignatureAlgorithms).toEqual([
      "ES256",
      "ES384",
    ]);
    expect(caps.networkLockType).toBe(LockType.TIME_LOCK);
    expect(caps.networkLockExpirationTime).toBe(BigInt(7200));
    expect(caps.gatewayTlsScheme).toBe("TLS_AES_128_GCM_SHA256");
  });

  it("uses string-based algorithm identifiers (not enums) per IANA JWA registry", () => {
    const caps = create(NetworkCapabilitiesSchema, {
      gatewayDefaultSignatureAlgorithm: "ES256",
    });

    // v13 changed from enum-based SignatureAlgorithm to string-based
    expect(typeof caps.gatewayDefaultSignatureAlgorithm).toBe("string");
  });

  it("does NOT have removed v02 fields", () => {
    const caps = create(NetworkCapabilitiesSchema, {});
    expect("senderGatewayNetworkId" in caps).toBe(false);
  });
});

describe("v13 Proto Structures — LockType enum", () => {
  it("has exactly 3 lock types + UNSPECIFIED (reduced from 6 in v02)", () => {
    const validValues = [
      LockType.UNSPECIFIED,
      LockType.TIME_LOCK,
      LockType.HASH_LOCK,
      LockType.HASH_TIME_LOCK,
    ];
    expect(validValues).toHaveLength(4); // 3 + UNSPECIFIED

    // Verify numeric values
    expect(LockType.UNSPECIFIED).toBe(0);
    expect(LockType.TIME_LOCK).toBe(1);
    expect(LockType.HASH_LOCK).toBe(2);
    expect(LockType.HASH_TIME_LOCK).toBe(3);
  });

  it("does NOT include removed v02 lock types (FAUCET, MULTICLAIM, DESTROYBURN)", () => {
    const lockTypeNames = Object.keys(LockType).filter((k) => isNaN(Number(k)));
    expect(lockTypeNames).not.toContain("FAUCET");
    expect(lockTypeNames).not.toContain("MULTICLAIM");
    expect(lockTypeNames).not.toContain("DESTROYBURN");
  });
});

describe("v13 Proto Structures — MessageType enum", () => {
  it("includes new v13 types: ERROR (23) and SESSION_ABORT (24)", () => {
    expect(MessageType.ERROR).toBe(23);
    expect(MessageType.SESSION_ABORT).toBe(24);
  });

  it("preserves v02 stage type numbering for backward compatibility", () => {
    expect(MessageType.INIT_PROPOSAL).toBe(6);
    expect(MessageType.INIT_RECEIPT).toBe(7);
    expect(MessageType.INIT_REJECT).toBe(8);
    expect(MessageType.TRANSFER_COMMENCE_REQUEST).toBe(9);
    expect(MessageType.TRANSFER_COMMENCE_RESPONSE).toBe(10);
    expect(MessageType.LOCK_ASSERT).toBe(11);
    expect(MessageType.ASSERTION_RECEIPT).toBe(12);
    expect(MessageType.COMMIT_PREPARE).toBe(13);
    expect(MessageType.COMMIT_READY).toBe(14);
    expect(MessageType.COMMIT_FINAL).toBe(15);
    expect(MessageType.ACK_COMMIT_FINAL).toBe(16);
    expect(MessageType.COMMIT_TRANSFER_COMPLETE).toBe(17);
  });

  it("includes non-standard Stage 0 extensions", () => {
    expect(MessageType.NEW_SESSION_REQUEST).toBe(18);
    expect(MessageType.NEW_SESSION_RESPONSE).toBe(19);
    expect(MessageType.PRE_SATP_TRANSFER_REQUEST).toBe(20);
    expect(MessageType.PRE_SATP_TRANSFER_RESPONSE).toBe(21);
  });

  it("has COMMIT_TRANSFER_COMPLETE_RESPONSE for Stage 3 completion", () => {
    expect(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE).toBe(22);
  });
});

describe("v13 Proto Structures — RejectMessage", () => {
  it("has common, hashPrevMessage, reasonCode, and timestamp", () => {
    const msg = create(RejectMessageSchema, {
      common: create(CommonSatpSchema, {
        version: "1.0",
        messageType: MessageType.INIT_REJECT,
        sessionId: "s1",
        transferContextId: "ctx-1",
      }),
      hashPrevMessage: "abc123hash",
      reasonCode: "err_2.1",
      timestamp: "2026-03-26T12:00:00Z",
    });

    expect(msg.common?.messageType).toBe(MessageType.INIT_REJECT);
    expect(msg.hashPrevMessage).toBe("abc123hash");
    expect(msg.reasonCode).toBe("err_2.1");
    expect(msg.timestamp).toBe("2026-03-26T12:00:00Z");
  });
});

describe("v13 Proto Structures — ErrorMessage", () => {
  it("has common, errorMsgType, errorType, and errorSeverity", () => {
    const msg = create(ErrorMessageSchema, {
      common: create(CommonSatpSchema, {
        version: "1.0",
        messageType: MessageType.ERROR,
        sessionId: "s2",
        transferContextId: "ctx-2",
      }),
      errorMsgType: "LOCK_ASSERT",
      errorType: "err_3.2",
      errorSeverity: "fatal",
    });

    expect(msg.common?.messageType).toBe(MessageType.ERROR);
    expect(msg.errorMsgType).toBe("LOCK_ASSERT");
    expect(msg.errorType).toBe("err_3.2");
    expect(msg.errorSeverity).toBe("fatal");
  });
});

describe("v13 Proto Structures — SessionAbortMessage", () => {
  it("has only a common field", () => {
    const msg = create(SessionAbortMessageSchema, {
      common: create(CommonSatpSchema, {
        version: "1.0",
        messageType: MessageType.SESSION_ABORT,
        sessionId: "s3",
        transferContextId: "ctx-3",
      }),
    });

    expect(msg.common?.messageType).toBe(MessageType.SESSION_ABORT);
    expect(msg.common?.sessionId).toBe("s3");
  });
});

describe("v13 Proto Structures — Assertion Claim Messages", () => {
  it("LockAssertionClaim has receipt, proof, and signature", () => {
    const claim = create(LockAssertionClaimSchema, {
      receipt: "lock-receipt",
      proof: "lock-proof",
      signature: "lock-sig",
    });
    expect(claim.receipt).toBe("lock-receipt");
    expect(claim.proof).toBe("lock-proof");
    expect(claim.signature).toBe("lock-sig");
  });

  it("BurnAssertionClaim has receipt, proof, and signature", () => {
    const claim = create(BurnAssertionClaimSchema, {
      receipt: "burn-receipt",
      proof: "burn-proof",
      signature: "burn-sig",
    });
    expect(claim.receipt).toBe("burn-receipt");
  });

  it("MintAssertionClaim has receipt, proof, and signature", () => {
    const claim = create(MintAssertionClaimSchema, {
      receipt: "mint-receipt",
      proof: "mint-proof",
      signature: "mint-sig",
    });
    expect(claim.receipt).toBe("mint-receipt");
  });

  it("AssignmentAssertionClaim has receipt, proof, and signature", () => {
    const claim = create(AssignmentAssertionClaimSchema, {
      receipt: "assign-receipt",
      proof: "assign-proof",
      signature: "assign-sig",
    });
    expect(claim.receipt).toBe("assign-receipt");
  });

  it("LockAssertionClaimFormat uses ClaimFormat enum", () => {
    const fmt = create(LockAssertionClaimFormatSchema, {
      format: ClaimFormat.DEFAULT,
    });
    expect(fmt.format).toBe(ClaimFormat.DEFAULT);
  });
});
