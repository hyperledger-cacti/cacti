import {
  GetOpenApiSpecV1EndpointBase,
  IGetOpenApiSpecV1EndpointBaseOptions,
} from "@hyperledger/cactus-core";

import {
  Checks,
  IAsyncProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import OAS from "../../json/openapi.json";

export const OasPathGetOpenApiSpecV1 =
  OAS.paths["/api/v1/api-server/get-open-api-spec"];

export type OasPathTypeGetOpenApiSpecV1 = typeof OasPathGetOpenApiSpecV1;

export interface IGetOpenApiSpecV1EndpointOptions
  extends IGetOpenApiSpecV1EndpointBaseOptions<
    typeof OAS,
    OasPathTypeGetOpenApiSpecV1
  > {
  readonly logLevel?: LogLevelDesc;
}

export class GetOpenApiSpecV1Endpoint
  extends GetOpenApiSpecV1EndpointBase<typeof OAS, OasPathTypeGetOpenApiSpecV1>
  implements IWebServiceEndpoint
{
  public get className(): string {
    return GetOpenApiSpecV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly options: IGetOpenApiSpecV1EndpointOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
  }

  public getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: this.opts.oasPath.get.security[0].bearerTokenAuth,
      }),
    };
  }
}
