import { Express, Request, Response } from "express";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import {
  DefaultApi as FabricApi,
  FabricContractInvocationType,
  RunTransactionRequest,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  DefaultApi as EthereumApi,
  Web3SigningCredentialType,
  InvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { verifyMessage } from "ethers";

import OAS from "../../../json/openapi.json";
import { ManufacturerDataConverter } from "../../model/converter/manufacturer-data-converter";

export interface IListManufacturerDataEndpointOptions {
  logLevel?: LogLevelDesc;
  fabricApi: FabricApi;
  ethereumApi?: EthereumApi;
  keychainId: string;
  chaincodeId: string;
  roleManagerAddress?: string;
  sepoliaProvider?: string;
}

export class ListManufacturerDataEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ListManufacturerDataEndpoint";
  private readonly log: Logger;
  private readonly keychainId: string;
  private readonly chaincodeId: string;
  private readonly roleManagerAddress: string;
  private readonly ethereumApi: EthereumApi | undefined;

  public get className(): string {
    return ListManufacturerDataEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IListManufacturerDataEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.fabricApi, `${fnTag} options.fabricApi`);
    Checks.truthy(opts.keychainId, `${fnTag} options.keychainId`);
    Checks.truthy(opts.chaincodeId, `${fnTag} options.chaincodeId`);
    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.keychainId = opts.keychainId;
    this.chaincodeId = opts.chaincodeId;
    this.roleManagerAddress = opts.roleManagerAddress || "";
    this.ethereumApi = opts.ethereumApi;

    // Add debug logging for keychain initialization
    this.log.debug(`${fnTag} Initialized with keychain ID: ${this.keychainId}`);
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-manufacturer-data"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-manufacturer-data"
    ];
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().get.operationId;
  }

  getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  /**
   * Check roles using Cacti Ethereum connector
   */
  private async checkRoles(walletAddress: string): Promise<{
    isManufacturer: boolean;
    isCustomer: boolean;
    fabricIdentity: string;
    mspId: string;
  }> {
    if (!this.ethereumApi || !this.roleManagerAddress) {
      this.log.warn(
        "Ethereum API or roleManagerAddress not configured, skipping role check",
      );
      return {
        isManufacturer: false,
        isCustomer: true, // Default to customer for read operations
        fabricIdentity: "user1",
        mspId: "Org1MSP",
      };
    }

    try {
      this.log.info(
        `Checking roles for ${walletAddress} using Cacti Ethereum connector`,
      );

      // 1. Check isManufacturer role
      const manufacturerRoleRequest: InvokeContractV1Request = {
        contract: {
          contractName: "RoleManager",
          keychainId: this.keychainId,
        },
        invocationType: "CALL",
        methodName: "isManufacturer",
        params: [walletAddress],
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
      };

      const manufacturerResponse = await this.ethereumApi.invokeContractV1(
        manufacturerRoleRequest,
      );
      const isManufacturer = manufacturerResponse.data.callOutput as boolean;

      // 2. Check isCustomer role
      const customerRoleRequest: InvokeContractV1Request = {
        contract: {
          contractName: "RoleManager",
          keychainId: this.keychainId,
        },
        invocationType: "CALL",
        methodName: "isCustomer",
        params: [walletAddress],
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
      };

      const customerResponse =
        await this.ethereumApi.invokeContractV1(customerRoleRequest);
      const isCustomer = customerResponse.data.callOutput as boolean;

      this.log.info(
        `Role check results - Manufacturer: ${isManufacturer}, Customer: ${isCustomer}`,
      );

      // 3. Get Fabric identity mapping
      const identityRequest: InvokeContractV1Request = {
        contract: {
          contractName: "RoleManager",
          keychainId: this.keychainId,
        },
        invocationType: "CALL",
        methodName: "getFabricIdentity",
        params: [walletAddress],
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
      };

      const identityResponse =
        await this.ethereumApi.invokeContractV1(identityRequest);
      let fabricIdentity = identityResponse.data.callOutput as string;

      // 4. Get MSP ID mapping
      const mspRequest: InvokeContractV1Request = {
        contract: {
          contractName: "RoleManager",
          keychainId: this.keychainId,
        },
        invocationType: "CALL",
        methodName: "getMspId",
        params: [walletAddress],
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
      };

      const mspResponse = await this.ethereumApi.invokeContractV1(mspRequest);
      let mspId = mspResponse.data.callOutput as string;

      // Set default values if not provided by contract
      if (!fabricIdentity || fabricIdentity === "") {
        fabricIdentity = isManufacturer ? "user2" : "user1";
      }

      if (!mspId || mspId === "") {
        mspId = isManufacturer ? "Org2MSP" : "Org1MSP";
      }

      return { isManufacturer, isCustomer, fabricIdentity, mspId };
    } catch (error) {
      this.log.error(`Error checking roles with Cacti: ${error}`);
      return {
        isManufacturer: false,
        isCustomer: true, // Default to customer for read operations
        fabricIdentity: "user1",
        mspId: "Org1MSP",
      };
    }
  }

  public async handleRequest(req: Request, res: Response): Promise<Response> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      // Get wallet authentication data from headers
      const walletAddress = req.headers["x-wallet-address"] as string;
      const signature = req.headers["x-signature"] as string;
      const message = req.headers["x-message"] as string;

      // Require wallet connection - no fallbacks
      if (!walletAddress || !signature || !message) {
        this.log.warn(
          `${tag} Wallet not connected: Missing authentication headers`,
        );
        return res.status(401).json({
          error: "Authentication required",
          detail: "Please connect your wallet to access this endpoint",
        });
      }

      // Verify signature first - this is crucial for security
      try {
        const recoveredAddress = verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          this.log.warn(
            `${tag} Invalid signature for wallet: ${walletAddress}`,
          );
          return res.status(403).json({
            error: "Access denied",
            detail: "Invalid signature - signature verification failed",
          });
        }
      } catch (error) {
        this.log.error(`${tag} Signature verification error:`, error);
        return res.status(403).json({
          error: "Access denied",
          detail: "Signature verification failed - malformed signature",
        });
      }

      // Check for RoleManager configuration
      if (!this.roleManagerAddress || !this.ethereumApi) {
        this.log.error(
          `${tag} RoleManager address or Ethereum API not configured`,
        );
        return res.status(500).json({
          error: "Configuration error",
          detail: "RoleManager contract address or Ethereum API not configured",
        });
      }

      // Using Cacti to check roles instead of direct ethers.js
      const roleCheck = await this.checkRoles(walletAddress);

      if (!roleCheck.isManufacturer && !roleCheck.isCustomer) {
        this.log.warn(
          `${tag} Access denied: ${walletAddress} has no valid roles`,
        );
        return res.status(403).json({
          error: "Access denied",
          detail:
            "You must have either a manufacturer or customer role to view manufacturer data",
        });
      }

      // Default identity is manufacturer (user2)
      let fabricIdentity = roleCheck.fabricIdentity;
      let mspId = roleCheck.mspId;
      let isPublicDataOnly = !roleCheck.isManufacturer && roleCheck.isCustomer;

      // Check for enhanced flag in the request query
      const requestEnhanced = req.query.enhanced === "true";
      const productId = req.query.productId as string; // Optional product ID for single enhanced record

      // Log the access level
      this.log.info(
        `${tag} User ${walletAddress} accessing ${isPublicDataOnly ? "public data only" : "all data"}${requestEnhanced ? " (enhanced)" : ""} with identity: ${fabricIdentity}, MSP: ${mspId}`,
      );

      // Add debug logging for transaction request
      this.log.debug(`${tag} Executing Fabric transaction with:`, {
        keychainId: this.keychainId,
        fabricIdentity,
        channelName: "mychannel",
        contractName: this.chaincodeId,
      });

      // Choose the appropriate chaincode function based on request type
      let methodName = "GetAllProducts"; // Default to basic data for all requests

      if (requestEnhanced && roleCheck.isManufacturer && productId) {
        // If we're requesting a single enhanced record, use GetProductData instead
        methodName = "GetProductData";
      }

      this.log.info(`Using chaincode method ${methodName} for request`);

      try {
        // For a single product query, use a different approach
        if (methodName === "GetProductData" && productId) {
          const request = {
            signingCredential: {
              keychainId: this.keychainId,
              keychainRef: fabricIdentity,
            },
            channelName: "mychannel",
            contractName: this.chaincodeId,
            invocationType: FabricContractInvocationType.Call,
            methodName: methodName,
            params: [productId],
          };

          const result = await this.opts.fabricApi.runTransactionV1(request);

          if (!result.data.functionOutput) {
            return res.status(404).json({ error: "Product not found" });
          }

          const dataStr = Buffer.from(result.data.functionOutput).toString(
            "utf-8",
          );
          this.log.debug(`${tag} Raw product data response:`, dataStr);

          try {
            const productData = JSON.parse(dataStr);

            // Add privateNotes if needed
            if (!productData.privateNotes) {
              productData.privateNotes = `Private data for product ${productId}`;
            }

            // Convert to standard model
            const processedProduct =
              ManufacturerDataConverter.ofFabricArray(productData);

            return res.status(200).json({ data: [processedProduct] });
          } catch (parseError) {
            this.log.error(
              `Failed to parse product JSON response: ${parseError}`,
            );
            return res.status(500).json({
              error: "Failed to parse response from blockchain",
              detail: parseError.message,
            });
          }
        } else {
          // Standard request for all records
          const request = {
            signingCredential: {
              keychainId: this.keychainId,
              keychainRef: fabricIdentity,
            },
            channelName: "mychannel",
            contractName: this.chaincodeId,
            invocationType: FabricContractInvocationType.Call,
            methodName: methodName,
            params: [],
          };

          const result = await this.opts.fabricApi.runTransactionV1(request);

          if (!result.data.functionOutput) {
            return res.status(200).json({ data: [] });
          }

          const dataStr = Buffer.from(result.data.functionOutput).toString(
            "utf-8",
          );
          this.log.debug(`${tag} Raw chaincode response:`, dataStr);

          try {
            const rawData = JSON.parse(dataStr);

            // Add privateNotes if needed
            const processedData = Array.isArray(rawData)
              ? rawData.map((item) => {
                  // Make sure privateNotes exists
                  if (!item.privateNotes && !item.PrivateNotes) {
                    item.privateNotes = "Private manufacturer information";
                  }
                  return item;
                })
              : rawData;

            // Convert the processed data
            const manufacturerData =
              ManufacturerDataConverter.ofFabricArrayList(processedData);

            return res.status(200).json({ data: manufacturerData });
          } catch (parseError) {
            this.log.error(`Failed to parse JSON response: ${parseError}`);
            this.log.debug(`Raw response was: ${dataStr}`);
            return res.status(500).json({
              error: "Failed to parse response from blockchain",
              detail: parseError.message,
            });
          }
        }
      } catch (error) {
        this.log.error(`Failed to execute transaction: ${error}`);
        if (error.message?.includes("private data")) {
          return res.status(403).json({
            error: "Access denied",
            detail: "Insufficient permissions to access private data",
          });
        }
        throw error;
      }
    } catch (ex: unknown) {
      const exStr = safeStringifyException(ex);
      this.log.error(`${tag} Failed to serve request:`, ex);
      return res.status(500).json({ error: exStr });
    }
  }
}
