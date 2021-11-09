import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import { OdapGateway, OdapGatewayConstructorOptions } from "./odap-gateway";
export class PluginFactoryOdapGateway extends PluginFactory<
  OdapGateway,
  OdapGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: OdapGatewayConstructorOptions,
  ): Promise<OdapGateway> {
    return new OdapGateway(pluginOptions);
  }
}
