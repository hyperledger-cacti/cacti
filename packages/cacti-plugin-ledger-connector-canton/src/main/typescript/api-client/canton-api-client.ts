import { Checks, LogLevelDesc } from "@hyperledger-cacti/cactus-common";

import { DefaultApi } from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

export class CantonApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
}

export class CantonApiClient extends DefaultApi {
  public static readonly CLASS_NAME = "CantonApiClient";

  public constructor(public readonly options: CantonApiClientOptions) {
    super(options);
    Checks.truthy(options, `${CantonApiClient.CLASS_NAME} options`);
  }
}
