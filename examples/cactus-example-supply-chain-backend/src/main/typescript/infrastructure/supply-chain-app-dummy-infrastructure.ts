import type { Account } from "web3-core";
// import { v4 as uuidv4 } from "uuid";
import { DiscoveryOptions } from "fabric-network";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
// import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  PluginLedgerConnectorXdai,
  Web3SigningCredentialType,
  EthContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-xdai";
import { IPluginKeychain } from "@hyperledger/cactus-core-api";
import { FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1 } from "@hyperledger/cactus-test-tooling";
import { FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2 } from "@hyperledger/cactus-test-tooling";
import {
  BesuTestLedger,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
} from "@hyperledger/cactus-test-tooling";
import {
  IEthContractDeployment,
  ISupplyChainContractDeploymentInfo,
  IFabricContractDeployment,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { PluginLedgerConnectorEthereum } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

import BambooHarvestRepositoryJSON from "../../json/generated/BambooHarvestRepository.json";
import BookshelfRepositoryJSON from "../../json/generated/BookshelfRepository.json";
import { SHIPMENT_CONTRACT_GO_SOURCE } from "../../go/shipment";
import { MANUFACTURER_DATA_CONTRACT_GO_SOURCE } from "../../go/manufacturer-data";
import { BAMBOO_HARVEST_CONTRACT_GO_SOURCE } from "../../go/bamboo-harvest";
import { BOOKSHELF_CONTRACT_GO_SOURCE } from "../../go/bookshelf";
import { SHIPMENT_GOLANG_CONTRACT_PINNED_DEPENDENCIES } from "./shipment-golang-contract-pinned-dependencies";
// import fs from "fs";
// import path from "path";
// import { exec } from "child_process";
// import { promisify } from "util";
import RoleManagerJSON from "../../json/generated/RoleManager.json";
import PaymentJSON from "../../json/generated/Payment.json";

// Validate and get contract addresses and endpoints from environment variables
const ROLE_MANAGER_CONTRACT_ADDRESS = process.env.ROLE_MANAGER_CONTRACT_ADDRESS;
if (!ROLE_MANAGER_CONTRACT_ADDRESS) {
  throw new Error(
    "ROLE_MANAGER_CONTRACT_ADDRESS environment variable is required",
  );
}

const SEPOLIA_RPC_ENDPOINT = process.env.ETHEREUM_SEPOLIA_RPC_ENDPOINT;
if (!SEPOLIA_RPC_ENDPOINT) {
  throw new Error(
    "ETHEREUM_SEPOLIA_RPC_ENDPOINT environment variable is required",
  );
}

const PAYMENT_CONTRACT_ADDRESS = process.env.PAYMENT_CONTRACT_ADDRESS;
if (!PAYMENT_CONTRACT_ADDRESS) {
  throw new Error("PAYMENT_CONTRACT_ADDRESS environment variable is required");
}

export interface ISupplyChainAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
  keychain?: IPluginKeychain;
  pluginRegistry: any;
}

function ledgerStopFailErrorMsg(ledgerName: Readonly<string>): string {
  return (
    `Failed to stop ${ledgerName} ledger. This is most likely safe to ignore if the ` +
    `error states that the container was not running to begin with. This usually means` +
    `that the process exited before the application boot has finished and it did not` +
    `have enough time to start launching the ${ledgerName} ledger yet.`
  );
}

/**
 * Contains code that is meant to simulate parts of a production grade deployment
 * that would otherwise not be part of the application itself.
 *
 * The reason for this being in existence is so that we can have tutorials that
 * are self-contained instead of starting with a multi-hour setup process where
 * the user is expected to set up ledgers from scratch with all the bells and
 * whistles.
 * The sole purpose of this is to have people ramp up with Cactus as fast as
 * possible.
 */
export class SupplyChainAppDummyInfrastructure {
  public static readonly CLASS_NAME = "SupplyChainAppDummyInfrastructure";

  public readonly besu: BesuTestLedger;
  public readonly xdaiBesu: BesuTestLedger;
  public readonly fabric: FabricTestLedgerV1;
  public readonly keychain: IPluginKeychain;
  private readonly log: Logger;
  private _xdaiAccount?: Account;
  private _besuAccount?: Account;
  private connector: PluginLedgerConnectorXdai;
  private _ethereumConnector?: PluginLedgerConnectorEthereum;

  // Add getter for ethereum connector
  public get ethereumConnector(): PluginLedgerConnectorEthereum | undefined {
    return this._ethereumConnector;
  }

  public get xdaiAccount(): Account {
    if (!this._xdaiAccount) {
      throw new Error("xdaiAccount requested but not yet set");
    }
    return this._xdaiAccount;
  }

  public get besuAccount(): Account {
    if (!this._besuAccount) {
      throw new Error("besuAccount requested but not yet set");
    }
    return this._besuAccount;
  }

  public get className(): string {
    return SupplyChainAppDummyInfrastructure.CLASS_NAME;
  }

  constructor(
    public readonly options: ISupplyChainAppDummyInfrastructureOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    if (!options.pluginRegistry) {
      throw new Error(`${fnTag} options.pluginRegistry arg is falsy`);
    }

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.besu = new BesuTestLedger({
      logLevel: level,
      emitContainerLogs: true,
    });
    this.xdaiBesu = new BesuTestLedger({
      logLevel: level,
      emitContainerLogs: true,
    });
    this.fabric = new FabricTestLedgerV1({
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      logLevel: level,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      emitContainerLogs: true,
    });

    if (this.options.keychain) {
      this.keychain = this.options.keychain;
      this.log.info("KeychainID=%o", this.keychain.getKeychainId());
    } else {
      throw new Error(`${fnTag} options.keychain arg is falsy`);
    }

    this.connector = this.options.pluginRegistry.plugins.find(
      (plugin: any) =>
        plugin.getPackageName() ===
        "@hyperledger/cactus-plugin-ledger-connector-xdai",
    ) as PluginLedgerConnectorXdai;

    if (!this.connector) {
      throw new Error(
        `${fnTag} Could not find Xdai connector in plugin registry`,
      );
    }

    this.log.info(
      `${fnTag} Initialized with connector:`,
      this.connector.getInstanceId(),
    );
  }

  public async stop(): Promise<void> {
    try {
      this.log.info(`Stopping...`);
      await Promise.allSettled([
        this.besu
          .stop()
          .then(() => this.besu.destroy())
          .catch((ex) => this.log.warn(ledgerStopFailErrorMsg("Besu"), ex)),
        this.xdaiBesu
          .stop()
          .then(() => this.xdaiBesu.destroy())
          .catch((ex) => this.log.warn(ledgerStopFailErrorMsg("BesuXdai"), ex)),
        this.fabric
          .stop()
          .then(() => this.fabric.destroy())
          .catch((ex) => this.log.warn(ledgerStopFailErrorMsg("Fabric"), ex)),
      ]);
      this.log.info(`Ledgers of dummy infrastructure Stopped OK`);
    } catch (ex) {
      this.log.error(`Stopping crashed: `, ex);
      throw ex;
    }
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure...`);
      await this.fabric.start({ omitPull: false });
      await this.besu.start();
      await this.xdaiBesu.start();

      // Initialize Sepolia Ethereum connector
      this.log.info("Initializing Ethereum connector for Sepolia...");
      const pluginRegistry = new PluginRegistry();
      pluginRegistry.add(this.keychain);

      const ethereumConnector = new PluginLedgerConnectorEthereum({
        instanceId: "PluginLedgerConnectorEthereum_Sepolia",
        rpcApiHttpHost: SEPOLIA_RPC_ENDPOINT,
        logLevel: "DEBUG",
        pluginRegistry,
      });

      // Store the connector in the class instance
      this._ethereumConnector = ethereumConnector;

      pluginRegistry.add(ethereumConnector);
      this.log.info(
        `Added Ethereum connector to plugin registry with ID: ${ethereumConnector.getInstanceId()}`,
      );
      this.log.debug(
        `Ethereum connector connected to: ${SEPOLIA_RPC_ENDPOINT}`,
      );

      this.log.info(`Started dummy infrastructure OK`);
    } catch (ex) {
      this.log.error(`Starting of dummy infrastructure crashed: `, ex);
      throw ex;
    }
  }

  public async deployContracts(): Promise<ISupplyChainContractDeploymentInfo> {
    try {
      this.log.info(`Deploying example supply chain app smart contracts...`);

      await this.keychain.set(
        BookshelfRepositoryJSON.contractName,
        JSON.stringify(BookshelfRepositoryJSON),
      );
      await this.keychain.set(
        BambooHarvestRepositoryJSON.contractName,
        JSON.stringify(BambooHarvestRepositoryJSON),
      );

      // Check if Ethereum connector is initialized
      if (!this._ethereumConnector) {
        this.log.error(
          "Ethereum connector not initialized before deployContracts()",
        );
        throw new Error(
          "Ethereum connector must be initialized before deploying contracts",
        );
      }

      // Deploy contracts
      const bookshelfRepository = await this.deployBesuContract();
      const bambooHarvestRepository = await this.deployXdaiContract();
      const shipmentRepository = await this.deployFabricContracts();

      // Use the pre-deployed RoleManager contract
      const roleManager = {
        address: ROLE_MANAGER_CONTRACT_ADDRESS as string,
        contractName: "RoleManager",
        abi: RoleManagerJSON.abi,
        bytecode: RoleManagerJSON.bytecode || "0x",
        keychainId: this.keychain.getKeychainId(),
      };

      // Use the pre-deployed Payment contract
      const payment = {
        address: PAYMENT_CONTRACT_ADDRESS as string,
        contractName: "Payment",
        abi: PaymentJSON.abi,
        bytecode: PaymentJSON.bytecode || "0x",
        keychainId: this.keychain.getKeychainId(),
      };

      // Register the RoleManager contract in the keychain
      await this.keychain.set(
        roleManager.contractName,
        JSON.stringify({
          abi: roleManager.abi,
          contractName: roleManager.contractName,
          networks: {
            // Sepolia network ID
            "11155111": {
              address: roleManager.address,
            },
          },
        }),
      );

      // Register the Payment contract in the keychain
      await this.keychain.set(
        payment.contractName,
        JSON.stringify({
          abi: payment.abi,
          contractName: payment.contractName,
          networks: {
            // Sepolia network ID
            "11155111": {
              address: payment.address,
            },
          },
        }),
      );

      // Store Ethereum contract info for migration reference but use Fabric for actual operations
      await this.keychain.set(
        "bookshelfEthRepository",
        JSON.stringify(bookshelfRepository),
      );

      await this.keychain.set(
        "bambooHarvestEthRepository",
        JSON.stringify(bambooHarvestRepository),
      );

      // Enhanced shipment repository with references to all Fabric chaincodes
      const enhancedShipmentRepository = {
        ...shipmentRepository,
        bambooHarvestChaincodeId:
          shipmentRepository.bambooHarvestChaincodeId || "bambooharvest",
        bookshelfChaincodeId:
          shipmentRepository.bookshelfChaincodeId || "bookshelf",
      };

      // Generate a more detailed output for debugging
      const contractDetails = {
        shipmentRepository: enhancedShipmentRepository,
        roleManager,
        payment,
        ethereumConnectorId: this._ethereumConnector?.getInstanceId(),
        keychainId: this.keychain.getKeychainId(),
      };

      this.log.debug(
        `Contract deployment details: ${JSON.stringify(contractDetails, null, 2)}`,
      );

      const out: ISupplyChainContractDeploymentInfo = {
        shipmentRepository: enhancedShipmentRepository,
        roleManager,
        payment,
      };

      this.log.info(`Deployed example supply chain app smart contracts OK`);
      this.log.info(`RoleManager will be deployed after wallet connection`);

      return out;
    } catch (ex: unknown) {
      this.log.error(`Deployment of smart contracts crashed: `, ex);
      throw ex;
    }
  }

  public async deployXdaiContract(): Promise<IEthContractDeployment> {
    this.log.debug("ENTER deployXdaiContract()");

    this._xdaiAccount = await this.xdaiBesu.createEthTestAccount(100000000000);
    this.log.debug("Created test ledger account with initial balance OK");

    const rpcApiHttpHost = await this.xdaiBesu.getRpcApiHttpHost();
    this.log.debug("Xdai test ledger rpcApiHttpHost=%s", rpcApiHttpHost);

    const pluginRegistry = new PluginRegistry();
    pluginRegistry.add(this.keychain);
    const connector = new PluginLedgerConnectorXdai({
      instanceId: "PluginLedgerConnectorXdai_Contract_Deployment",
      rpcApiHttpHost,
      logLevel: this.options.logLevel,
      pluginRegistry,
    });

    this.log.debug("Instantiated Xdai connector plugin OK");

    const res = await connector.deployContract({
      contractName: BambooHarvestRepositoryJSON.contractName,
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: this.xdaiAccount.address,
        secret: this.xdaiAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: this.keychain.getKeychainId(),
    });
    const {
      transactionReceipt: { contractAddress },
    } = res;

    const bambooHarvestRepository: IEthContractDeployment = {
      abi: BambooHarvestRepositoryJSON.abi,
      address: contractAddress as string,
      bytecode: BambooHarvestRepositoryJSON.bytecode,
      contractName: BambooHarvestRepositoryJSON.contractName,
      keychainId: this.keychain.getKeychainId(),
    };

    return bambooHarvestRepository;
  }

  public async deployBesuContract(): Promise<IEthContractDeployment> {
    this._besuAccount = await this.besu.createEthTestAccount(2000000);
    const rpcApiHttpHost = await this.besu.getRpcApiHttpHost();
    const rpcApiWsHost = await this.besu.getRpcApiWsHost();

    const pluginRegistry = new PluginRegistry();
    pluginRegistry.add(this.keychain);
    const connector = new PluginLedgerConnectorBesu({
      instanceId: "PluginLedgerConnectorBesu_Contract_Deployment",
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel: this.options.logLevel,
      pluginRegistry,
    });

    const res = await connector.deployContract({
      contractName: BookshelfRepositoryJSON.contractName,
      bytecode: BookshelfRepositoryJSON.bytecode,
      contractAbi: BookshelfRepositoryJSON.abi,
      constructorArgs: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: this.besuAccount.address,
        secret: this.besuAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: this.keychain.getKeychainId(),
    });
    const {
      transactionReceipt: { contractAddress },
    } = res;

    const bookshelfRepository: IEthContractDeployment = {
      abi: BookshelfRepositoryJSON.abi,
      address: contractAddress as string,
      bytecode: BookshelfRepositoryJSON.bytecode,
      contractName: BookshelfRepositoryJSON.contractName,
      keychainId: this.keychain.getKeychainId(),
    };

    return bookshelfRepository;
  }

  public async deployFabricContracts(): Promise<IFabricContractDeployment> {
    this.log.info("Starting Fabric contract deployments...");

    const connectionProfile = await this.fabric.getConnectionProfileOrg1();
    this.log.debug("Got connection profile:", connectionProfile);

    const sshConfig = await this.fabric.getSshConfig();
    this.log.debug("Got SSH config:", sshConfig);

    try {
      // First, we'll directly use the fabric-ca-client to enroll the admin
      this.log.info("Directly enrolling admin with the Fabric CA...");

      // Create CA client directly
      const caClient = await this.fabric.createCaClientV2("org1");

      // Get admin credentials
      const [adminUsername, adminSecret] = this.fabric.adminCredentials;
      this.log.info(
        `Using admin credentials: ${adminUsername} / ${adminSecret}`,
      );

      // Enroll admin directly with the CA client
      const enrollmentRequest = {
        enrollmentID: adminUsername,
        enrollmentSecret: adminSecret,
      };

      // Create an in-memory wallet
      const { Wallets } = require("fabric-network");
      const wallet = await Wallets.newInMemoryWallet();

      try {
        const enrollment = await caClient.enroll(enrollmentRequest);
        this.log.info("Admin enrolled successfully with CA client");

        // Save admin identity to wallet
        const mspId = this.fabric.capitalizedMspIdOfOrg("org1");
        const x509Identity = {
          credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
          },
          mspId,
          type: "X.509",
        };

        await wallet.put("admin", x509Identity);
        this.log.info("Admin identity added to wallet");

        // Store in keychain for later use
        const adminKeychainKey = "admin";
        const adminKeychainValue = JSON.stringify(x509Identity);
        await this.keychain.set(adminKeychainKey, adminKeychainValue);

        // Get admin user context for use with the CA client
        // const provider = wallet
        //   .getProviderRegistry()
        //   .getProvider(x509Identity.type);
        // const adminUser = await provider.getUserContext(x509Identity, "admin");

        // Enroll user2 (manufacturer) in Org1MSP - user is already registered in the CA
        try {
          this.log.info(
            "Enrolling manufacturer (user2) - already registered...",
          );

          // Try to directly enroll the user with the CA (no registration)
          const user2EnrollmentRequest = {
            enrollmentID: "user2",
            enrollmentSecret: "user2pw", // Default password for test network
          };

          const user2Enrollment = await caClient.enroll(user2EnrollmentRequest);
          this.log.info("Manufacturer (user2) enrolled successfully");

          // Create user2 identity
          const user2Identity = {
            credentials: {
              certificate: user2Enrollment.certificate,
              privateKey: user2Enrollment.key.toBytes(),
            },
            mspId,
            type: "X.509",
          };

          // Store in wallet and keychain
          await wallet.put("user2", user2Identity);
          const user2KeychainKey = "user2";
          const user2KeychainValue = JSON.stringify(user2Identity);
          await this.keychain.set(user2KeychainKey, user2KeychainValue);
          this.log.info("Manufacturer (user2) identity added to keychain");
        } catch (error) {
          this.log.error(
            `Failed to enroll manufacturer (user2): ${error.message}`,
          );
          // Continue anyway - we'll attempt user1 enrollment
        }

        // Enroll user1 (customer) in Org1MSP - user is already registered in the CA
        try {
          this.log.info("Enrolling customer (user1) - already registered...");

          // Try to directly enroll the user with the CA (no registration)
          const user1EnrollmentRequest = {
            enrollmentID: "user1",
            enrollmentSecret: "user1pw", // Default password for test network
          };

          const user1Enrollment = await caClient.enroll(user1EnrollmentRequest);
          this.log.info("Customer (user1) enrolled successfully");

          // Create user1 identity
          const user1Identity = {
            credentials: {
              certificate: user1Enrollment.certificate,
              privateKey: user1Enrollment.key.toBytes(),
            },
            mspId,
            type: "X.509",
          };

          // Store in wallet and keychain
          await wallet.put("user1", user1Identity);
          const user1KeychainKey = "user1";
          const user1KeychainValue = JSON.stringify(user1Identity);
          await this.keychain.set(user1KeychainKey, user1KeychainValue);
          this.log.info("Customer (user1) identity added to keychain");
        } catch (error) {
          this.log.error(`Failed to enroll customer (user1): ${error.message}`);
          // Continue anyway - the chaincode deployment can still proceed
        }
      } catch (error) {
        this.log.error(`Admin enrollment failed: ${error.message}`, error);
        // Continue anyway - we'll try to deploy chaincodes with existing credentials
      }

      // Now proceed with contract deployment
      const discoveryOptions: DiscoveryOptions = {
        enabled: true,
        asLocalhost: true,
      };

      this.log.info("Setting up Fabric connector...");
      const pluginRegistry = new PluginRegistry();
      pluginRegistry.add(this.keychain);
      const connector = new PluginLedgerConnectorFabric({
        instanceId: "PluginLedgerConnectorFabric_Contract_Deployment",
        dockerBinary: "/usr/local/bin/docker",
        pluginRegistry,
        peerBinary: "peer",
        sshConfig: sshConfig,
        logLevel: "DEBUG", // Set to DEBUG for more detailed logs
        connectionProfile: connectionProfile,
        cliContainerEnv: {
          ...FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
          GOPROXY: "https://proxy.golang.org,direct",
          GO111MODULE: "on",
          GOSUMDB: "off",
        },
        discoveryOptions: discoveryOptions,
        eventHandlerOptions: {
          strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        },
      });

      // Deploy shipment chaincode
      this.log.info("Deploying shipment chaincode...");
      try {
        const shipmentRes = await connector.deployContractGoSourceV1({
          tlsRootCertFiles:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_TLS_ROOTCERT_FILE,
          targetPeerAddresses: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          ],
          policyDslSource: "OR('Org2MSP.member')",
          channelId: "mychannel",
          chainCodeVersion: "1.0.0",
          constructorArgs: { Args: [] },
          goSource: {
            body: Buffer.from(SHIPMENT_CONTRACT_GO_SOURCE).toString("base64"),
            filename: "shipment.go",
          },
          moduleName: "shipment",
          targetOrganizations: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
          ],
          pinnedDeps: SHIPMENT_GOLANG_CONTRACT_PINNED_DEPENDENCIES,
        });
        this.log.info("Shipment chaincode deployed successfully");
        this.log.debug("Shipment deployment result:", shipmentRes);
      } catch (error) {
        this.log.error("Failed to deploy shipment chaincode:", error);
        throw error;
      }

      // Deploy manufacturer-data chaincode
      this.log.info("Deploying manufacturer data chaincode...");
      try {
        const manufacturerRes = await connector.deployContractGoSourceV1({
          tlsRootCertFiles:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_TLS_ROOTCERT_FILE,
          targetPeerAddresses: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          ],
          policyDslSource: "OR('Org2MSP.member')",
          channelId: "mychannel",
          chainCodeVersion: "1.0.0",
          constructorArgs: { Args: [] },
          goSource: {
            body: Buffer.from(MANUFACTURER_DATA_CONTRACT_GO_SOURCE).toString(
              "base64",
            ),
            filename: "manufacturerdata.go",
          },
          moduleName: "manufacturerdata",
          targetOrganizations: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
          ],
          pinnedDeps: SHIPMENT_GOLANG_CONTRACT_PINNED_DEPENDENCIES,
        });
        this.log.info("Manufacturer data chaincode deployed successfully");
        this.log.debug("Manufacturer data deployment result:", manufacturerRes);
      } catch (error) {
        this.log.error("Failed to deploy manufacturer data chaincode:", error);
        throw error;
      }

      // Deploy bamboo-harvest chaincode
      this.log.info("Deploying bamboo harvest chaincode...");
      try {
        const bambooRes = await connector.deployContractGoSourceV1({
          tlsRootCertFiles:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_TLS_ROOTCERT_FILE,
          targetPeerAddresses: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          ],
          policyDslSource: "OR('Org2MSP.member')",
          channelId: "mychannel",
          chainCodeVersion: "1.0.0",
          constructorArgs: { Args: [] },
          goSource: {
            body: Buffer.from(BAMBOO_HARVEST_CONTRACT_GO_SOURCE).toString(
              "base64",
            ),
            filename: "bamboo-harvest.go",
          },
          moduleName: "bambooharvest",
          targetOrganizations: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
          ],
          pinnedDeps: SHIPMENT_GOLANG_CONTRACT_PINNED_DEPENDENCIES,
        });
        this.log.info("Bamboo harvest chaincode deployed successfully");
        this.log.debug("Bamboo harvest deployment result:", bambooRes);
      } catch (error) {
        this.log.error("Failed to deploy bamboo harvest chaincode:", error);
        throw error;
      }

      // Deploy bookshelf chaincode
      this.log.info("Deploying bookshelf chaincode...");
      try {
        const bookshelfRes = await connector.deployContractGoSourceV1({
          tlsRootCertFiles:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_TLS_ROOTCERT_FILE,
          targetPeerAddresses: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          ],
          policyDslSource: "OR('Org2MSP.member')",
          channelId: "mychannel",
          chainCodeVersion: "1.0.0",
          constructorArgs: { Args: [] },
          goSource: {
            body: Buffer.from(BOOKSHELF_CONTRACT_GO_SOURCE).toString("base64"),
            filename: "bookshelf.go",
          },
          moduleName: "bookshelf",
          targetOrganizations: [
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
          ],
          pinnedDeps: SHIPMENT_GOLANG_CONTRACT_PINNED_DEPENDENCIES,
        });
        this.log.info("Bookshelf chaincode deployed successfully");
        this.log.debug("Bookshelf deployment result:", bookshelfRes);
      } catch (error) {
        this.log.error("Failed to deploy bookshelf chaincode:", error);
        throw error;
      }

      this.log.info("All chaincodes deployed successfully");
      const deploymentInfo = {
        chaincodeId: "shipment",
        channelName: "mychannel",
        keychainId: this.keychain.getKeychainId(),
        manufacturerDataChaincodeId: "manufacturerdata",
        bambooHarvestChaincodeId: "bambooharvest",
        bookshelfChaincodeId: "bookshelf",
      };
      return deploymentInfo;
    } catch (ex) {
      this.log.error("Failed to deploy Fabric contracts:", ex);
      throw ex;
    }
  }

  /**
   * Get information about the pre-deployed RoleManager contract.
   *
   * @param walletAddress The address of the wallet requesting the contract information
   * @returns Information about the RoleManager contract (address, ABI, etc.)
   */
  async getRoleManagerContractInfo(walletAddress: string): Promise<{
    contractAddress: string;
    abi: any;
    contractName: string;
    bytecode: string;
  }> {
    this.log.info(
      `Getting RoleManager contract info for wallet address: ${walletAddress}`,
    );

    try {
      // Try to get the contract from the keychain
      const contractJson = await this.keychain.get("RoleManager");
      if (contractJson) {
        const contract = JSON.parse(contractJson);
        this.log.info(
          `Found RoleManager contract in keychain: ${ROLE_MANAGER_CONTRACT_ADDRESS}`,
        );
        return {
          contractAddress: ROLE_MANAGER_CONTRACT_ADDRESS as string,
          abi: contract.abi || RoleManagerJSON.abi,
          contractName: "RoleManager",
          bytecode: RoleManagerJSON.bytecode || "0x",
        };
      }
    } catch (error) {
      this.log.warn(`Error retrieving RoleManager from keychain: ${error}`);
    }

    // Fallback: return hardcoded values
    this.log.info(
      `Using fallback RoleManager contract info with address: ${ROLE_MANAGER_CONTRACT_ADDRESS}`,
    );
    return {
      contractAddress: ROLE_MANAGER_CONTRACT_ADDRESS as string,
      abi: RoleManagerJSON.abi,
      contractName: "RoleManager",
      bytecode: RoleManagerJSON.bytecode || "0x",
    };
  }

  /**
   * Uses the Ethereum connector to interact with the RoleManager contract on Sepolia
   * This method authenticates using the wallet address directly without JWT tokens
   *
   * @param walletAddress The Ethereum address of the user's wallet
   * @param method The method to call on the RoleManager contract
   * @param args Arguments for the method call
   * @returns The result of the contract call
   */
  async interactWithRoleManagerContract(
    walletAddress: string,
    method: string,
    args: any[] = [],
  ): Promise<any> {
    this.log.info(
      `Interacting with RoleManager contract - method: ${method} for wallet: ${walletAddress}`,
    );

    if (!this._ethereumConnector) {
      this.log.error("Ethereum connector not initialized");
      throw new Error(
        "Ethereum connector must be initialized before interacting with contracts",
      );
    }

    try {
      // Get the contract information
      const contractInfo = await this.getRoleManagerContractInfo(walletAddress);

      // Make sure the contract is in the keychain
      try {
        const hasContract = await this.keychain.has(contractInfo.contractName);
        if (!hasContract) {
          this.log.info(
            `Storing RoleManager contract in keychain for future use`,
          );
          await this.keychain.set(
            contractInfo.contractName,
            JSON.stringify({
              contractName: contractInfo.contractName,
              abi: contractInfo.abi,
              address: contractInfo.contractAddress,
            }),
          );
        }
      } catch (error) {
        this.log.warn(`Error checking/setting contract in keychain: ${error}`);
      }

      // Execute the contract call through the Ethereum connector
      const result = await this._ethereumConnector.invokeContract({
        contract: {
          contractName: contractInfo.contractName,
          keychainId: this.keychain.getKeychainId(),
        },
        methodName: method,
        params: args,
        invocationType: EthContractInvocationType.Call,
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
      });

      this.log.debug(`RoleManager contract call result:`, result);
      return result;
    } catch (error) {
      this.log.error(`Failed to interact with RoleManager contract: ${error}`);
      throw error;
    }
  }
}
