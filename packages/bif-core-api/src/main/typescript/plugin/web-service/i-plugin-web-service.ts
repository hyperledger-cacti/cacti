import { IWebServiceEndpoint } from "./i-web-service-endpoint";
import { ICactusPlugin } from "../i-cactus-plugin";

export interface IPluginWebService extends ICactusPlugin {
  installWebService(expressApp: any): IWebServiceEndpoint[];
}

export function isIPluginWebService(pluginInstance: IPluginWebService): pluginInstance is IPluginWebService {
  return typeof pluginInstance.installWebService === 'function';
}
