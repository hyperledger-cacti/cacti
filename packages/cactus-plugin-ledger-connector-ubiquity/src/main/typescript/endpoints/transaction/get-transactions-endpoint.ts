import type { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorUbiquity } from "../../plugin-ledger-connector-ubiquity";

import OAS from "../../../json/openapi.json";

export interface IGetTransactionsByAddressEndpointOptions {
  logLevel?: LogLevelDesc;
  ubiquity: PluginLedgerConnectorUbiquity;
}

export class GetTransactionsByAddressEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetTransactionsByAddressEndpointOptions";

  private readonly log: Logger;

  public get className(): string {
    return GetTransactionsByAddressEndpoint.CLASS_NAME;
  }

  constructor(
    public readonly options: IGetTransactionsByAddressEndpointOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.ubiquity, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getPath(): string {
    const apiPath =
      OAS.paths[
        "/api/v1/@hyperledger/cactus-plugin-ledger-connector-ubiquity/GetTransactionByAddress"
      ];
    return apiPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths[
        "/api/v1/@hyperledger/cactus-plugin-ledger-connector-ubiquity/GetTransactionByAddress"
      ];
    return apiPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/@hyperledger/cactus-plugin-ledger-connector-ubiquity/GetTransactionByAddress"
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
    try {
      await this.options.ubiquity.getTxsByAddress(
        req.body.protocol,
        req.body.network,
        req.body.address,
      );
      res.status(200).json("OK");
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
