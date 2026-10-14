import type { Express, Request, Response } from "express";

import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger-cacti/cactus-core";

import OAS from "../../json/openapi.json";
import type { GetActiveContractsRequest } from "../generated/openapi/typescript-axios";
import type { PluginLedgerConnectorCanton } from "../plugin-ledger-connector-canton";
import { handleCantonEndpointError } from "./handle-canton-endpoint-error";

export interface IGetActiveContractsV1EndpointOptions {
  readonly connector: PluginLedgerConnectorCanton;
  readonly logLevel?: LogLevelDesc;
}

export class GetActiveContractsV1Endpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetActiveContractsV1Endpoint";

  private readonly log: Logger;

  public constructor(
    public readonly options: IGetActiveContractsV1EndpointOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);
    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: options.logLevel ?? "INFO",
    });
  }

  public get className(): string {
    return GetActiveContractsV1Endpoint.CLASS_NAME;
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-active-contracts"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-active-contracts"
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

  public getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: this.oasPath.post.security[0].bearerTokenAuth,
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
    try {
      const request = req.body as GetActiveContractsRequest;
      res.json(await this.options.connector.getActiveContracts(request));
    } catch (error: unknown) {
      handleCantonEndpointError({
        error,
        errorMsg: `${reqTag} failed`,
        log: this.log,
        res,
      });
    }
  }
}
