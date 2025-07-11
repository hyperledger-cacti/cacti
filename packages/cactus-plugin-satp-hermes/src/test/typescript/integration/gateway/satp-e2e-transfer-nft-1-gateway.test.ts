import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  TokenType,
} from "../../../../main/typescript";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
} from "../../test-utils";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { Knex, knex } from "knex";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexLocalInstance } from "../../../../main/typescript/database/knexfile";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { TokenType as TokenTypeRaw } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let knexSourceRemoteClient: Knex;
let knexLocalClient: Knex;
let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let gateway: SATPGateway;

const TIMEOUT = 900000; // 15 minutes

afterAll(async () => {
  await gateway.shutdown();
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
}, TIMEOUT);

afterEach(async () => {
  if (gateway) {
    await gateway.shutdown();
  }
  if (knexLocalClient) {
    await knexLocalClient.destroy();
  }
  if (knexSourceRemoteClient) {
    await knexSourceRemoteClient.destroy();
  }
}, TIMEOUT);

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
    const satpContractName = "satp-nft-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
      contractName: satpContractName,
      logLevel,
      claimFormat: ClaimFormat.BUNGEE,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();
  }

  {
    const erc721TokenContract = "SATPContractNFT";
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      {
        contractName: erc721TokenContract,
        logLevel,
      },
      TokenTypeRaw.NONSTANDARD_FUNGIBLE,
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
  {
    const erc721TokenContract = "SATPContractNFT";
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      contractName: erc721TokenContract,
      contractName2: "fillerContract", //TODO: remove when correcting ethEnvironment to not receive a second contract name
      logLevel,
    });
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
}, TIMEOUT);

describe("SATPGateway sending a non-fungible token from Besu to Fabric", () => {
  jest.setTimeout(TIMEOUT);
  it("should mint a unique nft to the owner account", async () => {
    //await besuEnv.mintTokens("100"); -> MintNFT(uniqueID???)
    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100", //Instead nftID???
      besuEnv.getTestOwnerSigningCredential(),
    );
  });
  it("should realize a transfer", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity = {
      id: "mockID",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      proofID: "mockProofID10", //New proof ID for ZKs?
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexLocalClient = knex({
      ...knexLocalInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions, besuNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;

    expect(dispatcher).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardNonfungible, // Non Fungible Token Type
    });
    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    //TODO: May require contract interaction to check ownership, or give role - confirm
    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      //TODO: Not approveAmount, just approve single token: WHAT IS NECESSARY FOR IT - maybe UniqueID
      //await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "100");
    } else {
      throw new Error("Approve address is undefined");
    }
    //log.debug("Approved 100 amout to the Besu Bridge Address");

    const reqApproveFabricAddress = await dispatcher?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardNonfungible, //NonFungible
    });
    expect(reqApproveFabricAddress?.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await fabricEnv.giveRoleToBridge("Org2MSP"); //Same as before - what does give role require

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "100",
    ); //Transact request - should have different parameters

    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0", //Similar for NFT - Check original owner does not detain NFT anymore
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    //Following Sequence: Recheck piece by piece what is done with ERC20 and theorize what would be similar or different in ERC721
    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      reqApproveFabricAddress?.approveAddress,
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");

    await gateway.shutdown();
  });
});

//Same as before Fabric to Besu

//Same as before Besu to Ethereum

//In the end, probably try all possible transactions
