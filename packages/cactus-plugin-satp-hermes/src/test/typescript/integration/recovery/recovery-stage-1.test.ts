import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { CrashManager } from "../../../../main/typescript/gol/crash-manager";
import {
  LocalLog,
  SupportedChain,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import { AssetSchema } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import {
  SATPGatewayConfig,
  PluginFactorySATPGateway,
  SATPGateway,
} from "../../../../main/typescript";
import {
  IPluginFactoryOptions,
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
  State,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/session_pb";
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
 * - Stage 0 always complete.
 * - Stage 1 partial if client; complete if server.
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
  const sessionData = isClient
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
    stage1: isClient
      ? create(Stage1HashesSchema, {
          transferProposalRequestMessageHash: "h1",
        })
      : create(Stage1HashesSchema, {
          transferProposalRequestMessageHash: "h1",
          transferProposalReceiptMessageHash: "h2",
        }),
  });

  sessionData.processedTimestamps = create(MessageStagesTimestampsSchema, {
    stage0: create(Stage0TimestampsSchema, {
      newSessionRequestMessageTimestamp: incrementTime(0),
      newSessionResponseMessageTimestamp: incrementTime(1),
      preSatpTransferRequestMessageTimestamp: incrementTime(2),
      preSatpTransferResponseMessageTimestamp: incrementTime(3),
    }),
    stage1: isClient
      ? create(Stage1TimestampsSchema, {
          transferProposalRequestMessageTimestamp: incrementTime(5),
        })
      : create(Stage1TimestampsSchema, {
          transferProposalRequestMessageTimestamp: incrementTime(5),
          transferProposalReceiptMessageTimestamp: incrementTime(6),
        }),
  });

  sessionData.signatures = create(MessageStagesSignaturesSchema, {
    stage0: create(Stage0SignaturesSchema, {
      newSessionRequestMessageSignature: "sig_h1",
      newSessionResponseMessageSignature: "sig_h2",
      preSatpTransferRequestMessageSignature: "sig_h3",
      preSatpTransferResponseMessageSignature: "sig_h4",
    }),
    stage1: isClient
      ? create(Stage1SignaturesSchema, {
          transferProposalRequestMessageSignature: "sig_h1",
        })
      : create(Stage1SignaturesSchema, {
          transferProposalRequestMessageSignature: "sig_h1",
          transferProposalReceiptMessageSignature: "sig_h2",
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

  sessionData.senderGatewayNetworkId = SupportedChain.BESU;
  sessionData.recipientGatewayNetworkId = SupportedChain.FABRIC;

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
    version: [
      {
        Core: "v02",
        Architecture: "v02",
        Crash: "v02",
      },
    ],
    supportedDLTs: [SupportedChain.BESU],
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
    version: [
      {
        Core: "v02",
        Architecture: "v02",
        Crash: "v02",
      },
    ],
    supportedDLTs: [SupportedChain.FABRIC],
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
    enableCrashManager: true,
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
    enableCrashManager: true,
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

describe("Stage 1 Recovery Test", () => {
  it("should recover Stage 1 hashes, timestamps, signatures, and update session state to RECOVERED", async () => {
    crashManager1 = gateway1["crashManager"] as CrashManager;
    expect(crashManager1).toBeInstanceOf(CrashManager);

    crashManager2 = gateway2["crashManager"] as CrashManager;
    expect(crashManager2).toBeInstanceOf(CrashManager);

    const clientSession = createMockSession("5000", "3", true);
    const clientSessionData = clientSession.getClientSessionData();
    const sessionId = clientSessionData.id;

    const clientLogKey = getSatpLogKey(sessionId, "stage1", "partial");
    const clientLogEntry: LocalLog = {
      sessionId: sessionId,
      type: "stage1",
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

    const serverLogKey = getSatpLogKey(sessionId, "stage1", "done");
    const serverLogEntry: LocalLog = {
      sessionId: sessionId,
      type: "stage1",
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

    expect(updatedSessionDataClient?.hashes?.stage1).toEqual(
      updatedSessionDataServer?.hashes?.stage1,
    );

    expect(
      updatedSessionDataClient?.hashes?.stage1
        ?.transferProposalRequestMessageHash,
    ).toBe("h1");
    expect(
      updatedSessionDataClient?.signatures?.stage1
        ?.transferProposalRequestMessageSignature,
    ).toBe("sig_h1");

    expect(
      updatedSessionDataClient?.hashes?.stage1
        ?.transferProposalReceiptMessageHash,
    ).toBe("h2");
    expect(
      updatedSessionDataClient?.signatures?.stage1
        ?.transferProposalReceiptMessageSignature,
    ).toBe("sig_h2");

    expect(updatedSessionDataClient?.processedTimestamps?.stage1).toEqual(
      updatedSessionDataServer?.processedTimestamps?.stage1,
    );
  });
});
