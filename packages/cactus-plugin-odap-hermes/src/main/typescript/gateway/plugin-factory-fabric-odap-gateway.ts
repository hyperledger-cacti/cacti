import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IFabricOdapGatewayConstructorOptions,
  FabricOdapGateway,
} from "./fabric-odap-gateway";

export class PluginFactoryFabricOdapGateway extends PluginFactory<
  FabricOdapGateway,
  IFabricOdapGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IFabricOdapGatewayConstructorOptions,
  ): Promise<FabricOdapGateway> {
    return new FabricOdapGateway(pluginOptions);
  }
}
