/**
 * @fileoverview SATP Gateway Inbound Webhook Decision Endpoint
 *
 * This module provides the POST endpoint for receiving inbound webhook decisions
 * from external approval controllers. External systems (compliance, manual review,
 * policy enforcement) use this endpoint to approve or reject paused SATP transfers.
 *
 * The endpoint provides:
 * - Decision submission for paused SATP sessions
 * - Adapter validation and session state verification
 * - Audit logging of decision justifications
 * - Resume or abort trigger for the SATP protocol
 *
 * @example
 * ```typescript
 * // POST /api/v1/@hyperledger/cactus-plugin-satp-hermes/webhook/inbound/decide
 * const response = await fetch('/api/v1/webhook/inbound/decide', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     adapterId: 'compliance-check',
 *     sessionId: 'session-123',
 *     continue: true,
 *     reason: 'Transfer approved after KYC verification'
 *   })
 * });
 *
 * const result = await response.json();
 * console.log('Decision accepted:', result.accepted);
 * ```
 *
 * @see {@link InboundWebhookDecisionResponse} for TypeScript decision type
 * @see {@link AdapterManager} for decision processing
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

import {
  registerWebServiceEndpoint,
  handleRestEndpointException,
} from "@hyperledger/cactus-core";

import OAS from "../../../json/oapi-api1-bundled.json";
import type { IRequestOptions } from "../../core/types";
import type { DecideInboundWebhookRequest } from "../../generated/gateway-client/typescript-axios/api";

/**
 * Web service endpoint for receiving inbound webhook decisions.
 *
 * Implements the POST /webhook/inbound/decide endpoint that allows external
 * approval controllers to submit decisions (approve/reject) for paused SATP
 * transfers. The endpoint validates the adapterId and sessionId match an
 * active waiting state, then triggers resume or abort.
 *
 * Key features:
 * - Decision submission and validation
 * - Session state verification
 * - Audit logging with justifications
 * - Protocol resume/abort triggering
 * - RESTful HTTP endpoint integration
 *
 * @class DecideInboundWebhookEndpointV1
 * @implements {IWebServiceEndpoint}
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const endpoint = new DecideInboundWebhookEndpointV1({
 *   dispatcher: bloDispatcher,
 *   logLevel: 'debug'
 * });
 *
 * // Register with Express app
 * await endpoint.registerExpress(app);
 *
 * // Endpoint will handle POST requests to /api/v1/webhook/inbound/decide
 * ```
 */
export class DecideInboundWebhookEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DecideInboundWebhookEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return DecideInboundWebhookEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.dispatcher`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/@hyperledger/cactus-plugin-satp-hermes/webhook/inbound/decide"] {
    return OAS.paths[
      "/api/v1/@hyperledger/cactus-plugin-satp-hermes/webhook/inbound/decide"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
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

  /**
   * Handle POST requests to submit inbound webhook decisions.
   *
   * Validates the decision payload, verifies the adapter and session exist
   * in a waiting state, logs the decision with justification, and triggers
   * the appropriate action (resume or abort).
   *
   * @param req - Express request containing DecideInboundWebhookRequest body
   * @param res - Express response
   */
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(`${reqTag} - Processing inbound webhook decision`);

    try {
      const reqBody: DecideInboundWebhookRequest = req.body;

      // Validate required fields
      if (!reqBody.adapterId) {
        res.status(400).json({
          message: "Missing required field: adapterId",
          accepted: false,
        });
        return;
      }
      if (!reqBody.sessionId) {
        res.status(400).json({
          message: "Missing required field: sessionId",
          accepted: false,
        });
        return;
      }
      if (typeof reqBody.continue !== "boolean") {
        res.status(400).json({
          message:
            "Missing or invalid required field: continue (must be boolean)",
          accepted: false,
        });
        return;
      }

      this.log.info(
        `${fnTag} Received decision for adapter="${reqBody.adapterId}" session="${reqBody.sessionId}" continue=${reqBody.continue} reason="${reqBody.reason || "N/A"}"`,
      );

      // Delegate to dispatcher for processing
      const result =
        await this.options.dispatcher.decideInboundWebhook(reqBody);
      res.status(200).json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to process inbound webhook decision`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
