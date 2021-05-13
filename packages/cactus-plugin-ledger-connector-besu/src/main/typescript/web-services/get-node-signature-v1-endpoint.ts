import { Express, Request, Response } from "express";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import { GetNodeSignatureRequest } from "../generated/openapi/typescript-axios/api";

import { PluginLedgerConnectorBesu } from "../plugin-ledger-connector-besu";
import OAS from "../../json/openapi.json";

export interface IBesuGetNodeSignatureOptions {
  connector: PluginLedgerConnectorBesu;
  logLevel?: LogLevelDesc;
}

export class BesuGetNodeSignatureV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: IBesuGetNodeSignatureOptions) {
    const fnTag = "BesuGetNodeSignatureV1#constructor()";

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);

    const label = "besu-get-node-signature-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
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

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-node-signature"
    ];
  }

  getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.path;
  }

  getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().post.operationId;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    //TODO
    const fnTag = "BesuGetNodeSignatureV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      const request: GetNodeSignatureRequest = req.body as GetNodeSignatureRequest;

      const trxResponse = await this.options.connector.getNodeSignature(
        request,
      );

      this.log.info("THIS TX:");

      if (trxResponse.isPresent()) {
        res.status(200);
        res.json(trxResponse.get());
      } else {
        this.log.error(`${fnTag} failed to find the transaction`);
        res.status(404);
        res.statusMessage = "Transaction not found";
        res.json({ error: "Transaction not found" });
      }
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
