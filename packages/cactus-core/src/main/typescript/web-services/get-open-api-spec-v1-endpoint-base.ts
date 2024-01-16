import type { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "../plugin-registry";

import { registerWebServiceEndpoint } from "./register-web-service-endpoint";
import { handleRestEndpointException } from "./handle-rest-endpoint-exception";

export interface IGetOpenApiSpecV1EndpointBaseOptions<S, P> {
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
  oasPath: P;
  oas: S;
  path: string;
  verbLowerCase: string;
  operationId: string;
}

/**
 * A generic base class that plugins can re-use to implement their own endpoints
 * which are returning their own OpenAPI specification documents with much less
 * boilerplate than otherwise would be needed.
 *
 * As an example, you can implement a sub-class like this:
 *
 * ```typescript
 * import {
 *   GetOpenApiSpecV1EndpointBase,
 *   IGetOpenApiSpecV1EndpointBaseOptions,
 * } from "@hyperledger/cactus-core";
 *
 * import { Checks, LogLevelDesc } from "@hyperledger/cactus-common";
 * import { IWebServiceEndpoint } from "@hyperledger/cactus-core-api";
 *
 * import OAS from "../../json/openapi.json";
 *
 * export const OasPathGetOpenApiSpecV1 =
 *   OAS.paths[
 *     "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-open-api-spec"
 *   ];
 *
 * export type OasPathTypeGetOpenApiSpecV1 = typeof OasPathGetOpenApiSpecV1;
 *
 * export interface IGetOpenApiSpecV1EndpointOptions
 *   extends IGetOpenApiSpecV1EndpointBaseOptions<
 *     typeof OAS,
 *     OasPathTypeGetOpenApiSpecV1
 *   > {
 *   readonly logLevel?: LogLevelDesc;
 * }
 *
 * export class GetOpenApiSpecV1Endpoint
 *   extends GetOpenApiSpecV1EndpointBase<typeof OAS, OasPathTypeGetOpenApiSpecV1>
 *   implements IWebServiceEndpoint
 * {
 *   public get className(): string {
 *     return GetOpenApiSpecV1Endpoint.CLASS_NAME;
 *   }
 *
 *   constructor(public readonly options: IGetOpenApiSpecV1EndpointOptions) {
 *     super(options);
 *     const fnTag = `${this.className}#constructor()`;
 *     Checks.truthy(options, `${fnTag} arg options`);
 *   }
 * }
 *
 * ```
 *
 * The above code will also need you to update your openapi.json spec file by
 * adding a new endpoint matching it (if you skip this step the compiler should
 * complain about missing paths)
 *
 * ```json
 * "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-open-api-spec": {
 *   "get": {
 *     "x-hyperledger-cacti": {
 *       "http": {
 *         "verbLowerCase": "get",
 *         "path": "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-open-api-spec"
 *       }
 *     },
 *     "operationId": "getOpenApiSpecV1",
 *     "summary": "Retrieves the .json file that contains the OpenAPI specification for the plugin.",
 *     "parameters": [],
 *     "responses": {
 *       "200": {
 *         "description": "OK",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "string"
 *             }
 *           }
 *         }
 *       }
 *     }
 * }
 *    },
 * ```
 */
export class GetOpenApiSpecV1EndpointBase<S, P> implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetOpenApiSpecV1EndpointBase<S, P>";

  protected readonly log: Logger;

  public get className(): string {
    return GetOpenApiSpecV1EndpointBase.CLASS_NAME;
  }

  constructor(
    public readonly opts: IGetOpenApiSpecV1EndpointBaseOptions<S, P>,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} arg options.pluginRegistry`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public get oasPath(): P {
    return this.opts.oasPath;
  }

  public getPath(): string {
    return this.opts.path;
  }

  public getVerbLowerCase(): string {
    return this.opts.verbLowerCase;
  }

  public getOperationId(): string {
    return this.opts.operationId;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
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

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    const reqMeta = `${verbUpper} ${this.getPath()}`;
    this.log.debug(reqMeta);

    try {
      const { oas } = this.opts;
      res.status(200);
      res.json(oas);
    } catch (ex: unknown) {
      const errorMsg = `${fnTag} request handler fn crashed for: ${reqMeta}`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
