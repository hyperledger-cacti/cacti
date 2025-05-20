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
import { BambooHarvestConverter } from "../../model/converter/bamboo-harvest-converter";

export interface IListBambooHarvestEndpointOptions {
  logLevel?: LogLevelDesc;
  fabricApi: FabricApi;
  ethereumApi?: EthereumApi; // Add Ethereum API
  keychainId: string;
  chaincodeId: string;
  roleManagerAddress?: string;
  sepoliaProvider?: string;
}

export class ListBambooHarvestEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ListBambooHarvestEndpoint";

  private readonly log: Logger;
  private readonly keychainId: string;
  private readonly chaincodeId: string;
  private readonly ethereumApi: EthereumApi | undefined;

  public get className(): string {
    return ListBambooHarvestEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IListBambooHarvestEndpointOptions) {
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
    this.ethereumApi = opts.ethereumApi;

    // Add debug logging for keychain initialization
    this.log.debug(`${fnTag} Initialized with keychain ID: ${this.keychainId}`);
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-bamboo-harvest"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-bamboo-harvest"
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

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
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
    if (!this.ethereumApi || !this.opts.roleManagerAddress) {
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

      // 2. Check isCustomer role - default to true for this endpoint to allow read access
      // if the user has a valid wallet and signature
      let isCustomer = true;

      try {
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
        const explicitCustomerRole = customerResponse.data
          .callOutput as boolean;

        // If explicitly set to false, and not a manufacturer either, then deny access
        if (explicitCustomerRole === false && !isManufacturer) {
          isCustomer = false;
        }
      } catch (error) {
        // If there's an error checking customer role, default to true for read operations
        // as long as they have a valid wallet and signature
        this.log.warn(
          `Error checking customer role, defaulting to allow read access: ${error}`,
        );
        isCustomer = true;
      }

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
      // Default to allowing customers for read access
      return {
        isManufacturer: false,
        isCustomer: true, // Default to customer for read operations
        fabricIdentity: "user1",
        mspId: "Org1MSP",
      };
    }
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      this.log.debug(`${tag}`);

      // Get wallet authentication data from headers
      const walletAddress = req.headers["x-wallet-address"] as string;
      const signature = req.headers["x-signature"] as string;
      const message = req.headers["x-message"] as string;

      // Default identity values
      let fabricIdentity = "user1"; // Default to customer for read operations
      let mspId = "Org1MSP";
      let isPublicDataOnly = true;

      // Require wallet connection - no fallbacks
      if (!walletAddress || !signature || !message) {
        this.log.warn(
          `${tag} Wallet not connected: Missing authentication headers`,
        );
        res.status(401).json({
          error: "Authentication required",
          detail: "Please connect your wallet to access this endpoint",
        });
        return;
      }

      // Verify signature first - this is crucial for security
      try {
        const recoveredAddress = verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          this.log.warn(
            `${tag} Invalid signature for wallet: ${walletAddress}`,
          );
          res.status(403).json({
            error: "Access denied",
            detail: "Invalid signature - signature verification failed",
          });
          return;
        }
      } catch (error) {
        this.log.error(`${tag} Signature verification error:`, error);
        res.status(403).json({
          error: "Access denied",
          detail: "Signature verification failed - malformed signature",
        });
        return;
      }

      // Using Cacti to check roles instead of direct ethers.js
      const roleCheck = await this.checkRoles(walletAddress);

      if (!roleCheck.isManufacturer && !roleCheck.isCustomer) {
        this.log.warn(
          `${tag} Access denied: ${walletAddress} has no valid roles`,
        );
        res.status(403).json({
          error: "Access denied",
          detail: "You must have either a manufacturer or customer role",
        });
        return;
      }

      // Determine access level based on role
      isPublicDataOnly = !roleCheck.isManufacturer;
      fabricIdentity = roleCheck.fabricIdentity;
      mspId = roleCheck.mspId;

      this.log.info(
        `${tag} Using identity: ${fabricIdentity}, MSP: ${mspId}, publicDataOnly: ${isPublicDataOnly}`,
      );

      try {
        // Add debug logging for transaction request
        this.log.debug(`${tag} Executing Fabric transaction with:`, {
          keychainId: this.keychainId,
          fabricIdentity,
          channelName: "mychannel",
          contractName: this.chaincodeId,
        });

        // Choose the correct method based on role
        const methodName = isPublicDataOnly
          ? "GetAllRecords"
          : "GetAllEnhancedRecords";

        this.log.info(
          `Using chaincode method ${methodName} based on user role (manufacturer: ${!isPublicDataOnly})`,
        );

        // Prepare Fabric transaction
        const request: RunTransactionRequest = {
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

        // Execute Fabric transaction
        const result = await this.opts.fabricApi.runTransactionV1(request);

        if (!result.data.functionOutput) {
          res.status(200).json({ data: [] });
          return;
        }

        const dataStr = Buffer.from(result.data.functionOutput).toString(
          "utf-8",
        );

        // Add detailed debug logging of the raw data
        this.log.debug(`${tag} Raw JSON data from Fabric:`, dataStr);

        try {
          const bambooHarvestsJson = JSON.parse(dataStr);

          // Log the parsed JSON data
          this.log.debug(
            `${tag} Parsed data:`,
            JSON.stringify(bambooHarvestsJson, null, 2),
          );

          // Convert the response if needed via the converter
          const bambooHarvests = bambooHarvestsJson.map(
            BambooHarvestConverter.ofFabricObject,
          );

          const body = { data: bambooHarvests };
          res.status(200).json(body);
        } catch (parseError) {
          this.log.error(`${tag} Error parsing JSON data:`, parseError);
          res.status(500).json({
            error: "Data parsing error",
            detail:
              parseError instanceof Error
                ? parseError.message
                : "Unknown error",
          });
        }
      } catch (error) {
        this.log.error(`${tag} Error during Fabric transaction:`, error);
        res.status(500).json({
          error: "Processing error",
          detail: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (ex: unknown) {
      const exStr = safeStringifyException(ex);
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: exStr });
    }
  }
}
