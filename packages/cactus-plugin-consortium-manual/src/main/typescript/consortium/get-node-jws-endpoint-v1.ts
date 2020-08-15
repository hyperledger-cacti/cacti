import uuid from "uuid";
import { Request, Response, NextFunction } from "express";
import { JWS, JWK } from "jose";
import jsonStableStringify from "json-stable-stringify";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";
import {
  GetNodeJwsResponse,
  Consortium,
  JWSGeneral,
} from "../generated/openapi/typescript-axios";
import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

export interface IGetNodeJwsEndpointOptions {
  keyPairPem: string;
  consortium: Consortium;
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
    const level = options.logLevel || "INFO";
    const label = "get-node-jws-endpoint-v1";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return this.options.path;
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
    const { keyPairPem, consortium } = this.options;
    try {
      const keyPair = JWK.asKey(keyPairPem);
      const payload = jsonStableStringify({ consortium });
      const _protected = {
        iat: Date.now(),
        jti: uuid.v4(),
        iss: "Hyperledger Cactus",
      };
      // TODO: double check if this casting is safe (it is supposed to be)
      return JWS.sign.general(payload, keyPair, _protected) as JWSGeneral;
    } catch (ex) {
      throw new Error(`${fnTag} ${ex.stack}`);
    }
  }
}
