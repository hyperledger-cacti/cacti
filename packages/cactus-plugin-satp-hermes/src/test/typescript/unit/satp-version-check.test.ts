/**
 * Unit tests for the SATP version gate enforced by gateways.
 *
 * Verifies that SATPSession#verify() (the check every gateway stage runs
 * before processing a peer message) accepts only sessions carrying the
 * v13 wire protocol version and rejects any other value, including the
 * implementation version string, with SATPVersionError.
 */
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import type { LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";

import { SATP_CORE_VERSION } from "../../../main/typescript/core/constants";
import { SATPSession } from "../../../main/typescript/core/satp-session";
import { SessionType } from "../../../main/typescript/core/session-utils";
import {
  SATPVersionError,
  SessionDataNotLoadedCorrectlyError,
} from "../../../main/typescript/core/errors/satp-service-errors";
import { State } from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import {
  AssetSchema,
  LockType,
  NetworkIdSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import { create } from "@bufbuild/protobuf";
import { DEFAULT_TLS13_CIPHER_SUITE } from "../../../main/typescript/core/constants";

const logLevel: LogLevelDesc = "ERROR";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

afterAll(async () => {
  await monitorService.shutdown();
});

function makeSession(contextID: string): SATPSession {
  return new SATPSession({
    contextID,
    server: false,
    client: true,
    monitorService,
    logLevel,
  });
}

function populateSessionData(session: SATPSession, version: string): void {
  const sessionData = session.getClientSessionData();
  if (!sessionData) {
    throw new Error("Session data not found");
  }

  sessionData.version = version;
  sessionData.state = State.ONGOING;
  sessionData.clientGatewayPubkey = "MOCK_CLIENT_PUBKEY";
  sessionData.serverGatewayPubkey = "MOCK_SERVER_PUBKEY";
  sessionData.senderGatewayOwnerId = "MOCK_SENDER_GATEWAY_OWNER_ID";
  sessionData.receiverGatewayOwnerId = "MOCK_RECEIVER_GATEWAY_OWNER_ID";
  sessionData.senderGatewayNetworkId = "MOCK_SENDER_NETWORK_ID";
  sessionData.recipientGatewayNetworkId = "MOCK_RECIPIENT_NETWORK_ID";
  sessionData.digitalAssetId = "MOCK_DIGITAL_ASSET_ID";
  sessionData.signatureAlgorithm = "ES256";
  sessionData.gatewayTlsScheme = DEFAULT_TLS13_CIPHER_SUITE;
  sessionData.lockType = LockType.TIME_LOCK;
  sessionData.lockExpirationTime = BigInt(1000);
  sessionData.loggingProfile = "MOCK_LOGGING_PROFILE";
  sessionData.accessControlProfile = "MOCK_ACCESS_CONTROL_PROFILE";
  sessionData.resourceUrl = "MOCK_RESOURCE_URL";
  sessionData.senderAsset = create(AssetSchema, {
    tokenId: "MOCK_TOKEN_ID",
    tokenType: 1,
    amount: BigInt(0),
    owner: "MOCK_SENDER_ASSET_OWNER",
    contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
    contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
    networkId: create(NetworkIdSchema, {
      id: "MOCK_SENDER_NETWORK_ID",
      type: LedgerType.Besu2X,
    }),
  });
  sessionData.receiverAsset = create(AssetSchema, {
    tokenId: "MOCK_RECEIVER_TOKEN_ID",
    tokenType: 1,
    amount: BigInt(0),
    owner: "MOCK_RECEIVER_ASSET_OWNER",
    contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
    contractAddress: "MOCK_RECEIVER_ASSET_CONTRACT_ADDRESS",
    networkId: create(NetworkIdSchema, {
      id: "MOCK_RECIPIENT_NETWORK_ID",
      type: LedgerType.Ethereum,
    }),
  });
}

describe("Gateway SATP version verification", () => {
  it("accepts a session carrying the v13 wire protocol version", () => {
    const session = makeSession("version-accept-ctx");
    populateSessionData(session, SATP_CORE_VERSION);

    expect(() =>
      session.verify("test#accept", SessionType.CLIENT),
    ).not.toThrow();
  });

  it("rejects a session carrying a legacy protocol version", () => {
    const session = makeSession("version-legacy-ctx");
    populateSessionData(session, "v02");

    expectSessionVersionRejected(session, "test#legacy");
  });

  it("rejects a session carrying the implementation version instead of the wire protocol version", () => {
    const session = makeSession("version-impl-ctx");
    populateSessionData(session, "v13.0.1");

    expectSessionVersionRejected(session, "test#impl");
  });

  it("rejects a session with an empty version", () => {
    const session = makeSession("version-empty-ctx");
    populateSessionData(session, "");

    expectSessionVersionRejected(session, "test#empty");
  });

  /**
   * SATPSession#verify() wraps verification failures in a
   * SessionDataNotLoadedCorrectlyError; the underlying gate failure must be
   * the SATPVersionError for the mismatched version.
   */
  function expectSessionVersionRejected(
    session: SATPSession,
    tag: string,
  ): void {
    try {
      session.verify(tag, SessionType.CLIENT);
      fail(`expected session verification to reject, but it passed: ${tag}`);
    } catch (err) {
      expect(err).toBeInstanceOf(SessionDataNotLoadedCorrectlyError);
      expect((err as Error).cause).toBeInstanceOf(SATPVersionError);
    }
  }
});
