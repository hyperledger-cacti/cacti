/**
 * @fileoverview SATP Gateway Status Endpoint
 *
 * This module provides the GET status endpoint for SATP gateway administration.
 * Allows clients to query the current status of SATP sessions, including
 * stage progression, transaction states, and error conditions. Essential for
 * monitoring and debugging SATP protocol operations.
 *
 * The endpoint provides:
 * - Session status and current stage information
 * - Transaction progress and state details
 * - Error conditions and recovery status
 * - Network and gateway identification
 * - Timestamp and sequence information
 *
 * @example
 * ```typescript
 * // GET /api/v1/@hyperledger/cactus-plugin-satp-hermes/status?sessionID=session-123
 * const response = await fetch('/api/v1/status', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ sessionID: 'session-123' })
 * });
 *
 * const status = await response.json();
 * console.log('Session stage:', status.stage);
 * console.log('Session status:', status.status);
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
} from "@hyperledger/cactus-core-api";
import {
  type Logger,
  Checks,
  LoggerProvider,
  type IAsyncProvider,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../../json/oapi-api1-bundled.json";
import type { IRequestOptions } from "../../core/types";
import type { StatusRequest } from "../../generated/gateway-client/typescript-axios/api";

/**
 * Web service endpoint for retrieving SATP session status information.
 *
 * Implements the GET /status endpoint that allows clients to query the current
 * status of SATP protocol sessions. Provides comprehensive session state
 * information including stage progression, transaction status, and error
 * conditions for monitoring and debugging purposes.
 *
 * Key features:
 * - Session status queries by session ID
 * - Stage and substage information
 * - Transaction progress tracking
 * - Error condition reporting
 * - RESTful HTTP endpoint integration
 *
 * @class GetStatusEndpointV1
 * @implements {IWebServiceEndpoint}
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const endpoint = new GetStatusEndpointV1({
 *   dispatcher: satpDispatcher,
 *   logLevel: 'debug'
 * });
 *
 * // Register with Express app
 * await endpoint.registerExpress(app);
 *
 * // Endpoint will handle GET requests to /api/v1/status
 * ```
 */
export class GetStatusEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetStatusEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return GetStatusEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getPath(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/status"];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/status"];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/status"]
      .get.operationId;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
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

  // TODO discover way to inherit OAS schema and have request types here
  // parameter checks should be enforced by the type system
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      const sessionId = req.query.SessionID as string;
      if (!sessionId) {
        res
          .status(400)
          .json({ message: "SessionID query parameter is required." });
        return;
      }
      const statusRequest: StatusRequest = {
        sessionID: sessionId,
      };
      const result = await this.options.dispatcher.GetStatus(statusRequest);
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
