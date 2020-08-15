export {
  GetConsortiumEndpointV1,
  IGetConsortiumJwsEndpointOptions,
} from "./consortium/get-consortium-jws-endpoint-v1";

export {
  GetNodeJwsEndpoint,
  IGetNodeJwsEndpointOptions,
} from "./consortium/get-node-jws-endpoint-v1";

export {
  PluginConsortiumManual,
  IPluginConsortiumManualOptions,
  IWebAppOptions,
} from "./plugin-consortium-manual";

export * from "./generated/openapi/typescript-axios/index";

export { PluginFactoryWebService } from "./plugin-factory-consortium-manual";

import { PluginFactoryWebService } from "./plugin-factory-consortium-manual";
export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService();
}
