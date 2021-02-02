import { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  JWSGeneral,
  JWSRecipient,
} from "@hyperledger/cactus-core-api";

import {
  Configuration,
  DefaultApi,
} from "../generated/openapi/typescript-axios";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  registerWebServiceEndpoint,
  ConsortiumRepository,
} from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";

export interface IGetConsortiumJwsEndpointOptions {
  keyPairPem: string;
  consortiumRepo: ConsortiumRepository;
  logLevel?: LogLevelDesc;
}

export class GetConsortiumEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: IGetConsortiumJwsEndpointOptions) {
    const fnTag = "GetConsortiumJwsEndpoint#constructor()";
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    if (!options.keyPairPem) {
      throw new Error(`${fnTag} options.keyPairPem falsy.`);
    }
    if (!options.consortiumRepo) {
      throw new Error(`${fnTag} options.consortium falsy.`);
    }

    const label = "get-consortium-jws-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws"
    ].get.operationId;
  }

  public getPath(): string {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws"
    ].get["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws"
    ].get["x-hyperledger-cactus"].http.verbLowerCase;
  }

  registerExpress(app: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(app, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetConsortiumJwsEndpointV1#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);

    try {
      const nodes = this.options.consortiumRepo.allNodes;

      const requests = nodes
        .map((cnm) => cnm.nodeApiHost)
        .map((host) => new Configuration({ basePath: host }))
        .map((configuration) => new DefaultApi(configuration))
        .map((apiClient) => apiClient.getNodeJws());

      const responses = await Promise.all(requests);

      const signatures: JWSRecipient[] = [];

      responses
        .map((apiResponse) => apiResponse.data)
        .map((getNodeJwsResponse) => getNodeJwsResponse.jws)
        .forEach((aJws: JWSGeneral) =>
          aJws.signatures.forEach((signature) => signatures.push(signature)),
        );

      const [response] = responses;
      const jws = response.data.jws;
      jws.signatures = signatures;

      const body = { jws };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }
}
