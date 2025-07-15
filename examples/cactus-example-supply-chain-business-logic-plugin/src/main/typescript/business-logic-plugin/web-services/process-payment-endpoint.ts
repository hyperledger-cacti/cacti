import type { Express, Request, Response } from "express";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
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

import OAS from "../../../json/openapi.json";
import { SupplyChainCactusPlugin } from "../supply-chain-cactus-plugin";
import { verifySignature } from "./common";

export interface ProcessPaymentRequest {
  paymentId: number;
  transactionReference: string;
  walletAddress: string;
  signature: string;
  message: string;
  bookshelfId?: string;
  paymentAmount?: string;
}

export interface ProcessPaymentResponse {
  success: boolean;
  error?: string;
  transactionDetails?: {
    paymentId: number;
    transactionReference: string;
    bookshelfId?: string;
    status: string;
    timestamp: string;
  };
}

export interface IProcessPaymentEndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: SupplyChainCactusPlugin;
  fabricApi?: FabricApi;
  keychainId?: string;
  chaincodeId?: string;
}

export class ProcessPaymentEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ProcessPaymentEndpoint";
  private readonly log: Logger;
  private readonly fabricApi?: FabricApi;
  private readonly keychainId?: string;
  private readonly chaincodeId?: string;

  constructor(public readonly options: IProcessPaymentEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.plugin, `${fnTag} arg options.plugin`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.fabricApi = options.fabricApi;
    this.keychainId = options.keychainId;
    this.chaincodeId = options.chaincodeId;
  }

  public get className(): string {
    return ProcessPaymentEndpoint.CLASS_NAME;
  }

  public getPath(): string {
    return "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/process-payment";
  }

  public getVerbLowerCase(): string {
    return "post";
  }

  public getOperationId(): string {
    return "processPayment";
  }

  public getAuthorizationOptionsProvider() {
    return {
      get: async () => ({
        isProtected: false,
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
   * Process payment for a specific payment ID
   * This endpoint now only processes payments without updating status
   */
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    this.log.debug(`${reqTag} - START`);

    try {
      const {
        paymentId,
        transactionReference,
        walletAddress,
        signature,
        message,
        bookshelfId,
        paymentAmount,
      } = req.body as ProcessPaymentRequest;

      // Verify the signature
      const isValidSignature = await verifySignature(
        walletAddress,
        signature,
        message,
      );
      if (!isValidSignature) {
        res.status(401).json({
          success: false,
          error: "Invalid signature",
        });
        return;
      }

      // Validate inputs
      if (!paymentId || paymentId <= 0 || !transactionReference) {
        res.status(400).json({
          success: false,
          error: "Missing required parameters",
        });
        return;
      }

      try {
        // Process payment using the plugin's Ethereum service
        await this.options.plugin.processPayment(
          paymentId,
          transactionReference,
          walletAddress,
        );

        // Return successful response with transaction details
        res.status(200).json({
          success: true,
          transactionDetails: {
            paymentId,
            transactionReference,
            bookshelfId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        this.log.error(`Error processing payment: ${error}`);
        res.status(500).json({
          success: false,
          error: `Failed to process payment: ${safeStringifyException(error)}`,
        });
      }
    } catch (ex) {
      this.log.error(`Uncaught exception: ${safeStringifyException(ex)}`);
      res.status(500).json({
        success: false,
        error: `Internal Server Error: ${safeStringifyException(ex)}`,
      });
    }

    this.log.debug(`${reqTag} - END`);
  }
}
