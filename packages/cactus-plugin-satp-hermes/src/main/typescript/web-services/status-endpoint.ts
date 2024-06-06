import type { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";
import {
  Logger,
  Checks,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../json/openapi-blo-bundled.json";
import { IRequestOptions } from "../core/types";
import { StatusRequest } from "../generated/gateway-client/typescript-axios/api";

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
