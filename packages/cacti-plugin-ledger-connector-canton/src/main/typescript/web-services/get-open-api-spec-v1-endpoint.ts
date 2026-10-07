import { LogLevelDesc, Checks } from "@hyperledger-cacti/cactus-common";
import {
  GetOpenApiSpecV1EndpointBase,
  IGetOpenApiSpecV1EndpointBaseOptions,
} from "@hyperledger-cacti/cactus-core";
import { IWebServiceEndpoint } from "@hyperledger-cacti/cactus-core-api";

import OAS from "../../json/openapi.json";

export const OasPathGetOpenApiSpecV1 =
  OAS.paths[
    "/api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-open-api-spec"
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
  public constructor(
    public readonly options: IGetOpenApiSpecV1EndpointOptions,
  ) {
    super(options);
    Checks.truthy(options, `${this.className}#constructor() options`);
  }

  public get className(): string {
    return GetOpenApiSpecV1Endpoint.CLASS_NAME;
  }
}
