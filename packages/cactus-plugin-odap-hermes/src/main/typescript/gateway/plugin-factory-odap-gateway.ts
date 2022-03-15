import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginOdapGatewayConstructorOptions,
  PluginOdapGateway,
} from "./plugin-odap-gateway";
export class PluginFactoryOdapGateway extends PluginFactory<
  PluginOdapGateway,
  IPluginOdapGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginOdapGatewayConstructorOptions,
  ): Promise<PluginOdapGateway> {
    return new PluginOdapGateway(pluginOptions);
  }
}
