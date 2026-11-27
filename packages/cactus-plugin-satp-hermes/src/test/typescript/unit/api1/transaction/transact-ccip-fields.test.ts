/**
 * Characterization tests for issue #4784 (spike: API1 suitability for CCIP).
 * They call executeTransact(), the handler behind the /transact endpoint, and
 * pin CURRENT behavior for request properties that TransactRequest does not
 * declare. They bypass the HTTP validator. They do not define a CCIP field
 * contract or a mapping from finality to lock type.
 */
import type { TransactRequest } from "../../../../../main/typescript/public-api";
import { SATPSession } from "../../../../../main/typescript/core/satp-session";
import { executeTransact } from "../../../../../main/typescript/api1/transaction/transact-handler-service";
import { LockType } from "../../../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import { MonitorService } from "../../../../../main/typescript/services/monitoring/monitor";
import type { SATPManager } from "../../../../../main/typescript/services/gateway/satp-manager";
import type { GatewayOrchestrator } from "../../../../../main/typescript/services/gateway/gateway-orchestrator";

jest.mock(
  "../../../../../main/typescript/api1/admin/get-status-handler-service",
  () => ({
    getStatusService: jest.fn().mockResolvedValue({
      status: "PENDING",
      substatus: "WAIT_SOURCE_CONFIRMATIONS",
      stage: "STAGE_0",
      step: "transfer-initialization-claims",
      startTime: "2026-01-01T00:00:00.000Z",
      originNetwork: { id: "BesuLedgerTestNetwork", ledgerType: "BESU_2X" },
      destinationNetwork: {
        id: "EthereumLedgerTestNetwork",
        ledgerType: "ETHEREUM",
      },
    }),
  }),
);

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

function makeSession(): SATPSession {
  return new SATPSession({
    contextID: "CTX-4784",
    server: false,
    client: true,
    monitorService,
  });
}

function makeMocks(session: SATPSession) {
  const transfer = jest.fn().mockResolvedValue(undefined);
  const manager = {
    getOrCreateSession: jest.fn().mockReturnValue(session),
    transfer,
    pubKey: "client-pub-key",
  } as unknown as SATPManager;
  const orchestrator = {
    ourGateway: { id: "gw-1", version: [] },
  } as unknown as GatewayOrchestrator;
  return { manager, orchestrator, transfer };
}

function baseRequest(): TransactRequest {
  return {
    contextID: "CTX-4784",
    sourceAsset: {
      id: "asset-src",
      owner: "owner-src",
      contractName: "SATPTokenContract",
      contractAddress: "0xsource",
      amount: "100",
      networkId: { id: "BesuLedgerTestNetwork", ledgerType: "BESU_2X" },
      tokenType: "NONSTANDARD_FUNGIBLE",
      referenceId: "ref-src",
      ercTokenStandard: "ERC20",
    },
    receiverAsset: {
      id: "asset-dst",
      owner: "owner-dst",
      contractName: "SATPTokenContract",
      contractAddress: "0xreceiver",
      amount: "100",
      networkId: { id: "EthereumLedgerTestNetwork", ledgerType: "ETHEREUM" },
      tokenType: "NONSTANDARD_FUNGIBLE",
      referenceId: "ref-dst",
      ercTokenStandard: "ERC20",
    },
  };
}

/** Fields a JSON client could send that the TransactRequest type does not declare. */
type CcipExtras = {
  messageId: string;
  lane: { sourceChainSelector: string; destChainSelector: string };
  finalityPreference: string;
};

/** Typed request plus the undeclared extras on the root and both assets (no any). */
function requestWithExtras(extras: CcipExtras): TransactRequest & CcipExtras {
  const base = baseRequest();
  return {
    ...base,
    ...extras,
    sourceAsset: { ...base.sourceAsset, ...extras },
    receiverAsset: { ...base.receiverAsset, ...extras },
  };
}

const jsonDump = (o: unknown): string =>
  JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

const MESSAGE_ID = "0x" + "ab".repeat(32);
const LANE = { sourceChainSelector: "1", destChainSelector: "2" };

describe("executeTransact current behavior for CCIP-style fields (#4784)", () => {
  it("baseline: valid request reaches manager.transfer and fills both assets", async () => {
    const session = makeSession();
    const { manager, orchestrator, transfer } = makeMocks(session);

    await executeTransact("ERROR", baseRequest(), manager, orchestrator);

    expect(transfer).toHaveBeenCalledTimes(1);
    const data = session.getClientSessionData();
    expect(data.senderAsset?.owner).toBe("owner-src");
    expect(data.senderAsset?.amount).toBe(BigInt(100));
    expect(data.receiverAsset?.owner).toBe("owner-dst");
    expect(data.senderAsset?.networkId?.type).toBe("BESU_2X");
  });

  it("extra messageId, lane, finalityPreference and a JSON payload are accepted and not stored in client session data", async () => {
    const session = makeSession();
    const { manager, orchestrator } = makeMocks(session);
    const req: TransactRequest = {
      ...requestWithExtras({
        messageId: MESSAGE_ID,
        lane: LANE,
        finalityPreference: "finalized",
      }),
      payload: JSON.stringify({ messageId: MESSAGE_ID, lane: LANE }),
    };

    await expect(
      executeTransact("ERROR", req, manager, orchestrator),
    ).resolves.toBeDefined();

    const dump = jsonDump(session.getClientSessionData());
    expect(dump).not.toContain(MESSAGE_ID);
    expect(dump).not.toContain("finalized");
    expect(dump).not.toContain("destChainSelector");
  });

  it("finalityPreference does not change the lock type or expiry", async () => {
    const session = makeSession();
    const { manager, orchestrator } = makeMocks(session);
    const req = {
      ...baseRequest(),
      finalityPreference: "finalized",
    };

    await executeTransact("ERROR", req, manager, orchestrator);

    const data = session.getClientSessionData();
    expect(data.lockType).toBe(LockType.TIME_LOCK);
    expect(data.lockExpirationTime).toBe(BigInt(1000 * 60 * 5));
  });
});
