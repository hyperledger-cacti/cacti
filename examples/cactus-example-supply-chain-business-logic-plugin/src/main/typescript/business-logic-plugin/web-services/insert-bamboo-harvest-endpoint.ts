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
import {
  AuthorizationOptionsProvider,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";
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
import {
  InsertBambooHarvestRequest,
  BambooHarvest,
} from "../../generated/openapi/typescript-axios";

// Extended interface with fields needed for Fabric chaincode
interface IFabricBambooHarvest extends BambooHarvest {
  harvestDate?: string;
  manufacturerId?: string;
  quantity?: number | string;
  bambooType?: string;
  quality?: string;
  manufacturerDataId?: string;
  privateNotes?: string;
}

// Update the InsertBambooHarvestRequest interface to include manufacturer data ID
export interface InsertBambooHarvestRequestWithManufacturer
  extends InsertBambooHarvestRequest {
  manufacturerDataId?: string;
  privateNotes?: string;
}

export interface IInsertBambooHarvestEndpointOptions {
  logLevel?: LogLevelDesc;
  fabricApi: FabricApi;
  ethereumApi?: EthereumApi; // Add Ethereum API
  keychainId: string;
  chaincodeId: string;
  roleManagerAddress?: string;
  authorizationOptionsProvider?: AuthorizationOptionsProvider;
  sepoliaProvider?: string;
}

const K_DEFAULT_AUTHORIZATION_OPTIONS: IEndpointAuthzOptions = {
  isProtected: true,
  requiredRoles: [],
};

export class InsertBambooHarvestEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "InsertBambooHarvestEndpoint";

  private readonly log: Logger;
  private readonly keychainId: string;
  private readonly chaincodeId: string;
  private readonly ethereumApi: EthereumApi | undefined;

  public get className(): string {
    return InsertBambooHarvestEndpoint.CLASS_NAME;
  }

  private readonly authorizationOptionsProvider: AuthorizationOptionsProvider;

  constructor(public readonly opts: IInsertBambooHarvestEndpointOptions) {
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

    this.authorizationOptionsProvider =
      opts.authorizationOptionsProvider ||
      AuthorizationOptionsProvider.of(K_DEFAULT_AUTHORIZATION_OPTIONS, level);

    this.log.debug(`Instantiated ${this.className} OK`);
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-bamboo-harvest"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-bamboo-harvest"
    ];
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return this.authorizationOptionsProvider;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cacti"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
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
        // Check if there's a valid customer role - all valid users should have some identity
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
        const fabricIdentity = identityResponse.data.callOutput as string;

        // Check if we have a valid customer identity
        if (fabricIdentity && fabricIdentity !== "") {
          this.log.info(
            `User is a valid customer with identity: ${fabricIdentity}`,
          );

          // Get the MSP ID for this customer
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

          const mspResponse =
            await this.ethereumApi.invokeContractV1(mspRequest);
          const mspId = (mspResponse.data.callOutput as string) || "Org1MSP";

          return {
            isManufacturer: false,
            fabricIdentity: fabricIdentity,
            mspId: mspId,
          };
        }

        // Default customer identity if no specific mapping is found
        return {
          isManufacturer: false,
          fabricIdentity: "user1",
          mspId: "Org1MSP",
        };
      }

      // 2. Get Fabric identity mapping for manufacturer
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

  async handleRequest(req: Request, res: Response): Promise<Response> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      // Authentication section - we keep this for wallet auth
      const walletAddress = req.headers["x-wallet-address"] as string;
      const signature = req.headers["x-signature"] as string;
      const message = req.headers["x-message"] as string;

      // Default to manufacturer identity (user2)
      let fabricIdentity = "user2";
      let mspId = "Org2MSP";

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

      // Using Cacti to check role instead of direct ethers.js
      const roleCheck = await this.checkManufacturerRole(walletAddress);

      // Use the fabric identity from role check
      fabricIdentity = roleCheck.fabricIdentity;
      mspId = roleCheck.mspId;

      this.log.info(
        `Using Fabric identity from role check: ${fabricIdentity}, MSP: ${mspId}, isManufacturer: ${roleCheck.isManufacturer}`,
      );

      // For GET requests, allow access to both manufacturers and customers
      // For POST (insert), only allow manufacturers
      if (req.method === "GET") {
        // GET request - allow access for all valid users
        // Logic for fetching public data would go here if this endpoint handled GET
        this.log.info(
          `${tag} Processing GET request for wallet: ${walletAddress}`,
        );
      } else if (!roleCheck.isManufacturer) {
        // Non-GET request from non-manufacturer - deny access
        this.log.warn(
          `${tag} Access denied: ${walletAddress} is not a manufacturer and attempted to perform ${req.method} operation`,
        );
        return res.status(403).json({
          error: "Access denied",
          detail: "Only manufacturers can perform this operation",
        });
      }

      // Transaction section - now using Fabric instead of xDai
      // Only manufacturers can insert records (POST)
      if (req.method === "POST" && roleCheck.isManufacturer) {
        const requestWithManufacturer =
          req.body as InsertBambooHarvestRequestWithManufacturer;
        const { bambooHarvest } = requestWithManufacturer;
        const manufacturerDataId =
          requestWithManufacturer.manufacturerDataId || "";

        // Log the manufacturer data link if provided
        if (manufacturerDataId) {
          this.log.info(
            `Linking bamboo harvest ${bambooHarvest.id} with manufacturer data ${manufacturerDataId}`,
          );
        }

        // Create an extended version with Fabric-specific fields
        const fabricBambooHarvest: IFabricBambooHarvest = {
          ...bambooHarvest,
          harvestDate: bambooHarvest.startedAt || new Date().toISOString(),
          manufacturerId: bambooHarvest.harvester || "unknown",
          quantity: "100", // Default quantity
          bambooType: "Premium", // Default type
          quality: "A", // Default quality
          manufacturerDataId, // Add the manufacturer data ID
          // Always ensure privateNotes is set
          privateNotes: manufacturerDataId
            ? `This bamboo harvest is linked to manufacturer data ID: ${manufacturerDataId}. Processing date: ${new Date().toISOString()}`
            : "Standard bamboo harvest without manufacturer data link",
        };

        try {
          // First, insert the basic record (for customer view)
          const basicRequest: RunTransactionRequest = {
            signingCredential: {
              keychainId: this.keychainId,
              keychainRef: fabricIdentity,
            },
            channelName: "mychannel",
            contractName: this.chaincodeId,
            invocationType: FabricContractInvocationType.Send,
            methodName: "InsertRecord",
            params: [
              fabricBambooHarvest.id,
              fabricBambooHarvest.location || "unknown",
              "100", // Default acreage value
              (fabricBambooHarvest.quantity || "100").toString(), // bambooCount
              fabricBambooHarvest.harvestDate || new Date().toISOString(), // harvestTime
            ],
          };

          // Execute insertion of basic record
          this.log.debug(
            `${tag} Inserting basic bamboo harvest record (public data)...`,
          );
          await this.opts.fabricApi.runTransactionV1(basicRequest);
          this.log.debug(`${tag} Basic record inserted successfully.`);

          // Add detailed debug logging
          this.log.info(`${tag} Manufacturer Data Linking Information:
            - Manufacturer Data ID: ${fabricBambooHarvest.manufacturerDataId || "None provided"}
            - Private Notes: ${fabricBambooHarvest.privateNotes || "None provided"}
            - Bamboo Harvest ID: ${fabricBambooHarvest.id}
          `);

          // Create a combined manufacturer reference - this is critical for proper linking
          let manufacturerReference =
            fabricBambooHarvest.manufacturerDataId || "";

          // Check if we need to include private notes in the reference
          if (fabricBambooHarvest.privateNotes) {
            // If we have a manufacturer ID, combine them with delimiter
            if (manufacturerReference) {
              manufacturerReference = `${manufacturerReference}::${fabricBambooHarvest.privateNotes}`;
            } else {
              // Otherwise just use the private notes
              manufacturerReference = fabricBambooHarvest.privateNotes;
            }
          }

          // Add debug logging for the final reference
          this.log.debug(
            `${tag} Final manufacturer reference for enhanced record: ${manufacturerReference}`,
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
            methodName: "InsertEnhancedRecord",
            params: [
              fabricBambooHarvest.id,
              manufacturerReference, // Use the combined reference
              fabricBambooHarvest.location || "unknown",
              "100", // Default acreage value
              (fabricBambooHarvest.quantity || "100").toString(), // bambooCount
              fabricBambooHarvest.harvestDate || new Date().toISOString(), // harvestTime
              "500", // Default price
            ],
          };

          // Execute insertion of enhanced record
          this.log.debug(
            `${tag} Inserting enhanced bamboo harvest record (private data)...`,
          );
          const result =
            await this.opts.fabricApi.runTransactionV1(enhancedRequest);
          this.log.debug(`${tag} Enhanced record inserted successfully.`);

          // Add additional logging for transaction results
          this.log.debug(`${tag} Transaction result:`, {
            transactionId: result.data.transactionId || "",
            functionOutput: result.data.functionOutput,
          });

          const body = {
            success: true,
            transactionId: result.data.transactionId || "",
            functionOutput: result.data.functionOutput,
            manufacturerDataLinked: !!manufacturerReference, // Indicate if a link was created
            publicDataInserted: true, // Flag to indicate public data was also inserted
            manufacturerReference, // Include the reference in the response
          };
          return res.status(200).json(body);
        } catch (contractErr: unknown) {
          const errStr = safeStringifyException(contractErr);
          this.log.error(`${tag} Contract invocation failed:`, contractErr);
          return res.status(500).json({
            error: "Failed to insert bamboo harvest record",
            detail: errStr,
          });
        }
      } else {
        // If we get here, it's either a GET request (which this endpoint doesn't handle),
        // or a non-GET request from a non-manufacturer that slipped through the checks above
        return res.status(405).json({
          error: "Method not allowed",
          detail:
            "This endpoint only supports POST requests from manufacturers",
        });
      }
    } catch (ex: unknown) {
      const exStr = safeStringifyException(ex);
      this.log.debug(`${tag} Failed to serve request:`, ex);
      return res.status(500).json({ error: exStr });
    }
  }
}
