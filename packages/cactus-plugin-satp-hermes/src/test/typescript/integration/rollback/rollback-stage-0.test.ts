import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";
import {
  LocalLog,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { BesuTestEnvironment, FabricTestEnvironment } from "../../test-utils";
import {
  AssetSchema,
  ClaimFormat,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
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
import {
  knexClientConnection,
  knexSourceRemoteConnection,
  knexTargetRemoteConnection,
  knexServerConnection,
} from "../../knex.config";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Knex, knex } from "knex";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  Type,
  MessageStagesHashesSchema,
  Stage0HashesSchema,
  State,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";
import { FabricFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/fabric-asset";
import { BesuLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { FabricLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/fabric-leaf";
import path from "path";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { EvmFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { PluginRegistry } from "@hyperledger/cactus-core";

let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let knexInstanceClient: Knex;
let knexInstanceServer: Knex;
let knexInstanceRemote1: Knex;
let knexInstanceRemote2: Knex;

let gateway1: SATPGateway;
let gateway2: SATPGateway;

let crashManager1: CrashManager;
let crashManager2: CrashManager;
let ontologyManager: OntologyManager;
let besuLeaf: BesuLeaf;
let fabricLeaf: FabricLeaf;

const sessionId = uuidv4();
const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "Rollback-stage-0",
});

// mock stage-0 rollback
const createMockSession = (
  maxTimeout: string,
  maxRetries: string,
  isClient: boolean,
): SATPSession => {
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: !isClient,
    client: isClient,
  });

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
    stage0: isClient
      ? create(Stage0HashesSchema, {
          newSessionRequestMessageHash: "h1",
        })
      : create(Stage0HashesSchema, {
          newSessionRequestMessageHash: "h1",
          newSessionResponseMessageHash: "h2",
        }),
  });
  if (isClient) {
    sessionData.senderAsset = create(AssetSchema, {
      tokenId: besuEnv.defaultAsset.id,
      referenceId: besuEnv.defaultAsset.referenceId,
      tokenType: TokenType.NONSTANDARD_FUNGIBLE,
      amount: BigInt(100),
      owner: "MOCK_SENDER_ASSET_OWNER",
      contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
      contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
    });
  }
  if (!isClient) {
    sessionData.receiverAsset = create(AssetSchema, {
      tokenId: fabricEnv.defaultAsset.id,
      referenceId: fabricEnv.defaultAsset.referenceId,
      tokenType: TokenType.NONSTANDARD_FUNGIBLE,
      amount: BigInt(100),
      owner: "MOCK_RECEIVER_ASSET_OWNER",
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
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  {
    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    ontologyManager = new OntologyManager({
      logLevel,
      ontologiesPath: ontologiesPath,
    });

    const satpContractName = "satp-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
      satpContractName,
      logLevel,
      claimFormat: ClaimFormat.DEFAULT,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();
  }

  {
    const erc20TokenContract = "SATPContract";

    besuEnv = await BesuTestEnvironment.setupTestEnvironment({
      satpContractName: erc20TokenContract,
      logLevel,
    });
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  fabricLeaf = new FabricLeaf(
    fabricEnv.createFabricLeafConfig(ontologyManager, "DEBUG"),
  );

  besuLeaf = new BesuLeaf(
    besuEnv.createBesuLeafConfig(ontologyManager, "DEBUG"),
  );
});

afterAll(async () => {
  if (crashManager1 || crashManager2) {
    crashManager1.stopScheduler();
    crashManager2.stopScheduler();
  }
  if (
    knexInstanceClient ||
    knexInstanceServer ||
    knexInstanceRemote1 ||
    knexInstanceRemote2
  ) {
    await knexInstanceClient.destroy();
    await knexInstanceServer.destroy();
    await knexInstanceRemote1.destroy();
    await knexInstanceRemote2.destroy();
  }

  if (gateway1) {
    await gateway1.shutdown();
  }

  if (gateway2) {
    await gateway2.shutdown();
  }

  await besuEnv.tearDown();
  await fabricEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe("Rollback Test stage 0", () => {
  it("should initiate stage-0 rollback strategy", async () => {
    const besuAsset: EvmFungibleAsset = {
      id: besuEnv.defaultAsset.id,
      referenceId: besuEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      amount: "100",
      owner: besuEnv.firstHighNetWorthAccount,
      contractName: besuEnv.erc20TokenContract,
      contractAddress: besuEnv.assetContractAddress!,
      network: besuEnv.network,
    };
    const besuReceipt = await besuLeaf.wrapAsset(besuAsset);
    expect(besuReceipt).toBeDefined();
    log.info(`Besu Asset Wrapped: ${besuReceipt}`);

    const fabricAsset: FabricFungibleAsset = {
      network: fabricEnv.network,
      id: fabricEnv.defaultAsset.id,
      referenceId: fabricEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      amount: "100",
      owner: fabricEnv.clientId,
      mspId: "Org1MSP",
      channelName: fabricEnv.fabricChannelName,
      contractName: fabricEnv.satpContractName,
    };

    const fabricReceipt = await fabricLeaf.wrapAsset(fabricAsset);
    expect(fabricReceipt).toBeDefined();
    log.info(`Fabric Asset Wrapped: ${fabricReceipt}`);

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
      connectedDLTs: [
        {
          id: "BESU",
          ledgerType: LedgerType.Besu2X,
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayServerPort: 3005,
      gatewayClientPort: 3001,
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
      connectedDLTs: [
        {
          id: "FABRIC",
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3225,
      gatewayClientPort: 3211,
    };

    knexInstanceClient = knex(knexClientConnection);
    await knexInstanceClient.migrate.latest();

    knexInstanceRemote1 = knex(knexSourceRemoteConnection);
    await knexInstanceRemote1.migrate.latest();

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [gatewayIdentity2],
      keyPair: gateway1KeyPair,
      ccConfig: {
        bridgeConfig: [besuEnv.createBesuConfig()],
      },
      localRepository: knexClientConnection,
      remoteRepository: knexSourceRemoteConnection,
      enableCrashRecovery: true,
      pluginRegistry: new PluginRegistry({
        plugins: [],
      }),
    };

    knexInstanceServer = knex(knexServerConnection);
    await knexInstanceServer.migrate.latest();

    knexInstanceRemote2 = knex(knexTargetRemoteConnection);
    await knexInstanceRemote2.migrate.latest();

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [gatewayIdentity1],
      keyPair: gateway2KeyPair,
      ccConfig: {
        bridgeConfig: [fabricEnv.createFabricConfig()],
      },
      localRepository: knexServerConnection,
      remoteRepository: knexTargetRemoteConnection,
      enableCrashRecovery: true,
      pluginRegistry: new PluginRegistry({
        plugins: [],
      }),
    };

    gateway1 = (await factory.create(options1)) as SATPGateway;
    expect(gateway1).toBeInstanceOf(SATPGateway);
    await gateway1.startup();

    gateway2 = (await factory.create(options2)) as SATPGateway;
    expect(gateway2).toBeInstanceOf(SATPGateway);
    await gateway2.startup();

    crashManager1 = gateway1["crashManager"] as CrashManager;
    expect(crashManager1).toBeInstanceOf(CrashManager);

    crashManager2 = gateway2["crashManager"] as CrashManager;

    expect(crashManager2).toBeInstanceOf(CrashManager);

    const initiateRollbackSpy1 = jest.spyOn(crashManager1, "initiateRollback");

    const clientSession = createMockSession("5000", "3", true);
    const serverSession = createMockSession("5000", "3", false);

    const clientSessionData = clientSession.getClientSessionData();
    const serverSessionData = serverSession.getServerSessionData();

    const key1 = getSatpLogKey(sessionId, "type", "operation1");
    const mockLogEntry1: LocalLog = {
      sessionId: sessionId,
      type: "type",
      key: key1,
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(clientSessionData),
      sequenceNumber: Number(clientSessionData.lastSequenceNumber),
    };

    const mockLogRepository1 = crashManager1["localRepository"];
    await mockLogRepository1.create(mockLogEntry1);

    const key2 = getSatpLogKey(sessionId, "type2", "done");
    const mockLogEntry2: LocalLog = {
      sessionId: sessionId,
      type: "type2",
      key: key2,
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(serverSessionData),
      sequenceNumber: Number(serverSessionData.lastSequenceNumber),
    };

    const mockLogRepository2 = crashManager2["localRepository"];
    await mockLogRepository2.create(mockLogEntry2);

    crashManager1.sessions.set(sessionId, clientSession);
    crashManager2.sessions.set(sessionId, serverSession);

    const rollbackStatus = await crashManager1.initiateRollback(
      clientSession,
      clientSessionData,
      true,
    ); // invoke rollback on client side
    expect(initiateRollbackSpy1).toHaveBeenCalled();
    expect(rollbackStatus).toBe(true);
  });
});
