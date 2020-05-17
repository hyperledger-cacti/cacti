export {
  PluginWebServiceConsortium,
  IPluginWebServiceConsortiumOptions,
  IWebAppOptions,
} from "./plugin-web-service-consortium";
export { PluginFactoryWebService } from "./plugin-factory-web-service-consortium";
export * from "./generated/openapi/typescript-axios/index";

import { PluginFactoryWebService } from "./plugin-factory-web-service-consortium";
export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService();
}
