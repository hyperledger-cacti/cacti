import { Express, Request, Response } from "express";
import HttpStatus from "http-status-codes";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorPolkadot } from "../plugin-ledger-connector-polkadot";
import { DeployContractInkEndpoint as Constants } from "./deploy-contract-ink-endpoint-constants";

export interface IDeployContractInkOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorPolkadot;
}

export class DeployContractInkEndpoint implements IWebServiceEndpoint {
  private readonly log: Logger;
  public static readonly CLASS_NAME = "InvokeContractEndpoint";

  constructor(public readonly opts: IDeployContractInkOptions) {
    const fnTag = "RunTransactionEndpointV1#constructor()";

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.connector, `${fnTag} options.connector`);

    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: opts.logLevel || "INFO",
    });
  }

  public get className(): string {
    return DeployContractInkEndpoint.CLASS_NAME;
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

  public getPath(): string {
    return Constants.HTTP_PATH;
  }

  public getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
  }

  public getOperationId(): string {
    throw new Error("Method not implemented.");
  }

  public get oasPath(): string {
    throw new Error("Method not implemented.");
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "DeployContractInkEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);
    try {
      const message =
        `${this.opts.connector.className} does not support ` +
        ` contract deployment yet. This is a feature that is under ` +
        ` development for now. Stay tuned!`;
      const resBody = { message };
      // const reqBody = req.body as RunTransactionRequest;
      // const resBody = await this.opts.connector.transact(reqBody);
      // res.status(200);
      // res.json(resBody);
      res.status(HttpStatus.NOT_IMPLEMENTED);
      res.json(resBody);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex as string;
      res.json({ error: ex });
    }
  }
}
