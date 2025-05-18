import { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  safeStringifyException,
  Strings,
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

export interface IListShipmentEndpointOptions {
  readonly logLevel?: LogLevelDesc;
  readonly fabricApi: FabricApi;
  readonly ethereumApi?: EthereumApi;
  readonly keychainId: string;
  readonly chaincodeId: string;
  readonly roleManagerAddress?: string;
  readonly sepoliaProvider?: string;
}

export class ListShipmentEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ListShipmentEndpoint";
  private readonly log: Logger;
  private readonly keychainId: string;
  private readonly chaincodeId: string;
  private readonly roleManagerAddress: string;
  private readonly ethereumApi: EthereumApi | undefined;

  public get className(): string {
    return ListShipmentEndpoint.CLASS_NAME;
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-shipment"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-shipment"
    ];
  }

  getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().get.operationId;
  }

  constructor(public readonly opts: IListShipmentEndpointOptions) {
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

  async handleRequest(req: Request, res: Response): Promise<Response> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      this.log.debug(`${tag}`);

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
            "You must have either a manufacturer or customer role to view shipment data",
        });
      }

      // Use the role check results
      const fabricIdentity = roleCheck.fabricIdentity;
      const mspId = roleCheck.mspId;
      // Determine access level based on role
      const isPublicDataOnly = !roleCheck.isManufacturer;

      this.log.info(
        `${tag} Using identity: ${fabricIdentity}, MSP: ${mspId}, publicDataOnly: ${isPublicDataOnly}`,
      );

      // Add debug logging for transaction request
      this.log.debug(`${tag} Executing Fabric transaction with:`, {
        keychainId: this.keychainId,
        fabricIdentity,
        channelName: "mychannel",
        contractName: this.chaincodeId,
      });

      // Choose the correct method based on role
      const methodName = isPublicDataOnly
        ? "GetListShipment"
        : "GetAllEnhancedShipments";

      this.log.info(
        `Using chaincode method ${methodName} based on user role (manufacturer: ${!isPublicDataOnly})`,
      );

      // Execute the Fabric transaction
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

      try {
        const {
          data: { functionOutput: fnOutJsonRaw },
        } = await this.opts.fabricApi.runTransactionV1(request);

        // Handle the response
        const fnOutJson = Strings.isNonBlank(fnOutJsonRaw)
          ? fnOutJsonRaw
          : "[]";
        const output = JSON.parse(fnOutJson);

        this.log.debug("Parsed chaincode response:", output);

        const body = { data: output };
        return res.status(200).json(body);
      } catch (error) {
        this.log.error(`${tag} Transaction error:`, error);
        return res.status(500).json({
          error: "Processing error",
          detail: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (ex: unknown) {
      const exStr = safeStringifyException(ex);
      this.log.error(`${tag} Failed to serve request:`, ex);
      return res.status(500).json({ error: exStr });
    }
  }
}
