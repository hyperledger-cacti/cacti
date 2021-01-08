import { Express } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";

export interface ISetKeychainEntryEndpointV1Options {
  logLevel?: LogLevelDesc;
}

export class SetKeychainEntryEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "SetKeychainEntryEndpointV1";

  private readonly log: Logger;

  public get className() {
    return SetKeychainEntryEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: ISetKeychainEntryEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  private getOperation() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/set-keychain-entry"
    ].post;
  }

  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getVerbLowerCase(): string {
    return this.getOperation()["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    return this.getOperation()["x-hyperledger-cactus"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    throw new Error("Method not implemented.");
  }
}
