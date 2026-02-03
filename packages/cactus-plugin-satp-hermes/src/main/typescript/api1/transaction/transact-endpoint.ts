/**
 * @fileoverview SATP Gateway Transaction Endpoint
 *
 * This module provides the web service endpoint for SATP transaction operations.
 * Handles HTTP requests for initiating, monitoring, and managing cross-chain
 * asset transfers following the IETF SATP protocol specification.
 *
 * The endpoint provides:
 * - Transaction initiation and processing
 * - Cross-chain asset transfer coordination
 * - Session management and state tracking
 * - Error handling and recovery
 * - Protocol compliance validation
 *
 * @example
 * ```typescript
 * import { TransactEndpointV1 } from './transact-endpoint';
 *
 * const endpoint = new TransactEndpointV1({
 *   logLevel: 'info',
 *   instanceId: 'transaction-gateway'
 * });
 *
 * // Register with Express app
 * await endpoint.registerExpress(app);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
} from "@hyperledger-cacti/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core-api";
import type { Express, Request, Response } from "express";
import type { IRequestOptions } from "../../core/types";
import OAS from "../../../json/openapi-blo-bundled.json";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core";
import { TransactRequest } from "../../generated/gateway-client/typescript-axios/api";
import { SATPInternalError } from "../../core/errors/satp-errors";
import { getEnumKeyByValue } from "../../services/utils";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";

/**
 * Web service endpoint for SATP transaction operations.
 *
 * Provides HTTP endpoint handling for transaction-related requests including
 * cross-chain asset transfers, session initiation, and state management.
 * Integrates with the OpenAPI specification for standardized API documentation.
 *
 * @implements IWebServiceEndpoint
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const transactEndpoint = new TransactEndpointV1({
 *   logLevel: 'debug',
 *   instanceId: 'transaction-service-001'
 * });
 *
 * // Register with Express application
 * await transactEndpoint.registerExpress(expressApp);
 *
 * // Endpoint available at POST /api/v1/satp/transact
 * ```
 */
export class TransactEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "TransactEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return TransactEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact"] {
    return OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact"];
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }
  getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }
  getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }
  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOperationId(): string {
    return OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/transact"]
      .post.operationId;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    const reqBody: TransactRequest = req.body;
    try {
      const result = await this.options.dispatcher.Transact(reqBody);
      res.json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to transact: ${getEnumKeyByValue(SATPErrorType, (ex as SATPInternalError).getSATPErrorType())}`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
