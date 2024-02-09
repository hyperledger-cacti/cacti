import * as OpenApiJson from "../json/openapi.json";
export { OpenApiJson };

export {
  GetConsortiumEndpointV1,
  IGetConsortiumJwsEndpointOptions,
} from "./consortium/get-consortium-jws-endpoint-v1.js";

export {
  GetNodeJwsEndpoint,
  IGetNodeJwsEndpointOptions,
} from "./consortium/get-node-jws-endpoint-v1.js";

export {
  PluginConsortiumManual,
  IPluginConsortiumManualOptions,
  IWebAppOptions,
} from "./plugin-consortium-manual.js";

export * from "./generated/openapi/typescript-axios/index.js";

export { PluginFactoryWebService } from "./plugin-factory-consortium-manual.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryWebService } from "./plugin-factory-consortium-manual.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService(pluginFactoryOptions);
}
