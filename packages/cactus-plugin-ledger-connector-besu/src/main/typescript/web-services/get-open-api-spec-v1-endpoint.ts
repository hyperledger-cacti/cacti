import {
  GetOpenApiSpecV1EndpointBase,
  IGetOpenApiSpecV1EndpointBaseOptions,
} from "@hyperledger/cactus-core";

import { Checks, LogLevelDesc } from "@hyperledger/cactus-common";
import { IWebServiceEndpoint } from "@hyperledger/cactus-core-api";

import OAS from "../../json/openapi.json";

export const OasPathGetOpenApiSpecV1 =
  OAS.paths[
    "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-open-api-spec"
  ];

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
}
