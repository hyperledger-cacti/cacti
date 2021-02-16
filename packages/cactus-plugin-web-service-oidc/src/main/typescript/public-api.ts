export {
  PluginWebServiceOidc,
  IPluginWebServiceOidcOptions,
  IWebAppOptions,
} from "./plugin-web-service-oidc";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryWebServiceOidc } from "./plugin-factory-web-service-oidc";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryWebServiceOidc> {
  return new PluginFactoryWebServiceOidc(pluginFactoryOptions);
}

export * from "./generated/openapi/typescript-axios/index";

// import { PluginFactoryWebService } from "./plugin-factory-web-service-oidc";
// export async function createPluginFactory(
//   pluginFactoryOptions: IPluginFactoryOptions,
// ): Promise<PluginFactoryWebService> {
//   return new PluginFactoryWebService(pluginFactoryOptions);
// }
