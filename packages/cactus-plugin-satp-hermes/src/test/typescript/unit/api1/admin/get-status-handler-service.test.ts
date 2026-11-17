import "jest-extended";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import { getStatusService } from "../../../../../main/typescript/api1/admin/get-status-handler-service";
import { SATPSession } from "../../../../../main/typescript/core/satp-session";
import { populateClientSessionData } from "../../../../../main/typescript/core/session-utils";
import {
  DEFAULT_TLS13_CIPHER_SUITE,
  SATP_CORE_VERSION,
} from "../../../../../main/typescript/core/constants";
import { GetStatusError } from "../../../../../main/typescript/core/errors/satp-errors";
import { LockType } from "../../../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import { State } from "../../../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import {
  StatusResponseStatusEnum,
  StatusResponseSubstatusEnum,
} from "../../../../../main/typescript/generated/gateway-client/typescript-axios/api";
import { TokenType } from "../../../../../main/typescript/public-api";
import { MonitorService } from "../../../../../main/typescript/services/monitoring/monitor";
import type { SATPManager } from "../../../../../main/typescript/services/gateway/satp-manager";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const SENDER_NETWORK_ID = "BesuLedgerTestNetwork";
const RECEIVER_NETWORK_ID = "FabricLedgerTestNetwork";

function makeClientSession(): SATPSession {
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
    "source-owner",
    "receiver-owner",
    SENDER_NETWORK_ID,
    "reference-id-source",
    LedgerType.Besu2X,
    TokenType.NonstandardFungible,
    RECEIVER_NETWORK_ID,
    "reference-id-receiver",
    LedgerType.Fabric2,
    TokenType.NonstandardFungible,
  );
}

function mockManager(session: SATPSession | undefined): SATPManager {
  return {
    getSession: jest.fn().mockReturnValue(session),
  } as unknown as SATPManager;
}

describe("getStatusService()", () => {
  it("reports the sender network as origin and the receiver network as destination", async () => {
    const session = makeClientSession();
    const sessionData = session.getClientSessionData();
    sessionData.state = State.ONGOING;

    const result = await getStatusService(
      "ERROR",
      { sessionID: session.getSessionId() },
      mockManager(session),
    );

    expect(result.originNetwork).toEqual({
      id: SENDER_NETWORK_ID,
      dltProtocol: "besu",
      dltSubnetworkID: "v24.4.0-RC1",
    });
    expect(result.destinationNetwork).toEqual({
      id: RECEIVER_NETWORK_ID,
      dltProtocol: "fabric",
      dltSubnetworkID: "v2.0.0",
    });
    expect(result.status).toBe(StatusResponseStatusEnum.Pending);
    expect(result.substatus).toBe(StatusResponseSubstatusEnum.Partial);
  });

  it("reports the receiver network as destination when session hashes are missing", async () => {
    const session = makeClientSession();
    session.getClientSessionData().hashes = undefined;

    const result = await getStatusService(
      "ERROR",
      { sessionID: session.getSessionId() },
      mockManager(session),
    );

    expect(result.status).toBe(StatusResponseStatusEnum.Invalid);
    expect(result.substatus).toBe(StatusResponseSubstatusEnum.UnknownError);
    expect(result.originNetwork?.id).toBe(SENDER_NETWORK_ID);
    expect(result.destinationNetwork?.id).toBe(RECEIVER_NETWORK_ID);
    expect(result.destinationNetwork?.dltProtocol).toBe("fabric");
  });

  it("throws GetStatusError when the session does not exist", async () => {
    await expect(
      getStatusService(
        "ERROR",
        { sessionID: "unknown-session-id" },
        mockManager(undefined),
      ),
    ).rejects.toBeInstanceOf(GetStatusError);
  });
});
