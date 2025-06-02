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
import { v4 as uuidv4 } from "uuid";

import OAS from "../../../json/openapi.json";
import { SupplyChainCactusPlugin } from "../supply-chain-cactus-plugin";
import { verifySignature } from "./common";

export interface CreatePaymentRequest {
  payerAddress: string;
  payeeAddress: string;
  amount: string;
  productId: string;
  productType: string; // "bookshelf" or "shipment"
  signature: string;
  message: string;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentId?: number;
  transactionHash?: string;
  error?: string;
}

export class CreatePaymentEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "CreatePaymentEndpoint";
  private readonly log: Logger;

  constructor(
    public readonly options: {
      logLevel?: LogLevelDesc;
      plugin: SupplyChainCactusPlugin;
    },
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.plugin, `${fnTag} arg options.plugin`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return CreatePaymentEndpoint.CLASS_NAME;
  }

  public getPath(): string {
    return "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/create-payment";
  }

  public getVerbLowerCase(): string {
    return "post";
  }

  public getOperationId(): string {
    return "createPayment";
  }

  public getAuthorizationOptionsProvider() {
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

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    this.log.debug(`${reqTag} - START`);

    try {
      // First try to get wallet info from headers (like other endpoints)
      const walletAddress = (req.headers["x-wallet-address"] as string) || null;
      const headerSignature = (req.headers["x-signature"] as string) || null;
      const headerMessage = (req.headers["x-message"] as string) || null;

      // Then extract from body
      const {
        payerAddress,
        payeeAddress,
        amount,
        productId,
        productType,
        signature: bodySignature,
        message: bodyMessage,
      } = req.body as CreatePaymentRequest;

      // Use header values if available, otherwise use body values
      const finalPayerAddress = walletAddress || payerAddress;
      const finalSignature = headerSignature || bodySignature;
      const finalMessage = headerMessage || bodyMessage;

      this.log.debug(
        `${reqTag} - Wallet address: ${finalPayerAddress || "None"}`,
      );
      this.log.debug(`${reqTag} - Has signature: ${!!finalSignature}`);
      this.log.debug(`${reqTag} - Has message: ${!!finalMessage}`);

      // Verify we have the necessary parameters
      if (!finalPayerAddress || !finalSignature || !finalMessage) {
        this.log.warn(`${reqTag} - Missing wallet authentication data`);
        res.status(401).json({
          success: false,
          error:
            "Missing wallet authentication data (address, signature, or message)",
        });
        return;
      }

      // Verify the signature
      const isValidSignature = await verifySignature(
        finalPayerAddress,
        finalSignature,
        finalMessage,
      );
      if (!isValidSignature) {
        this.log.warn(
          `${reqTag} - Invalid signature for wallet: ${finalPayerAddress}`,
        );
        res.status(401).json({
          success: false,
          error: "Invalid signature",
        });
        return;
      }

      // Validate other required inputs
      if (!payeeAddress || !amount || !productId || !productType) {
        res.status(400).json({
          success: false,
          error: "Missing required parameters",
        });
        return;
      }

      // Verify product type - add bamboo-harvest as a valid type
      const validProductTypes = ['bookshelf', 'shipment', 'bamboo-harvest', 'bamboo', 'bambooharvest'];
      if (!validProductTypes.includes(productType.toLowerCase())) {
        res.status(400).json({
          success: false,
          error: `Invalid product type, must be one of: ${validProductTypes.join(', ')}`,
        });
        return;
      }

      try {
        // Create payment using the plugin's Ethereum service
        const result = await this.options.plugin.createPayment(
          finalPayerAddress, // Use the validated payer address
          payeeAddress,
          amount,
          productId,
          productType,
        );

        // Return successful response with both payment ID and transaction hash
        res.status(200).json({
          success: true,
          paymentId: result.paymentId,
          transactionHash: result.transactionHash,
        });
      } catch (error) {
        this.log.error(`Error creating payment: ${error}`);
        res.status(500).json({
          success: false,
          error: `Failed to create payment: ${safeStringifyException(error)}`,
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
