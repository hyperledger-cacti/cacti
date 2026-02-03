/**
 * @fileoverview SATP Gateway Audit Endpoint
 *
 * This module provides the web service endpoint for SATP audit operations.
 * Handles HTTP requests for audit data retrieval, transaction tracking, and
 * compliance reporting within the SATP gateway system.
 *
 * The endpoint provides:
 * - Session audit trail retrieval
 * - Transaction verification records
 * - Compliance reporting capabilities
 * - Audit log querying functionality
 * - Administrative oversight tools
 *
 * @example
 * ```typescript
 * import { AuditEndpointV1 } from './audit-endpoint';
 *
 * const endpoint = new AuditEndpointV1({
 *   logLevel: 'info',
 *   instanceId: 'gateway-001'
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

import type { Express, Request, Response } from "express";

import type {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger-cacti/cactus-core-api";
import {
  type Logger,
  Checks,
  LoggerProvider,
  type IAsyncProvider,
} from "@hyperledger-cacti/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger-cacti/cactus-core";

import OAS from "../../../json/openapi-blo-bundled.json";
import type { IRequestOptions } from "../../core/types";
import { AuditRequest } from "../../public-api";

/**
 * Web service endpoint for SATP audit operations.
 *
 * Provides HTTP endpoint handling for audit-related requests including
 * transaction history, session trails, and compliance reporting. Integrates
 * with the OpenAPI specification for standardized API documentation.
 *
 * @implements IWebServiceEndpoint
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const auditEndpoint = new AuditEndpointV1({
 *   logLevel: 'debug',
 *   instanceId: 'audit-service-001'
 * });
 *
 * // Register with Express application
 * await auditEndpoint.registerExpress(expressApp);
 *
 * // Endpoint available at POST /api/v1/satp/audit
 * ```
 */
export class AuditEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "AuditEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return AuditEndpointV1.CLASS_NAME;
  }

  /**
   * Creates a new audit endpoint instance.
   *
   * Initializes the endpoint with the provided configuration options
   * including logging level and dispatcher reference. Validates
   * required parameters and sets up internal logging.
   *
   * @param options - Configuration options for the endpoint
   * @throws Error if required options are missing
   * @since 0.0.3-beta
   */
  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  /**
   * Get the HTTP path for the audit endpoint.
   *
   * Retrieves the path from the OpenAPI specification for the audit
   * endpoint. Used by the Express framework for route registration.
   *
   * @returns HTTP path string for the audit endpoint
   * @since 0.0.3-beta
   */
  public getPath(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/audit"];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  /**
   * Get the HTTP verb for the audit endpoint.
   *
   * Retrieves the HTTP method from the OpenAPI specification.
   * Used for Express route registration and request validation.
   *
   * @returns HTTP verb in lowercase (e.g., 'get', 'post')
   * @since 0.0.3-beta
   */
  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/audit"];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  /**
   * Get the OpenAPI operation ID for the audit endpoint.
   *
   * Returns the unique operation identifier from the OpenAPI
   * specification used for documentation and client generation.
   *
   * @returns OpenAPI operation ID string
   * @since 0.0.3-beta
   */
  public getOperationId(): string {
    return OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/audit"].get
      .operationId;
  }

  /**
   * Get authorization options for the audit endpoint.
   *
   * Provides configuration for endpoint security including protection
   * status and required roles. Currently configured as protected endpoint
   * with no specific role requirements.
   *
   * @returns Promise resolving to authorization options
   * @todo Make this an injectable dependency in the constructor
   * @since 0.0.3-beta
   */
  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  /**
   * Register the audit endpoint with an Express application.
   *
   * Configures the endpoint routes and middleware for handling
   * audit requests. Uses the web service endpoint registration
   * utility for standardized setup.
   *
   * @param expressApp - Express application instance
   * @returns Promise resolving to the registered endpoint
   * @since 0.0.3-beta
   */
  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  /**
   * Get the Express request handler for the audit endpoint.
   *
   * Returns a bound method reference for handling HTTP requests.
   * Used by the Express framework for request processing.
   *
   * @returns Express request handler function
   * @since 0.0.3-beta
   */
  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  /**
   * Handle HTTP requests for audit operations.
   *
   * Processes audit requests by parsing query parameters for timestamp
   * ranges and delegating to the dispatcher for audit execution.
   * Returns audit results or error responses.
   *
   * @param req - Express request object with query parameters
   * @param res - Express response object for sending results
   * @todo Discover way to inherit OAS schema and have request types here
   * @todo Parameter checks should be enforced by the type system
   * @since 0.0.3-beta
   */
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      const parseTimestamp = (value: unknown): number | null => {
        if (typeof value === "string" || typeof value === "number") {
          const num = Number(value);
          return isNaN(num) ? null : num;
        }
        return null;
      };

      const auditRequest: AuditRequest = {
        startTimestamp: parseTimestamp(req.query["startTimestamp"]) || 0,
        endTimestamp: parseTimestamp(req.query["endTimestamp"]) || Date.now(),
      };

      const result = await this.options.dispatcher.PerformAudit(auditRequest);
      res.status(200).json(result);
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
