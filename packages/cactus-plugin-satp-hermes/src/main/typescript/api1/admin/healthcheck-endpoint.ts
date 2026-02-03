/**
 * @fileoverview SATP Gateway Health Check Endpoint
 *
 * This module provides the health check endpoint for SATP gateway monitoring
 * and availability verification. Used by load balancers, monitoring systems,
 * and operational tools to determine gateway health status and service
 * availability for high-availability deployments.
 *
 * The health check verifies:
 * - Gateway service availability
 * - Database connectivity status
 * - SATP manager initialization
 * - Cross-chain connection health
 * - Resource availability and limits
 *
 * @example
 * ```typescript
 * // GET /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck
 * const response = await fetch('/api/v1/healthcheck', {
 *   method: 'GET'
 * });
 *
 * const health = await response.json();
 * if (health.status === 'OK') {
 *   console.log('Gateway is healthy');
 * }
 * ```
 *
 * @see {@link https://microservices.io/patterns/observability/health-check-api.html} Health Check API Pattern
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import {
  Checks,
  type IAsyncProvider,
  type Logger,
  LoggerProvider,
} from "@hyperledger-cacti/cactus-common";
import type {
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

/**
 * Web service endpoint for SATP gateway health monitoring.
 *
 * Implements the GET /healthcheck endpoint that provides gateway health
 * status information for monitoring systems, load balancers, and operational
 * tools. Performs comprehensive health checks of gateway components and
 * returns standardized health status responses.
 *
 * Health check components:
 * - Service availability verification
 * - Database connection testing
 * - SATP manager status validation
 * - Resource utilization monitoring
 * - Cross-chain connectivity verification
 *
 * @class HealthCheckEndpointV1
 * @implements {IWebServiceEndpoint}
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const healthEndpoint = new HealthCheckEndpointV1({
 *   dispatcher: satpDispatcher,
 *   logLevel: 'info'
 * });
 *
 * // Register with Express application
 * await healthEndpoint.registerExpress(app);
 *
 * // Health checks available at GET /api/v1/healthcheck
 * ```
 */
export class HealthCheckEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "HealthCheckEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return HealthCheckEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck"] {
    return OAS.paths[
      "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck"
    ];
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getPath(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck"];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck"];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck"
    ].get.operationId;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
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
    this.log.debug(reqTag);

    try {
      const result = await this.options.dispatcher.healthCheck();
      res.json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to ping:`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
