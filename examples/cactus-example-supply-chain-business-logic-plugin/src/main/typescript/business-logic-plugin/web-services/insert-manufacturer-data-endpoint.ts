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
import { InsertManufacturerDataRequest } from "../../generated/openapi/typescript-axios/api";
import { ManufacturerDataConverter } from "../../model/converter/manufacturer-data-converter";

export interface IInsertManufacturerDataEndpointOptions {
  logLevel?: LogLevelDesc;
  fabricApi: FabricApi;
  ethereumApi?: EthereumApi; // Add Ethereum API
  keychainId: string;
  chaincodeId: string;
  roleManagerAddress?: string;
}

export class InsertManufacturerDataEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "InsertManufacturerDataEndpoint";
  private readonly log: Logger;
  private readonly keychainId: string;
  private readonly chaincodeId: string;
  private readonly roleManagerAddress: string;
  private readonly ethereumApi: EthereumApi | undefined;

  public get className(): string {
    return InsertManufacturerDataEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IInsertManufacturerDataEndpointOptions) {
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
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-manufacturer-data"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-manufacturer-data"
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
    return apiPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().post.operationId;
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
   * Check manufacturer role using Cacti Ethereum connector
   */
  private async checkManufacturerRole(walletAddress: string): Promise<{
    isManufacturer: boolean;
    fabricIdentity: string;
    mspId: string;
  }> {
    if (!this.ethereumApi || !this.opts.roleManagerAddress) {
      this.log.warn(
        "Ethereum API or roleManagerAddress not configured, skipping role check",
      );
      return {
        isManufacturer: false, // Default to false for security
        fabricIdentity: "user1",
        mspId: "Org1MSP",
      };
    }

    try {
      this.log.info(
        `Checking manufacturer role for ${walletAddress} using Cacti Ethereum connector`,
      );

      // 1. Check isManufacturer role
      const roleCheckRequest: InvokeContractV1Request = {
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

      const isManufacturerResponse =
        await this.ethereumApi.invokeContractV1(roleCheckRequest);
      const isManufacturer = isManufacturerResponse.data.callOutput as boolean;
      this.log.info(`isManufacturer check result: ${isManufacturer}`);

      if (!isManufacturer) {
        return {
          isManufacturer: false,
          fabricIdentity: "user1", // Default customer identity
          mspId: "Org1MSP",
        };
      }

      // 2. Get Fabric identity mapping
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

      if (!fabricIdentity || fabricIdentity === "") {
        fabricIdentity = "user2"; // Default manufacturer identity
      }

      // 3. Get MSP ID mapping
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

      if (!mspId || mspId === "") {
        mspId = "Org2MSP"; // Default MSP for manufacturers
      }

      return { isManufacturer, fabricIdentity, mspId };
    } catch (error) {
      this.log.error(`Error checking manufacturer role with Cacti: ${error}`);
      return {
        isManufacturer: false, // Default to false for security
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

      // Default Fabric identity and MSP ID
      let fabricIdentity = "user2"; // Default to manufacturer
      let mspId = "Org2MSP";
      let hasManufacturerRole = false;

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
        this.log.info(`${tag} Signature verified for wallet: ${walletAddress}`);
      } catch (error) {
        this.log.error(`${tag} Signature verification error:`, error);
        return res.status(403).json({
          error: "Access denied",
          detail: "Signature verification failed - malformed signature",
        });
      }

      // Using Cacti to check role instead of direct ethers.js
      const roleCheck = await this.checkManufacturerRole(walletAddress);

      if (!roleCheck.isManufacturer) {
        this.log.warn(
          `${tag} Access denied: ${walletAddress} is not a manufacturer`,
        );
        return res.status(403).json({
          error: "Access denied",
          detail: "Only manufacturers can access this endpoint",
        });
      }

      hasManufacturerRole = true;

      // Use the fabric identity from role check
      fabricIdentity = roleCheck.fabricIdentity;
      mspId = roleCheck.mspId;

      this.log.info(
        `Using Fabric identity from role check: ${fabricIdentity}, MSP: ${mspId}`,
      );

      // Check MSP for private data operations
      if (mspId !== "Org2MSP") {
        return res.status(403).json({
          error: "Access denied",
          detail: "Only Org2MSP members can insert manufacturer data",
          providedOrg: mspId,
          requiredOrg: "Org2MSP",
        });
      }

      // Process the request
      const { manufacturerData } = req.body as InsertManufacturerDataRequest;

      // First, insert the basic record (for customer view)
      const basicRequest: RunTransactionRequest = {
        signingCredential: {
          keychainId: this.keychainId,
          keychainRef: fabricIdentity,
        },
        channelName: "mychannel",
        contractName: this.chaincodeId,
        invocationType: FabricContractInvocationType.Send,
        methodName: "StorePublicProductData",
        params: [
          manufacturerData.id,
          manufacturerData.name,
          manufacturerData.inventory.toString(),
          // Limited public data for customers
        ],
      };

      // Execute insertion of basic record
      this.log.info(
        `Sending basic product data Fabric transaction with identity: ${fabricIdentity}, MSP: ${mspId}`,
      );
      try {
        // First insert the public data
        this.log.debug(
          `${tag} Inserting basic manufacturer record (public data)...`,
        );
        await this.opts.fabricApi.runTransactionV1(basicRequest);
        this.log.debug(
          `${tag} Basic manufacturer record inserted successfully.`,
        );

        // Then, insert the enhanced record (for manufacturer view)
        const enhancedRequest: RunTransactionRequest = {
          signingCredential: {
            keychainId: this.keychainId,
            keychainRef: fabricIdentity,
          },
          channelName: "mychannel",
          contractName: this.chaincodeId,
          invocationType: FabricContractInvocationType.Send,
          methodName: "StoreProductData",
          params: [
            manufacturerData.id,
            manufacturerData.name,
            manufacturerData.costPrice.toString(),
            manufacturerData.inventory.toString(),
            manufacturerData.supplierInfo,
            manufacturerData.shippingAddress,
            manufacturerData.customerContact,
          ],
        };

        // Execute insertion of enhanced record
        this.log.debug(
          `${tag} Inserting enhanced manufacturer record (private data)...`,
        );
        const result =
          await this.opts.fabricApi.runTransactionV1(enhancedRequest);
        this.log.debug(
          `${tag} Enhanced manufacturer record inserted successfully.`,
        );

        return res.status(200).json({
          functionOutput: result.data.functionOutput,
          publicDataInserted: true,
        });
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
