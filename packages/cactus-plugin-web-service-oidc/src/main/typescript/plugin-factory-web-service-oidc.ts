import {
  PluginFactory,
  IPluginFactoryOptions,
} from "@hyperledger/cactus-core-api";
import {
  IPluginWebServiceOidcOptions,
  PluginWebServiceOidc,
} from "./plugin-web-service-oidc";

export class PluginFactoryWebServiceOidc extends PluginFactory<
  PluginWebServiceOidc,
  IPluginWebServiceOidcOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginWebServiceOidcOptions,
  ): Promise<PluginWebServiceOidc> {
    return new PluginWebServiceOidc(pluginOptions);
  }
}
