import { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import {
  AuthorizationOptionsProvider,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import {
  DefaultApi as QuorumApi,
  EthContractInvocationType,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";

import OAS from "../../../json/openapi.json";
import { InsertBambooHarvestRequest } from "../../generated/openapi/typescript-axios";

export interface IInsertBambooHarvestEndpointOptions {
  logLevel?: LogLevelDesc;
  contractName: string;
  //  contractAbi: any;
  apiClient: QuorumApi;
  web3SigningCredential: Web3SigningCredential;
  keychainId: string;
  authorizationOptionsProvider?: AuthorizationOptionsProvider;
}

const K_DEFAULT_AUTHORIZATION_OPTIONS: IEndpointAuthzOptions = {
  isProtected: true,
  requiredRoles: [],
};

export class InsertBambooHarvestEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "InsertBambooHarvestEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return InsertBambooHarvestEndpoint.CLASS_NAME;
  }

  private readonly authorizationOptionsProvider: AuthorizationOptionsProvider;

  constructor(public readonly opts: IInsertBambooHarvestEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.apiClient, `${fnTag} options.apiClient`);
    // Checks.truthy(opts.contractAbi, `${fnTag} options.contractAbi`);
    Checks.nonBlankString(
      opts.contractName,
      `${fnTag} options.contractAddress`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.authorizationOptionsProvider =
      opts.authorizationOptionsProvider ||
      AuthorizationOptionsProvider.of(K_DEFAULT_AUTHORIZATION_OPTIONS, level);

    this.log.debug(`Instantiated ${this.className} OK`);
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/insert-bamboo-harvest"
    ];
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return this.authorizationOptionsProvider;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      const { bambooHarvest } = req.body as InsertBambooHarvestRequest;
      this.log.debug(`${tag} %o`, bambooHarvest);

      const {
        data: { success, callOutput, transactionReceipt },
      } = await this.opts.apiClient.invokeContractV1({
        contractName: this.opts.contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "insertRecord",
        gas: 1000000,
        params: [bambooHarvest],
        web3SigningCredential: this.opts.web3SigningCredential,
        keychainId: this.opts.keychainId,
      });

      const body = { success, callOutput, transactionReceipt };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
