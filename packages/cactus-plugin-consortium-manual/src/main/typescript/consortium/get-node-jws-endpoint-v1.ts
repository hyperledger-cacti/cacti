import { v4 as uuidv4 } from "uuid";
import { Express, Request, Response } from "express";
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
import { PluginConsortiumManual } from "../plugin-consortium-manual";

export interface IGetNodeJwsEndpointOptions {
  plugin: PluginConsortiumManual;
  keyPairPem: string;
  consortiumRepo: ConsortiumRepository;
  logLevel?: LogLevelDesc;
}

export class GetNodeJwsEndpoint implements IWebServiceEndpoint {
  private readonly log: Logger;
  private readonly plugin: PluginConsortiumManual;

  constructor(public readonly options: IGetNodeJwsEndpointOptions) {
    const fnTag = "GetNodeJwsEndpoint#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }
    Checks.truthy(options.consortiumRepo, `${fnTag} options.consortiumRepo`);
    Checks.truthy(options.plugin, `${fnTag} options.plugin`);
    Checks.truthy(
      options.plugin instanceof PluginConsortiumManual,
      `${fnTag} options.plugin instanceof PluginConsortiumManual`,
    );
    this.plugin = options.plugin;

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

  async handleRequest(req: Request, res: Response): Promise<void> {
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
      // TODO: move this logic here entirely to the plugin itself. We already
      // have an issue open for it on GH most likely, someone may already be
      // working on this very thing actually so please do double check prior
      // to diving in and working on it to avoid redundant effort.
      this.plugin.updateMetricNodeCount();
      const keyPair = JWK.asKey(keyPairPem);
      const payloadObject = { consortiumDatabase: repo.consortiumDatabase };
      const payloadJson = jsonStableStringify(payloadObject);
      const _protected = {
        iat: Date.now(),
        jti: uuidv4(),
        iss: "Hyperledger Cactus",
      };
      // TODO: double check if this casting is safe (it is supposed to be)
      return JWS.sign.general(payloadJson, keyPair, _protected) as JWSGeneral;
    } catch (ex) {
      throw new Error(`${fnTag} ${ex.stack}`);
    }
  }
}
