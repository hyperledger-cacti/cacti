import { Express, Request, Response } from "express";
import { Config as SshConfig } from "node-ssh";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  Configuration,
} from "@hyperledger/cactus-core-api";

import {
  AuthorizationOptionsProvider,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { IEndpointAuthzOptions } from "@hyperledger/cactus-core-api";

import {
  DefaultApi,
  DeployContractJarsSuccessV1Response,
  DeployContractJarsV1Request,
} from "../generated/openapi/typescript-axios/api";

import OAS from "../../json/openapi.json";
import {
  PluginLedgerConnectorCorda,
  CordaVersion,
} from "../plugin-ledger-connector-corda";

export interface IDeployContractEndpointOptions {
  logLevel?: LogLevelDesc;
  sshConfigAdminShell: SshConfig;
  corDappsDir: string;
  cordaStartCmd?: string;
  cordaStopCmd?: string;
  authorizationOptionsProvider?: AuthorizationOptionsProvider;
  apiUrl?: string;
  cordaVersion?: CordaVersion;
  connector: PluginLedgerConnectorCorda;
}

const K_DEFAULT_AUTHORIZATION_OPTIONS: IEndpointAuthzOptions = {
  isProtected: true,
  requiredRoles: [],
};

export class DeployContractJarsEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractJarsEndpoint";

  private readonly log: Logger;
  private readonly authorizationOptionsProvider: AuthorizationOptionsProvider;
  private readonly apiUrl?: string;
  private readonly cordaVersion?: CordaVersion;

  public get className(): string {
    return DeployContractJarsEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IDeployContractEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.sshConfigAdminShell, `${fnTag} options.sshConfig`);

    const level = options.logLevel || "INFO";
    const label = "deploy-contract-jars-endpoint";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.authorizationOptionsProvider =
      options.authorizationOptionsProvider ||
      AuthorizationOptionsProvider.of(K_DEFAULT_AUTHORIZATION_OPTIONS, level);

    this.log.debug(`Instantiated ${this.className} OK`);
    this.apiUrl = options.apiUrl;
    this.cordaVersion = options.cordaVersion;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return this.authorizationOptionsProvider;
  }

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars"
    ];
  }

  /**
   * Returns the `operationId` that connects this endpoint to it's definition in
   * the openapi-spec.ts file.
   */
  public get operationId(): string {
    return this.oasPath.post.operationId;
  }

  /**
   * Returns the endpoint path to be used when installing the endpoint into the
   * API server of Cactus.
   */
  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;

    const verb = this.getVerbLowerCase();
    const thePath = this.getPath();
    this.log.debug(`${verb} ${thePath} handleRequest()`);

    if (this.cordaVersion === CordaVersion.CORDA_V5) {
      try {
        const resBody = await this.options.connector.deployContract();
        res.status(200);
        res.json(resBody);
      } catch (ex) {
        this.log.error(`${fnTag} failed to serve request`, ex);
        res.status(500);
        res.json({
          error: ex?.message,
          errorStack: ex?.stack,
        });
      }
    } else {
      try {
        if (this.apiUrl === undefined) throw "apiUrl option is necessary";
        const body = await this.callInternalContainer(req.body);
        res.status(200);
        res.json(body);
      } catch (ex) {
        this.log.error(`${fnTag} failed to serve request`, ex);
        res.status(500);
        res.json({
          error: ex?.message,
          // FIXME do not include stack trace
          errorStack: ex?.stack,
        });
      }
    }
  }

  async callInternalContainer(
    req: DeployContractJarsV1Request,
  ): Promise<DeployContractJarsSuccessV1Response> {
    const apiConfig = new Configuration({ basePath: this.apiUrl });
    const apiClient = new DefaultApi(apiConfig);
    const res = await apiClient.deployContractJarsV1(req);
    return res.data;
  }
}
