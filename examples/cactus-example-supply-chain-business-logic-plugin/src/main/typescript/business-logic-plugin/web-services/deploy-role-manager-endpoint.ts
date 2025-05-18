import { Express, Request, Response } from "express";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
  safeStringifyException,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { verifyMessage } from "ethers";
import { v4 as uuidv4 } from "uuid";
import {
  DefaultApi as EthereumApi,
  Web3SigningCredentialType,
  InvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

// Define interface for infrastructure that provides access to the RoleManager contract
export interface IInfrastructureWithRoleManagerAccess {
  getRoleManagerContractInfo(walletAddress: string): Promise<{
    contractAddress: string;
    abi: any;
    contractName: string;
  }>;
}

export interface IDeployRoleManagerEndpointOptions {
  logLevel?: LogLevelDesc;
  backend: IInfrastructureWithRoleManagerAccess;
  ethereumApi?: EthereumApi; // Added Ethereum API client
}

export class DeployRoleManagerEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployRoleManagerEndpoint";
  private readonly log: Logger;
  private readonly backend: IInfrastructureWithRoleManagerAccess;
  private readonly ethereumApi: EthereumApi | undefined;

  constructor(public readonly options: IDeployRoleManagerEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.backend, `${fnTag} arg options.backend`);

    const level = options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.backend = options.backend;
    this.ethereumApi = options.ethereumApi;

    this.log.info(
      `Initialized ${this.className} with Cacti Ethereum connector: ${!!this.ethereumApi}`,
    );
  }

  public get className(): string {
    return DeployRoleManagerEndpoint.CLASS_NAME;
  }

  public getPath(): string {
    return "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/deploy-role-manager";
  }

  public getVerbLowerCase(): string {
    return "post";
  }

  public getOperationId(): string {
    return "interactWithRoleManager";
  }

  public async registerExpress(app: Express): Promise<IWebServiceEndpoint> {
    registerWebServiceEndpoint(app, this);
    app.get(this.getPath(), this.handleGetRequest.bind(this));
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: false,
        requiredRoles: [],
      }),
    };
  }

  private async verifyWalletSignature(
    address: string,
    signature: string,
    message: string,
  ): Promise<boolean> {
    try {
      const originalMessage = message.replace(/\|/g, "\n");
      const recoveredAddress = verifyMessage(originalMessage, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      this.log.error(`Signature verification failed: ${error}`);
      return false;
    }
  }

  public async handleGetRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.className}#handleGetRequest()`;
    try {
      this.log.debug(`${tag} req.query=%o`, req.query);

      const walletAddress =
        (req.headers["x-wallet-address"] as string) ||
        (req.query.walletAddress as string) ||
        "0x6f005BC8541B5216d9eD80A1F1921eFff0B30A7E";

      const signature = req.headers["x-signature"] as string;
      const message = req.headers["x-message"] as string;

      if (signature && message) {
        const isSignatureValid = await this.verifyWalletSignature(
          walletAddress,
          signature,
          message,
        );

        if (!isSignatureValid) {
          this.log.warn(
            `${tag} Invalid signature for wallet: ${walletAddress}`,
          );
        }
      }

      const contractInfo =
        await this.backend.getRoleManagerContractInfo(walletAddress);

      res.status(200).json({
        success: true,
        contractAddress: contractInfo.contractAddress,
        contractName: contractInfo.contractName,
        abi: contractInfo.abi,
        message: "RoleManager contract info retrieved successfully",
      });
    } catch (ex: unknown) {
      const exStr = safeStringifyException(ex);
      this.log.error(`${tag} failed to handle request`, ex);
      res.status(500).json({
        error: exStr,
      });
    }
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.className}#handleRequest()`;
    try {
      this.log.debug(`${tag} req.body=%o`, req.body);

      const walletAddress =
        (req.headers["x-wallet-address"] as string) ||
        "0x6f005BC8541B5216d9eD80A1F1921eFff0B30A7E";

      const signature = req.headers["x-signature"] as string;
      const message = req.headers["x-message"] as string;

      if (signature && message) {
        const isSignatureValid = await this.verifyWalletSignature(
          walletAddress,
          signature,
          message,
        );

        if (!isSignatureValid) {
          this.log.warn(
            `${tag} Invalid signature for wallet: ${walletAddress}`,
          );
        }
      }

      const contractInfo =
        await this.backend.getRoleManagerContractInfo(walletAddress);

      res.status(200).json(contractInfo);
    } catch (error) {
      this.log.error(`${tag} - Failed to handle request: ${error}`);
      res.status(500).json({
        error: "Failed to process request",
        message: safeStringifyException(error),
      });
    }
  }
}
