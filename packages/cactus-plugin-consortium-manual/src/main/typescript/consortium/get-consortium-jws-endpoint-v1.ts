import { Request, Response, NextFunction } from "express";
import { JWS, JWK } from "jose";
import flatten from "lodash/flatten";

import { ApiClient } from "@hyperledger/cactus-sdk";
import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";
import {
  Configuration,
  DefaultApi,
  JWSGeneral,
  JWSRecipient,
  Consortium,
  GetNodeJwsResponse,
} from "../generated/openapi/typescript-axios";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { AxiosResponse } from "axios";

export interface IGetConsortiumJwsEndpointOptions {
  keyPairPem: string;
  consortium: Consortium;
  path: string;
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
    if (!options.consortium) {
      throw new Error(`${fnTag} options.consortium falsy.`);
    }
    if (!options.path) {
      throw new Error(`${fnTag} options.path falsy.`);
    }

    const label = "get-consortium-jws-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return this.options.path;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetConsortiumJwsEndpointV1#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);

    try {
      const nodes2d = this.options.consortium.members?.map((m) => m.nodes);
      const nodes = flatten(nodes2d);

      const requests: Promise<AxiosResponse<GetNodeJwsResponse>>[] = nodes
        .map((cnm) => cnm.nodeApiHost)
        .map((host) => new Configuration({ basePath: host }))
        .map((configuration) => new ApiClient(configuration))
        .map((apiClient) => apiClient.extendWith(DefaultApi))
        .map((apiClient) =>
          apiClient.apiV1PluginsHyperledgerCactusPluginConsortiumManualNodeJwsGet()
        );

      const responses = await Promise.all(requests);

      const signatures: JWSRecipient[] = [];

      responses
        .map((apiResponse) => apiResponse.data)
        .map((getNodeJwsResponse) => getNodeJwsResponse.jws)
        .forEach((aJws: JWSGeneral) =>
          aJws.signatures.forEach((signature) => signatures.push(signature))
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
