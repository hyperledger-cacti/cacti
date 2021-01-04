import uuid from "uuid";
import { Express, Request, Response, NextFunction } from "express";
import { JWS, JWK } from "jose";
import jsonStableStringify from "json-stable-stringify";

import {
  Consortium,
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

import { GetNodeJwsEndpoint as Constants } from "./get-node-jws-endpoint-constants";

export interface IGetNodeJwsEndpointOptions {
  keyPairPem: string;
  consortiumRepo: ConsortiumRepository;
  path: string;
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
    if (!options.path) {
      throw new Error(`${fnTag} options.path falsy.`);
    }
    Checks.truthy(options.consortiumRepo, `${fnTag} options.consortiumRepo`);

    const level = options.logLevel || "INFO";
    const label = "get-node-jws-endpoint-v1";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return Constants.HTTP_PATH;
  }

  getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
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
