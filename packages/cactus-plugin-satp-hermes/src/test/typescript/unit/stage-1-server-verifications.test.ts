/**
 * Unit tests for Stage 1 server transfer-claims verification.
 *
 * Verifies that checkTransferClaims rejects proposals whose v13 REQUIRED
 * claim fields are empty, instead of merely logging the omissions.
 */
import { SATPLoggerProvider } from "../../../main/typescript/core/satp-logger-provider";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import { checkTransferClaims } from "../../../main/typescript/core/stage-services/verifier/stage-1-server-service-verifications";
import { TransferClaimsSchema } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import { create } from "@bufbuild/protobuf";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const logger = SATPLoggerProvider.getOrCreate(
  {
    label: "stage-1-server-verifications.test",
    level: "ERROR",
  },
  monitorService,
);

const TAG = "TestVerifier";

function makeClaims(overrides?: Record<string, unknown>) {
  return create(TransferClaimsSchema, {
    digitalAssetId: "MOCK_DIGITAL_ASSET_ID",
    assetProfileId: "MOCK_ASSET_PROFILE_ID",
    verifiedOriginatorEntityId: "MOCK_ORIGINATOR_ENTITY_ID",
    verifiedBeneficiaryEntityId: "MOCK_BENEFICIARY_ENTITY_ID",
    senderGatewaySignaturePublicKey: "MOCK_SENDER_SIG_PUBKEY",
    receiverGatewaySignaturePublicKey: "MOCK_RECEIVER_SIG_PUBKEY",
    ...overrides,
  });
}

describe("checkTransferClaims — v13 REQUIRED field enforcement", () => {
  it("accepts a proposal with all required claims present", () => {
    expect(checkTransferClaims(TAG, makeClaims(), logger)).toBe(true);
  });

  it.each([
    ["digitalAssetId"],
    ["assetProfileId"],
    ["verifiedOriginatorEntityId"],
    ["verifiedBeneficiaryEntityId"],
    ["senderGatewaySignaturePublicKey"],
    ["receiverGatewaySignaturePublicKey"],
  ])("rejects a proposal with empty %s", (field) => {
    const claims = makeClaims({ [field]: "" });
    expect(checkTransferClaims(TAG, claims, logger)).toBe(false);
  });

  it("rejects undefined claims", () => {
    expect(() => checkTransferClaims(TAG, undefined, logger)).toThrow();
  });

  it("still accepts optional fields being empty", () => {
    const claims = makeClaims({
      senderGatewayNetworkId: "",
      recipientGatewayNetworkId: "",
      senderGatewayOwnerId: "",
      receiverGatewayOwnerId: "",
    });
    expect(checkTransferClaims(TAG, claims, logger)).toBe(true);
  });
});
