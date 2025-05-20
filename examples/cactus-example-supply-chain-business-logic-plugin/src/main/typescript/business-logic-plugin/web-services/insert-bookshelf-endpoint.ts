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
  InsertBookshelfRequest,
  Bookshelf,
} from "../../generated/openapi/typescript-axios/index";

// Extended interface with fields needed for Fabric chaincode
interface IFabricBookshelf extends Bookshelf {
  name?: string;
  width?: number | string;
  height?: number | string;
  depth?: number | string;
  material?: string;
  price?: number | string;
}

export interface IInsertBookshelfEndpointOptions {
  logLevel?: LogLevelDesc;
  fabricApi: FabricApi;
  ethereumApi?: EthereumApi; // Add Ethereum API
  keychainId: string;
  chaincodeId: string;
  roleManagerAddress?: string;
  sepoliaProvider?: string;
  authorizationOptionsProvider?: AuthorizationOptionsProvider;
}

const K_DEFAULT_AUTHORIZATION_OPTIONS: IEndpointAuthzOptions = {
  isProtected: true,
  requiredRoles: [],
};

export class InsertBookshelfEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "InsertBookshelfEndpoint";

  private readonly log: Logger;
  private readonly keychainId: string;
  private readonly chaincodeId: string;
  private readonly ethereumApi: EthereumApi | undefined;
  private readonly authorizationOptionsProvider: AuthorizationOptionsProvider;

  public get className(): string {
    return InsertBookshelfEndpoint.CLASS_NAME;
  }
  constructor(public readonly opts: IInsertBookshelfEndpointOptions) {
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

    this.authorizationOptionsProvider =
      opts.authorizationOptionsProvider ||
      AuthorizationOptionsProvider.of(K_DEFAULT_AUTHORIZATION_OPTIONS, level);

    this.log.debug(`Instantiated ${this.className} OK`);
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-bookshelf"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-bookshelf"
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

  async handleRequest(req: Request, res: Response): Promise<Response> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      // Authentication section - check wallet signature
      const walletAddress = req.headers["x-wallet-address"] as string;
      const signature = req.headers["x-signature"] as string;
      const message = req.headers["x-message"] as string;

      // Default to manufacturer identity
      let fabricIdentity = "user2";
      let mspId = "Org2MSP";

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
        this.log.info(`${tag} Wallet signature verified for: ${walletAddress}`);
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
          detail: "Only manufacturers can create bookshelf records",
        });
      }

      // Use the fabric identity from role check
      fabricIdentity = roleCheck.fabricIdentity;
      mspId = roleCheck.mspId;

      this.log.info(
        `Using Fabric identity from role check: ${fabricIdentity}, MSP: ${mspId}`,
      );

      // Transaction section - now using Fabric
      const { bookshelf } = req.body as InsertBookshelfRequest;
      this.log.debug(`${tag} Bookshelf data:`, bookshelf);

      // Create an extended version with Fabric-specific fields
      const fabricBookshelf: IFabricBookshelf = {
        ...bookshelf,
        name: `Bookshelf-${bookshelf.id}`, // Default name based on ID
        width: "60", // Default width in cm
        height: "180", // Default height in cm
        depth: "30", // Default depth in cm
        material: "Bamboo", // Default material
        price: "199.99", // Default price
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
            fabricBookshelf.id,
            fabricBookshelf.name || `Bookshelf-${fabricBookshelf.id}`,
            (fabricBookshelf.shelfCount || 1).toString(),
            fabricBookshelf.bambooHarvestId || "",
          ],
        };

        // Execute insertion of basic record
        this.log.debug(
          `${tag} Inserting basic bookshelf record (public data)...`,
        );
        await this.opts.fabricApi.runTransactionV1(basicRequest);
        this.log.debug(`${tag} Basic record inserted successfully.`);

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
            fabricBookshelf.id,
            fabricBookshelf.name || `Bookshelf-${fabricBookshelf.id}`,
            (fabricBookshelf.shelfCount || 1).toString(),
            fabricBookshelf.bambooHarvestId || "",
            (fabricBookshelf.width || "60").toString(),
            (fabricBookshelf.height || "180").toString(),
            (fabricBookshelf.depth || "30").toString(),
            fabricBookshelf.material || "Bamboo",
            (fabricBookshelf.price || "199.99").toString(),
          ],
        };

        // Execute insertion of enhanced record
        this.log.debug(
          `${tag} Inserting enhanced bookshelf record (private data)...`,
        );
        const result =
          await this.opts.fabricApi.runTransactionV1(enhancedRequest);
        this.log.debug(`${tag} Enhanced record inserted successfully.`);

        const body = {
          transactionId: result.data.transactionId || "",
          functionOutput: result.data.functionOutput,
          publicDataInserted: true, // Flag to indicate public data was also inserted
        };
        return res.status(200).json(body);
      } catch (contractErr: unknown) {
        const errStr = safeStringifyException(contractErr);
        this.log.error(`${tag} Contract invocation failed:`, contractErr);
        return res.status(500).json({
          error: "Failed to insert bookshelf record",
          detail: errStr,
        });
      }
    } catch (ex: unknown) {
      const exStr = safeStringifyException(ex);
      this.log.debug(`${tag} Failed to serve request:`, ex);
      return res.status(500).json({ error: exStr });
    }
  }
}
