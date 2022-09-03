import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IBesuOdapGatewayConstructorOptions,
  BesuOdapGateway,
} from "./besu-odap-gateway";

export class PluginFactoryBesuOdapGateway extends PluginFactory<
  BesuOdapGateway,
  IBesuOdapGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IBesuOdapGatewayConstructorOptions,
  ): Promise<BesuOdapGateway> {
    return new BesuOdapGateway(pluginOptions);
  }
}
