export * from "./generated/openapi/typescript-axios/index";

export {
  IPluginOdapGatewayConstructorOptions,
  PluginOdapGateway,
} from "./gateway/plugin-odap-gateway";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryFabricOdapGateway } from "./gateway/plugin-factory-fabric-odap-gateway";
import { PluginFactoryBesuOdapGateway } from "./gateway/plugin-factory-besu-odap-gateway";

export async function createFabricPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryFabricOdapGateway> {
  return new PluginFactoryFabricOdapGateway(pluginFactoryOptions);
}

export async function createBesuPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryBesuOdapGateway> {
  return new PluginFactoryBesuOdapGateway(pluginFactoryOptions);
}
