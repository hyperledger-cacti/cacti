import { IWebServiceEndpoint } from "./i-web-service-endpoint";
import { ICactusPlugin } from "../i-cactus-plugin";
import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";

export interface IPluginWebService extends ICactusPlugin {
  installWebServices(expressApp: any): Promise<IWebServiceEndpoint[]>;
  getHttpServer(): Optional<Server | SecureServer>;
  shutdown(): Promise<void>;
}

export function isIPluginWebService(
  pluginInstance: any
): pluginInstance is IPluginWebService {
  return (
    pluginInstance &&
    typeof (pluginInstance as IPluginWebService).installWebServices ===
      "function" &&
    typeof (pluginInstance as IPluginWebService).getHttpServer === "function" &&
    typeof (pluginInstance as IPluginWebService).getId === "function" &&
    typeof (pluginInstance as IPluginWebService).getAspect === "function" &&
    typeof (pluginInstance as IPluginWebService).shutdown === "function"
  );
}
