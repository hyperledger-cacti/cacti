import uuid from "uuid";
import { Express, Request, Response, NextFunction } from "express";
import { JWS, JWK } from "jose";
import jsonStableStringify from "json-stable-stringify";

import {
  JWSGeneral,
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";

import { GetNodeJwsResponse } from "../generated/openapi/typescript-axios";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  registerWebServiceEndpoint,
  ConsortiumRepository,
} from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";

export interface IGetNodeJwsEndpointOptions {
  keyPairPem: string;
  consortiumRepo: ConsortiumRepository;
  logLevel?: LogLevelDesc;
}

export class GetNodeJwsEndpoint implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: IGetNodeJwsEndpointOptions) {
    const fnTag = "GetNodeJwsEndpoint#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }
    Checks.truthy(options.consortiumRepo, `${fnTag} options.consortiumRepo`);

    const level = options.logLevel || "INFO";
    const label = "get-node-jws-endpoint-v1";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/node/jws"
    ];
  }

  public getOperationId(): string {
    return this.getOasPath().get.operationId;
  }

  public getPath(): string {
    const oasPath = this.getOasPath();
    return oasPath.get["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    const oasPath = this.getOasPath();
    return oasPath.get["x-hyperledger-cactus"].http.verbLowerCase;
  }
  registerExpress(app: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(app, this);
    return this;
  }

  async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      this.log.debug(`GET ${this.getPath()}`);

      const jws = await this.createJws();
      const body: GetNodeJwsResponse = { jws };
      res.status(200);
      res.json(body);
    } catch (ex) {
      res.status(500);
      res.json({ error: ex.stack });
    }
  }

  public async createJws(): Promise<JWSGeneral> {
    const fnTag = "GetNodeJwsEndpoint#createJws()";
    const { keyPairPem, consortiumRepo: repo } = this.options;
    try {
      const keyPair = JWK.asKey(keyPairPem);
      const payloadObject = { consortiumDatabase: repo.consortiumDatabase };
      const payloadJson = jsonStableStringify(payloadObject);
      const _protected = {
        iat: Date.now(),
        jti: uuid.v4(),
        iss: "Hyperledger Cactus",
      };
      // TODO: double check if this casting is safe (it is supposed to be)
      return JWS.sign.general(payloadJson, keyPair, _protected) as JWSGeneral;
    } catch (ex) {
      throw new Error(`${fnTag} ${ex.stack}`);
    }
  }
}
