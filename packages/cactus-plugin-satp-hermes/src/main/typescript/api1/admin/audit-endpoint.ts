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

import OAS from "../../../json/openapi-blo-bundled.json";
import type { IRequestOptions } from "../../core/types";
import { AuditRequest } from "../../public-api";

export class AuditEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "AuditEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return AuditEndpointV1.CLASS_NAME;
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
      OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/audit"];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/audit"];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/audit"].get
      .operationId;
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
