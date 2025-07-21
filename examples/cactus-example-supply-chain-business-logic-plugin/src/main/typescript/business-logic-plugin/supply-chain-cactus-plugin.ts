import { Express } from "express";
import OAS from "../../json/openapi.json";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  Web3SigningCredential,
  Web3SigningCredentialType,
  EthContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-xdai";
import { DefaultApi as FabricApi } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DefaultApi as EthereumApi } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { InsertBambooHarvestEndpoint } from "./web-services/insert-bamboo-harvest-endpoint";

import { ListBambooHarvestEndpoint } from "./web-services/list-bamboo-harvest-endpoint";
import { ISupplyChainContractDeploymentInfo } from "../i-supply-chain-contract-deployment-info";
import { InsertBookshelfEndpoint } from "./web-services/insert-bookshelf-endpoint";
import { ListBookshelfEndpoint } from "./web-services/list-bookshelf-endpoint";
import { InsertShipmentEndpoint } from "./web-services/insert-shipment-endpoint";
import { ListShipmentEndpoint } from "./web-services/list-shipment-endpoint";
import { InsertManufacturerDataEndpoint } from "./web-services/insert-manufacturer-data-endpoint";
import { ListManufacturerDataEndpoint } from "./web-services/list-manufacturer-data-endpoint";
import {
  DeployRoleManagerEndpoint,
  IInfrastructureWithRoleManagerAccess,
} from "./web-services/deploy-role-manager-endpoint";
import { CreatePaymentEndpoint } from "./web-services/create-payment-endpoint";
import { ProcessPaymentEndpoint } from "./web-services/process-payment-endpoint";
import { DeleteBambooHarvestEndpoint } from "./web-services/delete-bamboo-harvest-endpoint";

export interface OrgEnv {
  CORE_PEER_LOCALMSPID: string;
  CORE_PEER_ADDRESS: string;
  CORE_PEER_MSPCONFIGPATH: string;
  CORE_PEER_TLS_ROOTCERT_FILE: string;
  ORDERER_TLS_ROOTCERT_FILE: string;
}

export interface ISupplyChainCactusPluginOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  fabricApiClient: FabricApi;
  ethereumApiClient?: EthereumApi;
  web3SigningCredential: Web3SigningCredential;
  fabricEnvironment?: NodeJS.ProcessEnv;
  contracts: ISupplyChainContractDeploymentInfo;
  infrastructure: IInfrastructureWithRoleManagerAccess;
  keychainId: string;
}

export class SupplyChainCactusPlugin
  implements ICactusPlugin, IPluginWebService
{
  public static readonly CLASS_NAME = "SupplyChainCactusPlugin";

  private readonly log: Logger;
  private readonly instanceId: string;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return SupplyChainCactusPlugin.CLASS_NAME;
  }

  constructor(public readonly options: ISupplyChainCactusPluginOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.contracts, `${fnTag} arg options.contracts`);
    Checks.truthy(
      options.fabricApiClient,
      `${fnTag} arg options.fabricApiClient`,
    );
    Checks.truthy(
      options.web3SigningCredential,
      `${fnTag} arg options.web3SigningCredential`,
    );
    Checks.truthy(
      options.infrastructure,
      `${fnTag} arg options.infrastructure`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    this.log.info(
      `Creating endpoints with Fabric chaincodes for all operations`,
    );

    // Add debug logging for keychain ID
    this.log.debug(
      "Using keychain ID:",
      this.options.contracts.shipmentRepository.keychainId,
    );

    // Ensure Fabric chaincode IDs are available
    const bambooHarvestChaincodeId =
      this.options.contracts.shipmentRepository.bambooHarvestChaincodeId ||
      "bambooharvest";
    const bookshelfChaincodeId =
      this.options.contracts.shipmentRepository.bookshelfChaincodeId ||
      "bookshelf";
    const shipmentChaincodeId =
      this.options.contracts.shipmentRepository.chaincodeId;
    const manufacturerDataChaincodeId =
      this.options.contracts.shipmentRepository.manufacturerDataChaincodeId ||
      "manufacturerdata";
    const roleManagerAddress = this.options.contracts.roleManager?.address;

    const insertBambooHarvest = new InsertBambooHarvestEndpoint({
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: bambooHarvestChaincodeId,
      roleManagerAddress: roleManagerAddress,
      logLevel: "DEBUG", // Set to DEBUG for more detailed logs
    });

    // Add debug logging for endpoint initialization
    this.log.debug(
      "Initialized InsertBambooHarvestEndpoint with keychain ID:",
      this.options.contracts.shipmentRepository.keychainId,
    );

    const listBambooHarvest = new ListBambooHarvestEndpoint({
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: bambooHarvestChaincodeId,
      roleManagerAddress: roleManagerAddress,
      logLevel: this.options.logLevel,
      sepoliaProvider:
        "https://eth-sepolia.g.alchemy.com/v2/3cyIgaOFBbEtlE0n0XLyuTVkjXwZ420c",
    });

    const insertBookshelf = new InsertBookshelfEndpoint({
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: bookshelfChaincodeId,
      roleManagerAddress: roleManagerAddress,
      logLevel: this.options.logLevel,
    });

    const listBookshelf = new ListBookshelfEndpoint({
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: bookshelfChaincodeId,
      roleManagerAddress: roleManagerAddress,
      logLevel: this.options.logLevel,
      sepoliaProvider:
        "https://eth-sepolia.g.alchemy.com/v2/3cyIgaOFBbEtlE0n0XLyuTVkjXwZ420c",
    });

    const insertShipment = new InsertShipmentEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: this.options.contracts.shipmentRepository.chaincodeId,
      roleManagerAddress: this.options.contracts.roleManager?.address,
    });

    const listShipment = new ListShipmentEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: this.options.contracts.shipmentRepository.chaincodeId,
      roleManagerAddress: this.options.contracts.roleManager?.address,
    });

    const insertManufacturerData = new InsertManufacturerDataEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId:
        this.options.contracts.shipmentRepository.manufacturerDataChaincodeId ||
        "manufacturer-data",
      roleManagerAddress: this.options.contracts.roleManager?.address,
    });

    const listManufacturerData = new ListManufacturerDataEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId:
        this.options.contracts.shipmentRepository.manufacturerDataChaincodeId ||
        "manufacturer-data",
      roleManagerAddress: this.options.contracts.roleManager?.address,
      sepoliaProvider:
        "https://eth-sepolia.g.alchemy.com/v2/3cyIgaOFBbEtlE0n0XLyuTVkjXwZ420c",
    });

    const deployRoleManager = new DeployRoleManagerEndpoint({
      logLevel: this.options.logLevel,
      backend: this.options.infrastructure,
    });

    const createPayment = new CreatePaymentEndpoint({
      logLevel: this.options.logLevel,
      plugin: this,
    });

    const processPayment = new ProcessPaymentEndpoint({
      logLevel: this.options.logLevel,
      plugin: this,
    });

    const deleteBambooHarvest = new DeleteBambooHarvestEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      ethereumApi: this.options.ethereumApiClient,
      keychainId: this.options.contracts.shipmentRepository.keychainId,
      chaincodeId: bambooHarvestChaincodeId,
      roleManagerAddress: this.options.contracts.roleManager?.address,
    });

    this.endpoints = [
      listBambooHarvest,
      listBookshelf,
      listShipment,
      insertBambooHarvest,
      insertBookshelf,
      insertShipment,
      insertManufacturerData,
      listManufacturerData,
      deployRoleManager,
      createPayment,
      processPayment,
      deleteBambooHarvest,
    ];
    return this.endpoints;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-example-supply-chain-backend";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  /**
   * Create a payment for a product
   * @param payerAddress Address of the payer (customer)
   * @param payeeAddress Address of the payee (manufacturer)
   * @param amount Payment amount in ETH
   * @param productId ID of the product (bookshelf or shipment)
   * @param productType Type of product ("bookshelf" or "shipment")
   * @returns Object containing payment ID and transaction hash
   */
  public async createPayment(
    payerAddress: string,
    payeeAddress: string,
    amount: string,
    productId: string,
    productType: string,
  ): Promise<{ paymentId: number; transactionHash: string }> {
    // Ensure Ethereum API client is available
    if (!this.options.ethereumApiClient) {
      throw new Error(
        "Ethereum API client not available for payment operations",
      );
    }

    try {
      // Prepare the invoke request for the Payment contract
      const invokeRequest = {
        contract: {
          contractName: "Payment",
          keychainId: this.options.contracts.shipmentRepository.keychainId,
        },
        methodName: "createPayment",
        gas: 1000000,
        params: [payerAddress, payeeAddress, amount, productId, productType],
        invocationType: EthContractInvocationType.Send,
        signingCredential: this.options.web3SigningCredential,
      };

      // Invoke the contract method
      const response =
        await this.options.ethereumApiClient.invokeContractV1(invokeRequest);

      // Parse the payment ID and transaction hash from the response
      if (response.data) {
        // Check for transaction hash first
        let transactionHash = "";
        if (
          response.data.transactionReceipt &&
          response.data.transactionReceipt.transactionHash
        ) {
          transactionHash = response.data.transactionReceipt.transactionHash;
        }

        // Then get payment ID
        let paymentId = 0;
        if (response.data.callOutput) {
          paymentId = parseInt(response.data.callOutput, 10);
          if (isNaN(paymentId)) {
            throw new Error(
              `Invalid payment ID returned: ${response.data.callOutput}`,
            );
          }
        } else {
          throw new Error("No payment ID returned from contract");
        }

        return { paymentId, transactionHash };
      } else {
        throw new Error("No data returned from contract invocation");
      }
    } catch (error) {
      this.log.error(`Error creating payment: ${error}`);
      throw error;
    }
  }

  /**
   * Process a payment (mark it as paid)
   * @param paymentId Payment ID to process
   * @param transactionReference Reference to the transaction
   * @param walletAddress Address of the user processing the payment
   */
  public async processPayment(
    paymentId: number,
    transactionReference: string,
    walletAddress: string,
  ): Promise<void> {
    // Ensure Ethereum API client is available
    if (!this.options.ethereumApiClient) {
      throw new Error(
        "Ethereum API client not available for payment operations",
      );
    }

    try {
      // Prepare the invoke request for the Payment contract
      const invokeRequest = {
        contract: {
          contractName: "Payment",
          keychainId: this.options.contracts.shipmentRepository.keychainId,
        },
        methodName: "processPayment",
        gas: 1000000,
        params: [paymentId, transactionReference],
        invocationType: EthContractInvocationType.Send,
        signingCredential: this.options.web3SigningCredential,
      };

      // Invoke the contract method
      const response =
        await this.options.ethereumApiClient.invokeContractV1(invokeRequest);

      // Check if the transaction was successful
      if (
        response.data &&
        response.data.transactionReceipt &&
        response.data.transactionReceipt.status
      ) {
        this.log.info(`Payment ${paymentId} processed successfully`);
      } else {
        throw new Error("Failed to process payment: Transaction failed");
      }
    } catch (error) {
      this.log.error(`Error processing payment: ${error}`);
      throw error;
    }
  }

  /**
   * Get payment status for a product
   * @param productId Product ID to check
   * @returns True if product is paid for
   */
  public async isProductPaid(productId: string): Promise<boolean> {
    // Ensure Ethereum API client is available
    if (!this.options.ethereumApiClient) {
      throw new Error(
        "Ethereum API client not available for payment operations",
      );
    }

    try {
      // Prepare the invoke request for the Payment contract
      const invokeRequest = {
        contract: {
          contractName: "Payment",
          keychainId: this.options.contracts.shipmentRepository.keychainId,
        },
        methodName: "isProductPaid",
        gas: 1000000,
        params: [productId],
        invocationType: EthContractInvocationType.Call,
        signingCredential: this.options.web3SigningCredential,
      };

      // Invoke the contract method
      const response =
        await this.options.ethereumApiClient.invokeContractV1(invokeRequest);

      // Parse the boolean result
      if (response.data && response.data.callOutput !== undefined) {
        return (
          response.data.callOutput === "true" ||
          response.data.callOutput === true
        );
      } else {
        return false;
      }
    } catch (error) {
      this.log.error(`Error checking if product is paid: ${error}`);
      return false;
    }
  }
}
