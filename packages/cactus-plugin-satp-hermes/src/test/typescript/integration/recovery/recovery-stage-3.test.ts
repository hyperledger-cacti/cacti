import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";
import {
  LocalLog,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import { AssetSchema } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  SATPGatewayConfig,
  PluginFactorySATPGateway,
  SATPGateway,
} from "../../../../main/typescript";
import {
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { bufArray2HexStr } from "../../../../main/typescript/gateway-utils";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  Type,
  MessageStagesHashesSchema,
  MessageStagesSignaturesSchema,
  MessageStagesTimestampsSchema,
  Stage0HashesSchema,
  Stage0SignaturesSchema,
  Stage0TimestampsSchema,
  Stage1HashesSchema,
  Stage1SignaturesSchema,
  Stage1TimestampsSchema,
  Stage2HashesSchema,
  Stage2SignaturesSchema,
  Stage2TimestampsSchema,
  Stage3HashesSchema,
  Stage3SignaturesSchema,
  Stage3TimestampsSchema,
  State,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";
import {
  knexClientConnection,
  knexServerConnection,
  knexSourceRemoteConnection,
  knexTargetRemoteConnection,
} from "../../knex.config";
import { Knex, knex } from "knex";

let knexInstanceClient: Knex;
let knexInstanceSourceRemote: Knex;
let knexInstanceServer: Knex;
let knexInstanceTargetRemote: Knex;

let gateway1: SATPGateway;
let gateway2: SATPGateway;

const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
let crashManager1: CrashManager;
let crashManager2: CrashManager;

/**
 * Creates a mock SATPSession:
 * - Stage 0, 1, 2 are always complete.
 * - Stage 3: partial if client, complete if server.
 */
const createMockSession = (
  maxTimeout: string,
  maxRetries: string,
  isClient: boolean,
): SATPSession => {
  const sessionId = uuidv4();
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: !isClient,
    client: isClient,
  });

  const baseTime = new Date();
  const incrementTime = (minutes: number): string => {
    baseTime.setMinutes(baseTime.getMinutes() + minutes);
    return baseTime.toISOString();
  };

  const sessionData = mockSession.hasClientSessionData()
    ? mockSession.getClientSessionData()
    : mockSession.getServerSessionData();

  sessionData.id = sessionId;
  sessionData.maxTimeout = maxTimeout;
  sessionData.maxRetries = maxRetries;
  sessionData.version = SATP_VERSION;
  sessionData.clientGatewayPubkey = isClient
    ? bufArray2HexStr(gateway1KeyPair.publicKey)
    : bufArray2HexStr(gateway2KeyPair.publicKey);

  sessionData.serverGatewayPubkey = isClient
    ? bufArray2HexStr(gateway2KeyPair.publicKey)
    : bufArray2HexStr(gateway1KeyPair.publicKey);
  sessionData.state = State.RECOVERING;
  sessionData.role = isClient ? Type.CLIENT : Type.SERVER;
  sessionData.lastSequenceNumber = isClient ? BigInt(1) : BigInt(2);

  sessionData.hashes = create(MessageStagesHashesSchema, {
    stage0: create(Stage0HashesSchema, {
      newSessionRequestMessageHash: "h1",
      newSessionResponseMessageHash: "h2",
      preSatpTransferRequestMessageHash: "h3",
      preSatpTransferResponseMessageHash: "h4",
    }),
    stage1: create(Stage1HashesSchema, {
      transferProposalRequestMessageHash: "h5",
      transferProposalReceiptMessageHash: "h6",
      transferProposalRejectMessageHash: "h7",
      transferCommenceRequestMessageHash: "h8",
      transferCommenceResponseMessageHash: "h9",
    }),
    stage2: create(Stage2HashesSchema, {
      lockAssertionRequestMessageHash: "h10",
      lockAssertionReceiptMessageHash: "h11",
    }),
    stage3: isClient
      ? create(Stage3HashesSchema, {
          commitPreparationRequestMessageHash: "h12",
        })
      : create(Stage3HashesSchema, {
          commitPreparationRequestMessageHash: "h12",
          commitReadyResponseMessageHash: "h13",
        }),
  });

  sessionData.processedTimestamps = create(MessageStagesTimestampsSchema, {
    stage0: create(Stage0TimestampsSchema, {
      newSessionRequestMessageTimestamp: incrementTime(0),
      newSessionResponseMessageTimestamp: incrementTime(1),
      preSatpTransferRequestMessageTimestamp: incrementTime(2),
      preSatpTransferResponseMessageTimestamp: incrementTime(3),
    }),
    stage1: create(Stage1TimestampsSchema, {
      transferProposalRequestMessageTimestamp: incrementTime(4),
      transferProposalReceiptMessageTimestamp: incrementTime(5),
      transferProposalRejectMessageTimestamp: incrementTime(6),
      transferCommenceRequestMessageTimestamp: incrementTime(7),
      transferCommenceResponseMessageTimestamp: incrementTime(8),
    }),
    stage2: create(Stage2TimestampsSchema, {
      lockAssertionRequestMessageTimestamp: incrementTime(9),
      lockAssertionReceiptMessageTimestamp: incrementTime(10),
    }),
    stage3: isClient
      ? create(Stage3TimestampsSchema, {
          commitPreparationRequestMessageTimestamp: incrementTime(11),
        })
      : create(Stage3TimestampsSchema, {
          commitPreparationRequestMessageTimestamp: incrementTime(11),
          commitReadyResponseMessageTimestamp: incrementTime(12),
        }),
  });

  sessionData.signatures = create(MessageStagesSignaturesSchema, {
    stage0: create(Stage0SignaturesSchema, {
      newSessionRequestMessageSignature: "sig_h1",
      newSessionResponseMessageSignature: "sig_h2",
      preSatpTransferRequestMessageSignature: "sig_h3",
      preSatpTransferResponseMessageSignature: "sig_h4",
    }),
    stage1: create(Stage1SignaturesSchema, {
      transferProposalRequestMessageSignature: "sig_h5",
      transferProposalReceiptMessageSignature: "sig_h6",
      transferProposalRejectMessageSignature: "sig_h7",
      transferCommenceRequestMessageSignature: "sig_h8",
      transferCommenceResponseMessageSignature: "sig_h9",
    }),
    stage2: create(Stage2SignaturesSchema, {
      lockAssertionRequestMessageSignature: "sig_h10",
      lockAssertionReceiptMessageSignature: "sig_h11",
    }),
    stage3: isClient
      ? create(Stage3SignaturesSchema, {
          commitPreparationRequestMessageSignature: "sig_h12",
        })
      : create(Stage3SignaturesSchema, {
          commitPreparationRequestMessageSignature: "sig_h12",
          commitReadyResponseMessageSignature: "sig_h13",
        }),
  });

  if (isClient) {
    sessionData.senderAsset = create(AssetSchema, {
      tokenId: "BESU_ASSET_ID",
      tokenType: TokenType.NONSTANDARD,
      amount: BigInt(100),
      owner: "MOCK_SENDER_ASSET_OWNER",
      ontology: "MOCK_SENDER_ASSET_ONTOLOGY",
      contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
      contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
    });
  }
  if (!isClient) {
    sessionData.receiverAsset = create(AssetSchema, {
      tokenId: "FABRIC_ASSET_ID",
      tokenType: TokenType.NONSTANDARD,
      amount: BigInt(100),
      owner: "MOCK_RECEIVER_ASSET_OWNER",
      ontology: "MOCK_RECEIVER_ASSET_ONTOLOGY",
      contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
      mspId: "MOCK_RECEIVER_ASSET_MSP_ID",
      channelName: "MOCK_CHANNEL_ID",
    });
  }

  sessionData.senderGatewayNetworkId = "BESU";
  sessionData.recipientGatewayNetworkId = "FABRIC";

  return mockSession;
};

beforeAll(async () => {
  const factoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };
  const factory = new PluginFactorySATPGateway(factoryOptions);

  const gatewayIdentity1: GatewayIdentity = {
    id: "mockID-1",
    name: "CustomGateway1",
    pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
    version: [{ Core: "v02", Architecture: "v02", Crash: "v02" }],
    connectedDLTs: [
      {
        id: "BESU",
        ledgerType: LedgerType.Besu2X,
      },
    ],
    proofID: "mockProofID10",
    address: "http://localhost" as Address,
    gatewayServerPort: 3006,
    gatewayClientPort: 3001,
    gatewayOpenAPIPort: 3002,
  };

  const gatewayIdentity2: GatewayIdentity = {
    id: "mockID-2",
    name: "CustomGateway2",
    pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
    version: [{ Core: "v02", Architecture: "v02", Crash: "v02" }],
    connectedDLTs: [
      {
        id: "FABRIC",
        ledgerType: LedgerType.Fabric2,
      },
    ],
    proofID: "mockProofID11",
    address: "http://localhost" as Address,
    gatewayServerPort: 3228,
    gatewayClientPort: 3211,
    gatewayOpenAPIPort: 4210,
  };

  knexInstanceClient = knex(knexClientConnection);
  await knexInstanceClient.migrate.latest();

  knexInstanceSourceRemote = knex(knexSourceRemoteConnection);
  await knexInstanceSourceRemote.migrate.latest();

  const options1: SATPGatewayConfig = {
    logLevel: "DEBUG",
    gid: gatewayIdentity1,
    counterPartyGateways: [gatewayIdentity2],
    keyPair: gateway1KeyPair,
    knexLocalConfig: knexClientConnection,
    knexRemoteConfig: knexSourceRemoteConnection,
    enableCrashRecovery: true,
  };

  knexInstanceServer = knex(knexServerConnection);
  await knexInstanceServer.migrate.latest();

  knexInstanceTargetRemote = knex(knexTargetRemoteConnection);
  await knexInstanceTargetRemote.migrate.latest();

  const options2: SATPGatewayConfig = {
    logLevel: "DEBUG",
    gid: gatewayIdentity2,
    counterPartyGateways: [gatewayIdentity1],
    keyPair: gateway2KeyPair,
    knexLocalConfig: knexServerConnection,
    knexRemoteConfig: knexTargetRemoteConnection,
    enableCrashRecovery: true,
  };

  gateway1 = (await factory.create(options1)) as SATPGateway;
  expect(gateway1).toBeInstanceOf(SATPGateway);
  await gateway1.startup();

  gateway2 = (await factory.create(options2)) as SATPGateway;
  expect(gateway2).toBeInstanceOf(SATPGateway);
  await gateway2.startup();
});

afterEach(async () => {
  jest.clearAllMocks();
});

afterAll(async () => {
  if (crashManager1 || crashManager2) {
    crashManager1.stopScheduler();
    crashManager2.stopScheduler();
  }

  if (gateway1) {
    await gateway1.shutdown();
  }

  if (gateway2) {
    await gateway2.shutdown();
  }

  if (
    knexInstanceClient ||
    knexInstanceSourceRemote ||
    knexInstanceServer ||
    knexInstanceTargetRemote
  ) {
    await knexInstanceClient.destroy();
    await knexInstanceSourceRemote.destroy();
    await knexInstanceServer.destroy();
    await knexInstanceTargetRemote.destroy();
  }
});

describe("Stage 3 Recovery Test", () => {
  it("should recover Stage 3 hashes and timestamps and update session state to RECOVERED", async () => {
    crashManager1 = gateway1["crashManager"] as CrashManager;
    expect(crashManager1).toBeInstanceOf(CrashManager);

    crashManager2 = gateway2["crashManager"] as CrashManager;
    expect(crashManager2).toBeInstanceOf(CrashManager);

    const clientSession = createMockSession("5000", "3", true);
    const clientSessionData = clientSession.getClientSessionData();
    const sessionId = clientSessionData.id;

    const clientLogKey = getSatpLogKey(sessionId, "stage3", "partial");
    const clientLogEntry: LocalLog = {
      sessionId: sessionId,
      type: "stage3",
      key: clientLogKey,
      operation: "partial",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(clientSessionData),
      sequenceNumber: Number(clientSessionData.lastSequenceNumber),
    };

    const mockClientLogRepo = crashManager1["localRepository"];
    await mockClientLogRepo.create(clientLogEntry);

    const serverSession = createMockSession("5000", "3", false);
    const serverSessionData = serverSession.getServerSessionData();

    serverSessionData.id = sessionId;

    const serverLogKey = getSatpLogKey(sessionId, "stage3", "done");
    const serverLogEntry: LocalLog = {
      sessionId: sessionId,
      type: "stage3",
      key: serverLogKey,
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(serverSessionData),
      sequenceNumber: Number(serverSessionData.lastSequenceNumber),
    };

    const mockServerLogRepo = crashManager2["localRepository"];
    await mockServerLogRepo.create(serverLogEntry);

    await crashManager1.recoverSessions();
    await crashManager2.recoverSessions(); // this won't invoke recovery(all operations completed)

    await new Promise((resolve) => setTimeout(resolve, 5000));
    const updatedSessionClient = crashManager1["sessions"].get(sessionId);
    const updatedSessionDataClient =
      updatedSessionClient?.getClientSessionData();

    const updatedSessionServer = crashManager2["sessions"].get(sessionId);
    const updatedSessionDataServer =
      updatedSessionServer?.getServerSessionData();

    expect(updatedSessionDataClient).toBeDefined();
    expect(updatedSessionDataClient?.state).toBe(State.RECOVERED);

    expect(updatedSessionDataClient?.hashes?.stage3).toEqual(
      updatedSessionDataServer?.hashes?.stage3,
    );

    expect(
      updatedSessionDataClient?.hashes?.stage3
        ?.commitPreparationRequestMessageHash,
    ).toBe("h12");

    expect(
      updatedSessionDataClient?.hashes?.stage3?.commitReadyResponseMessageHash,
    ).toBe("h13");

    expect(updatedSessionDataClient?.processedTimestamps?.stage3).toEqual(
      updatedSessionDataServer?.processedTimestamps?.stage3,
    );

    expect(
      updatedSessionDataClient?.processedTimestamps?.stage3
        ?.commitPreparationRequestMessageTimestamp,
    ).toBeDefined();

    expect(
      updatedSessionDataClient?.processedTimestamps?.stage3
        ?.commitReadyResponseMessageTimestamp,
    ).toBeDefined();

    expect(updatedSessionDataClient?.signatures?.stage3).toEqual(
      updatedSessionDataServer?.signatures?.stage3,
    );

    expect(
      updatedSessionDataClient?.signatures?.stage3
        ?.commitPreparationRequestMessageSignature,
    ).toBe("sig_h12");

    expect(
      updatedSessionDataClient?.signatures?.stage3
        ?.commitReadyResponseMessageSignature,
    ).toBe("sig_h13");

    expect(updatedSessionDataClient?.hashes?.stage3).toEqual(
      updatedSessionDataServer?.hashes?.stage3,
    );
    expect(updatedSessionDataClient?.processedTimestamps?.stage3).toEqual(
      updatedSessionDataServer?.processedTimestamps?.stage3,
    );
    expect(updatedSessionDataClient?.signatures?.stage3).toEqual(
      updatedSessionDataServer?.signatures?.stage3,
    );
  });
});
