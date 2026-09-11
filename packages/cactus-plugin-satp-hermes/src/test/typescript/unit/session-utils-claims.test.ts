/**
 * Unit tests for the draft-16 required transfer-init claims populated by
 * populateClientSessionData().
 *
 * Regression coverage for the gateway e2e failures where the client session
 * never populated assetProfileId / verifiedOriginatorEntityId /
 * verifiedBeneficiaryEntityId: the server then rejected every
 * TransferProposalRequest via checkTransferClaims() and the error-response
 * built from the incomplete session tripped the client-side common-body
 * verifier.
 */
import { create } from "@bufbuild/protobuf";
import { SATPSession } from "../../../main/typescript/core/satp-session";
import { populateClientSessionData } from "../../../main/typescript/core/session-utils";
import {
  LockType,
  TransferClaimsSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import { TokenType } from "../../../main/typescript/public-api";
import { checkTransferClaims } from "../../../main/typescript/core/stage-services/verifier/stage-1-server-service-verifications";
import { SATPLoggerProvider } from "../../../main/typescript/core/satp-logger-provider";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import {
  DEFAULT_TLS13_CIPHER_SUITE,
  SATP_CORE_VERSION,
} from "../../../main/typescript/core/constants";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const logger = SATPLoggerProvider.getOrCreate(
  {
    label: "session-utils-claims.test",
    level: "ERROR",
  },
  monitorService,
);

const SOURCE_OWNER = "source-owner";
const RECEIVER_OWNER = "receiver-owner";

function makePopulatedClientSession(): SATPSession {
  const session = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
    monitorService,
  });

  return populateClientSessionData(
    session,
    SATP_CORE_VERSION,
    "sourceContractAddress",
    "receiverContractAddress",
    "clientGatewayPubkey",
    "serverGatewayPubkey",
    "receiverGatewayOwnerId",
    "senderGatewayOwnerId",
    "ES256",
    DEFAULT_TLS13_CIPHER_SUITE,
    LockType.TIME_LOCK,
    BigInt(1000 * 60 * 5),
    "MOCK_LOGGING_PROFILE",
    "MOCK_ACCESS_CONTROL_PROFILE",
    "100",
    "100",
    "Org1MSP",
    "mychannel",
    "Org2MSP",
    "mychannel",
    "SATPTokenContract",
    "SATPTokenContract",
    SOURCE_OWNER,
    RECEIVER_OWNER,
    "BesuLedgerTestNetwork",
    "reference-id-source",
    "BESU_2X",
    TokenType.Fungible,
    "EthereumLedgerTestNetwork",
    "reference-id-receiver",
    "ETHEREUM",
    TokenType.Fungible,
  );
}

describe("populateClientSessionData draft-16 required claims", () => {
  it("populates the required transfer-init claim fields on the client session", () => {
    const session = makePopulatedClientSession();
    const sessionData = session.getClientSessionData()!;

    expect(sessionData.assetProfileId).not.toBe("");
    expect(sessionData.verifiedOriginatorEntityId).toBe(SOURCE_OWNER);
    expect(sessionData.verifiedBeneficiaryEntityId).toBe(RECEIVER_OWNER);
  });

  it("produces transfer-init claims that pass checkTransferClaims()", () => {
    const sessionData = makePopulatedClientSession().getClientSessionData()!;

    // Mirrors the claims block built by Stage1ClientService#transferProposalRequest()
    const transferInitClaims = create(TransferClaimsSchema, {
      digitalAssetId: sessionData.digitalAssetId,
      assetProfileId: sessionData.assetProfileId,
      verifiedOriginatorEntityId: sessionData.verifiedOriginatorEntityId,
      verifiedBeneficiaryEntityId: sessionData.verifiedBeneficiaryEntityId,
      senderGatewayNetworkId: sessionData.senderGatewayNetworkId,
      recipientGatewayNetworkId: sessionData.recipientGatewayNetworkId,
      senderGatewaySignaturePublicKey: sessionData.clientGatewayPubkey,
      receiverGatewaySignaturePublicKey: sessionData.serverGatewayPubkey,
      senderGatewayOwnerId: sessionData.senderGatewayOwnerId,
      receiverGatewayOwnerId: sessionData.receiverGatewayOwnerId,
    });

    expect(
      checkTransferClaims("TestVerifier", transferInitClaims, logger),
    ).toBe(true);
  });
});
