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

export { generateES256JWK, issueOrgToken } from "./utils";

export { StaticConsortiumProvider } from "./repository/static-consortium-provider";

export { K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT } from "./prometheus-exporter/metrics";

export { IPolicyGroupOptions, PolicyGroup } from "./policy-model/policy-group";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryWebService } from "./plugin-factory-consortium-static";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService(pluginFactoryOptions);
}
