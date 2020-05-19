import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginWebServiceOidcOptions,
  PluginWebServiceOidc,
} from "./plugin-web-service-oidc";

export class PluginFactoryWebService extends PluginFactory<
  PluginWebServiceOidc,
  IPluginWebServiceOidcOptions
> {
  async create(
    options: IPluginWebServiceOidcOptions
  ): Promise<PluginWebServiceOidc> {
    return new PluginWebServiceOidc(options);
  }
}
