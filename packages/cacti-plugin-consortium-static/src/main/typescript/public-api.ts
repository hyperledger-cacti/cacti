import * as OpenApiJson from "../json/openapi.json";
export { OpenApiJson };

export {
  GetConsortiumEndpointV1,
  IGetConsortiumJwsEndpointOptions,
} from "./consortium/get-consortium-jws-endpoint-v1";

export {
  GetNodeJwsEndpoint,
  IGetNodeJwsEndpointOptions,
} from "./consortium/get-node-jws-endpoint-v1";

export {
  PluginConsortiumStatic,
  IPluginConsortiumStaticOptions,
  IWebAppOptions,
} from "./plugin-consortium-static";

export * from "./generated/openapi/typescript-axios/index";

export { PluginFactoryWebService } from "./plugin-factory-consortium-static";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryWebService } from "./plugin-factory-consortium-static";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService(pluginFactoryOptions);
}
