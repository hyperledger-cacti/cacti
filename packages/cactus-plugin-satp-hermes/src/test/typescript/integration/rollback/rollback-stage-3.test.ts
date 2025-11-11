import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { CrashManager } from "../../../../main/typescript/services/gateway/crash-manager";
import {
  LocalLog,
  GatewayIdentity,
  Address,
  SupportedSigningAlgorithms,
} from "../../../../main/typescript/core/types";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { BesuTestEnvironment, FabricTestEnvironment } from "../../test-utils";
import {
  AssetSchema,
  ClaimFormat,
  ERCTokenStandard,
  TokenType,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { getSatpLogKey } from "../../../../main/typescript/utils/gateway-utils";
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
import { bufArray2HexStr } from "../../../../main/typescript/utils/gateway-utils";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../../../main/typescript/core/satp-logger-provider";
import { Knex, knex } from "knex";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  MessageStagesHashesSchema,
  Stage0HashesSchema,
  Stage1HashesSchema,
  Stage2HashesSchema,
  Stage3HashesSchema,
  State,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/session/session_pb";
import { FabricContractInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { BesuLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { FabricLeaf } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/fabric-leaf";
import { EvmFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { FabricFungibleAsset } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/fabric-asset";
import { OntologyManager } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import path from "path";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexLocalInstance } from "../../../../main/typescript/database/knexfile";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { SupportedContractTypes as SupportedEthereumContractTypes } from "../../environments/ethereum-test-environment";
import { Amount } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/assets/asset";

let besuEnv: BesuTestEnvironment;
let fabricEnv: FabricTestEnvironment;

let knexInstanceClient: Knex;
let knexInstanceSourceRemote: Knex;
let knexInstanceRemote: Knex;
let knexInstanceTargetRemote: Knex;

let gateway1: SATPGateway;
let gateway2: SATPGateway;

let crashManager1: CrashManager;
let crashManager2: CrashManager;
const sessionId = uuidv4();
const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
const logLevel: LogLevelDesc = "DEBUG";
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();
const log = LoggerProvider.getOrCreate(
  {
    level: logLevel,
    label: "Rollback-stage-3",
  },
  monitorService,
);

let ontologyManager: OntologyManager;
let besuLeaf: BesuLeaf;
let fabricLeaf: FabricLeaf;

// mock stage-3 rollback
const createMockSession = (
  maxTimeout: string,
  maxRetries: string,
  isClient: boolean,
): SATPSession => {
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: !isClient,
    client: isClient,
    monitorService: monitorService,
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

    ontologyManager = new OntologyManager(
      {
        logLevel,
        ontologiesPath: ontologiesPath,
      },
      monitorService,
    );

    const satpContractName = "satp-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
      contractName: satpContractName,
      logLevel,
      claimFormat: ClaimFormat.DEFAULT,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();
  }

  {
    const erc20TokenContract = "SATPContract";

    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      {
        logLevel,
      },
      [
        {
          assetType: SupportedEthereumContractTypes.FUNGIBLE,
          contractName: erc20TokenContract,
        },
      ],
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  fabricLeaf = new FabricLeaf(
    fabricEnv.createFabricLeafConfig("DEBUG"),
    ontologyManager,
    monitorService,
  );

  besuLeaf = new BesuLeaf(
    besuEnv.createBesuLeafConfig(ontologyManager, "DEBUG"),
    ontologyManager,
    monitorService,
  );
});

afterAll(async () => {
  if (crashManager1 || crashManager2) {
    crashManager1.stopScheduler();
    crashManager2.stopScheduler();
  }
  if (
    knexInstanceClient ||
    knexInstanceSourceRemote ||
    knexInstanceRemote ||
    knexInstanceTargetRemote
  ) {
    await knexInstanceClient.destroy();
    await knexInstanceSourceRemote.destroy();
    await knexInstanceRemote.destroy();
    await knexInstanceTargetRemote.destroy();
  }

  if (gateway1) {
    await gateway1.shutdown();
  }

  if (gateway2) {
    await gateway2.shutdown();
  }

  await besuEnv.tearDown();
  await fabricEnv.tearDown();

  monitorService.shutdown().catch((err) => {
    log.error("Error shutting down monitor service:", err);
  });

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

describe.skip("Rollback Test stage 3", () => {
  it("should initiate stage-3 rollback strategy", async () => {
    const besuAsset: EvmFungibleAsset = {
      id: besuEnv.defaultAsset.id,
      referenceId: besuEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      amount: 100 as Amount,
      owner: besuEnv.firstHighNetWorthAccount,
      contractName: besuEnv.getTestFungibleContractName(),
      contractAddress: besuEnv.getTestFungibleContractAddress(),
      network: besuEnv.network,
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC20,
    };
    const besuReceipt = await besuLeaf.wrapAsset(besuAsset);
    expect(besuReceipt).toBeDefined();
    expect(besuReceipt).toBeDefined();
    log.info(`Besu Asset Wrapped: ${besuReceipt}`);

    const besuReceipt1 = await besuLeaf.lockAsset(
      besuEnv.defaultAsset.id,
      100 as Amount,
    );
    expect(besuReceipt1).toBeDefined();
    log.info(`Besu Asset locked: ${besuReceipt1}`);

    const fabricAsset: FabricFungibleAsset = {
      network: fabricEnv.network,
      id: fabricEnv.defaultAsset.id,
      referenceId: fabricEnv.defaultAsset.referenceId,
      type: TokenType.NONSTANDARD_FUNGIBLE,
      amount: 100 as Amount,
      owner: fabricEnv.clientId,
      mspId: "Org1MSP",
      channelName: fabricEnv.fabricChannelName,
      contractName: fabricEnv.satpContractName,
      ercTokenStandard: ERCTokenStandard.ERC_TOKEN_STANDARD_ERC20,
    };

    const fabricReceipt = await fabricLeaf.wrapAsset(fabricAsset);
    expect(fabricReceipt).toBeDefined();
    log.info(`Fabric Asset Wrapped: ${fabricReceipt}`);

    const responseMint1 = await fabricEnv.connector.transact({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: ["100"],
      methodName: "Mint",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseMint1).not.toBeUndefined();

    log.info(
      `Mint 100 amount asset by the owner response: ${JSON.stringify(responseMint1)}`,
    );

    const responseApprove = await fabricEnv.connector.transact({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [
        await fabricLeaf.getApproveAddress(TokenType.NONSTANDARD_FUNGIBLE),
        "100",
      ],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseApprove).not.toBeUndefined();
    log.info(
      `Approve 100 amount asset by the owner response: ${JSON.stringify(responseApprove)}`,
    );

    const responseLock = await fabricLeaf.lockAsset(
      fabricEnv.defaultAsset.id,
      100 as Amount,
    );

    expect(responseLock).not.toBeUndefined();
    log.info(`Lock asset response: ${JSON.stringify(responseLock)}`);

    const responseMint = await fabricLeaf.mintAsset(
      fabricEnv.defaultAsset.id,
      100 as Amount,
    );

    log.info(`Mint asset response: ${JSON.stringify(responseMint)}`);

    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity1: GatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      identificationCredential: {
        signingAlgorithm: SupportedSigningAlgorithms.SECP256K1,
        pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
      },
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
      identificationCredential: {
        signingAlgorithm: SupportedSigningAlgorithms.SECP256K1,
        pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
      },
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
    const migrationSource = await createMigrationSource();
    knexInstanceClient = knex({
      ...knexLocalInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexInstanceClient.migrate.latest();

    knexInstanceSourceRemote = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexInstanceSourceRemote.migrate.latest();

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [gatewayIdentity2],
      keyPair: gateway1KeyPair,
      ccConfig: {
        bridgeConfig: [besuEnv.createBesuConfig()],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      enableCrashRecovery: true,
      pluginRegistry: new PluginRegistry({
        plugins: [],
      }),
    };

    knexInstanceRemote = knex({
      ...knexLocalInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexInstanceRemote.migrate.latest();

    knexInstanceTargetRemote = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexInstanceTargetRemote.migrate.latest();

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [gatewayIdentity1],
      keyPair: gateway2KeyPair,
      ccConfig: {
        bridgeConfig: [fabricEnv.createFabricConfig()],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
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
