import {
  Checks,
  type IAsyncProvider,
  type Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import type {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import type { Express, Request, Response } from "express";
import type { IRequestOptions } from "../../core/types";
import OAS from "../../../json/openapi-blo-bundled.json";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

export class IntegrationsEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "IntegrationsEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return IntegrationsEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations"] {
    return OAS.paths[
      "/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations"
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
      OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations"];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths["/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations"];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations"
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
      const result = await this.options.dispatcher.getIntegrations();
      res.json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to ping:`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
