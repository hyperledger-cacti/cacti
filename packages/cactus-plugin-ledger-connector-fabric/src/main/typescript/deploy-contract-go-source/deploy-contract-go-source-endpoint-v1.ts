import { Express, Request, Response } from "express";
import HttpStatus from "http-status-codes";
import sanitizeFilename from "sanitize-filename";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import { PluginLedgerConnectorFabric } from "../plugin-ledger-connector-fabric";
import { DeployContractGoSourceV1Request } from "../generated/openapi/typescript-axios/index";
import OAS from "../../json/openapi.json";

export interface IDeployContractGoSourceEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorFabric;
}

export class DeployContractGoSourceEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractGoSourceEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return DeployContractGoSourceEndpointV1.CLASS_NAME;
  }

  constructor(public readonly opts: IDeployContractGoSourceEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.connector, `${fnTag} arg options.connector`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/deploy-contract-go-source"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/deploy-contract-go-source"
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

  /**
   * Important: This function mutates the input object in an attempt to sanitize
   * the user provided data in case it was malicious.
   *
   *
   * @param reqBody The HTTP request body that will have it's filenames and
   * filepaths mutated if they contain invalid/unsafe user input. The passed
   * in object will have it's values updated once the function has returned.
   */
  protected async sanitizeFilenamesInRequest(
    reqBody: DeployContractGoSourceV1Request,
  ): Promise<void> {
    reqBody.goSource.filename = sanitizeFilename(reqBody.goSource.filename);
    if (reqBody.goSource.filepath) {
      reqBody.goSource.filepath = sanitizeFilename(reqBody.goSource.filepath);
    }
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    const reqTag = `${verbUpper} ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      const { connector } = this.opts;
      const reqBody = req.body as DeployContractGoSourceV1Request;
      await this.sanitizeFilenamesInRequest(reqBody);
      const resBody = await connector.deployContractGoSourceV1(reqBody);
      res.status(HttpStatus.OK);
      res.json(resBody);
    } catch (ex) {
      const errorMsg = `${fnTag} request handler fn crashed for: ${reqTag}`;
      await handleRestEndpointException({
        errorMsg,
        log: this.log,
        error: ex,
        res,
      });
    }
  }
}
