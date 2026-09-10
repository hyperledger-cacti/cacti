/**
 * @fileoverview SATP Gateway Session Proofs Endpoint
 *
 * This module provides the web service endpoint for retrieving the
 * signature-verified SessionProofs persisted in the audit database for SATP
 * sessions.
 *
 * The endpoint provides:
 * - Retrieval of SessionProofs by session ID
 * - Evidence lookup for dispute resolution and audit
 * - Administrative oversight of recorded protocol claims
 *
 * @example
 * ```typescript
 * import { GetSessionProofsEndpointV1 } from './get-session-proofs-endpoint';
 *
 * const endpoint = new GetSessionProofsEndpointV1({
 *   logLevel: 'info',
 *   instanceId: 'gateway-001'
 * });
 *
 * // Register with Express app
 * await endpoint.registerExpress(app);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt}
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

import createHttpError from "http-errors";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core";

import OAS from "../../../json/oapi-api1-bundled.json";
import type { IRequestOptions } from "../../core/types";

const OAS_PATH = "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/proofs";

/**
 * Web service endpoint for SATP session proofs retrieval.
 *
 * Provides HTTP endpoint handling for querying the signature-verified
 * SessionProofs recorded in the audit database, keyed by SATP session ID.
 *
 * @implements IWebServiceEndpoint
 * @since 0.0.3-beta
 */
export class GetSessionProofsEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetSessionProofsEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return GetSessionProofsEndpointV1.CLASS_NAME;
  }

  /**
   * Creates a new session proofs endpoint instance.
   *
   * @param options - Configuration options for the endpoint
   * @throws Error if required options are missing
   * @since 0.0.3-beta
   */
  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.dispatcher`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  /**
   * Get the HTTP path for the session proofs endpoint.
   *
   * @returns HTTP path string for the session proofs endpoint
   * @since 0.0.3-beta
   */
  public getPath(): string {
    const apiPath = OAS.paths[OAS_PATH];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  /**
   * Get the HTTP verb for the session proofs endpoint.
   *
   * @returns HTTP verb in lowercase (e.g. 'get')
   * @since 0.0.3-beta
   */
  public getVerbLowerCase(): string {
    const apiPath = OAS.paths[OAS_PATH];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  /**
   * Get the OpenAPI operation ID for the session proofs endpoint.
   *
   * @returns The unique operation identifier from the OpenAPI specification
   * @since 0.0.3-beta
   */
  public getOperationId(): string {
    return OAS.paths[OAS_PATH].get.operationId;
  }

  /**
   * Get authorization options for the session proofs endpoint.
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
   * Register the session proofs endpoint with an Express application.
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
   * Get the Express request handler for the session proofs endpoint.
   *
   * @returns Express request handler function
   * @since 0.0.3-beta
   */
  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  /**
   * Handle HTTP requests for session proofs.
   *
   * Parses the comma-separated `sessionIds` query parameter and delegates to
   * the dispatcher for proof retrieval. Returns the matching proofs or an
   * error response.
   *
   * @param req - Express request object with query parameters
   * @param res - Express response object for sending results
   * @since 0.0.3-beta
   */
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);

    try {
      const rawSessionIds = req.query["sessionIds"];

      if (typeof rawSessionIds !== "string" || rawSessionIds.trim() === "") {
        throw createHttpError(
          400,
          "sessionIds query parameter is required (comma-separated list of session IDs)",
        );
      }

      const sessionIds = rawSessionIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "");

      if (sessionIds.length === 0) {
        throw createHttpError(400, "sessionIds must contain at least one ID");
      }

      const result = await this.options.dispatcher.GetSessionProofs(sessionIds);

      res.status(200).json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} Failed to get session proofs:`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
