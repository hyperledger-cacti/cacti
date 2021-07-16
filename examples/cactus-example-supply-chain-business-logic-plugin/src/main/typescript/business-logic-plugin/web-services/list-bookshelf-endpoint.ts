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
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import {
  DefaultApi as BesuApi,
  EthContractInvocationType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import OAS from "../../../json/openapi.json";
import { BookshelfConverter } from "../../model/converter/bookshelf-converter";

export interface IListBookshelfEndpointOptions {
  logLevel?: LogLevelDesc;
  contractName: string;
  // contractAddress: string;
  //  contractAbi: any;
  besuApi: BesuApi;
  keychainId: string;
}

export class ListBookshelfEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "ListBookshelfEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return ListBookshelfEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IListBookshelfEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.besuApi, `${fnTag} options.besuApi`);
    // Checks.truthy(opts.contractAddress, `${fnTag} options.contractAddress`);
    // Checks.truthy(opts.contractAbi, `${fnTag} options.contractAbi`);
    Checks.nonBlankString(opts.contractName, `${fnTag} options.contractName`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-bookshelf"
    ];
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

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cactus"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      this.log.debug(`${tag}`);

      const { data } = await this.opts.besuApi.invokeContractV1({
        contractName: this.opts.contractName,
        invocationType: EthContractInvocationType.Call,
        methodName: "getAllRecords",
        gas: 1000000,
        params: [],
        signingCredential: {
          type: Web3SigningCredentialType.None,
        },
        keychainId: this.opts.keychainId,
      });
      const { callOutput } = data;

      const rows = BookshelfConverter.ofSolidityStructList(callOutput);
      this.log.debug(`apiV1BesuInvokeContract() => %o`, data);

      const body = { data: rows };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
