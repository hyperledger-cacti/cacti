export {
  PluginWebServiceOidc,
  IPluginWebServiceOidcOptions,
  IWebAppOptions,
} from "./plugin-web-service-oidc";
export { PluginFactoryWebService } from "./plugin-factory-web-service-oidc";
export * from "./generated/openapi/typescript-axios/index";

import { PluginFactoryWebService } from "./plugin-factory-web-service-oidc";
export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService();
}
