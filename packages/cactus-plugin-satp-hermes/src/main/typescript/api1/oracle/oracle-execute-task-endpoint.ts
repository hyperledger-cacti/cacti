// interfaces api1(http) with gateway. calls oracle-get-status

// todo load endpoints in the dispatcher

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

import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core";

import OAS from "../../../json/openapi-blo-bundled.json";
import type { IRequestOptions } from "../../core/types";
import { OracleExecuteRequest } from "../../public-api";

export class OracleExecuteTaskEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "OracleExecuteTaskEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return OracleExecuteTaskEndpointV1.CLASS_NAME;
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
      OAS.paths[
        "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/execute"
      ];
    return apiPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths[
        "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/execute"
      ];
    return apiPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/oracle/execute"
    ].post.operationId;
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

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);

    const reqBody: OracleExecuteRequest = req.body;
    this.log.debug("reqBody: ", reqBody);

    try {
      const result = await this.options.dispatcher.OracleExecuteTask(reqBody);
      res.status(200).json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} Failed to execute task:`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
