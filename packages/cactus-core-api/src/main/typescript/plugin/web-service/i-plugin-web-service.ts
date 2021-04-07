import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { Application } from "express";
import { IWebServiceEndpoint } from "./i-web-service-endpoint";
import { ICactusPlugin } from "../i-cactus-plugin";

export interface IPluginWebService extends ICactusPlugin {
  getOrCreateWebServices(): Promise<IWebServiceEndpoint[]>;
  registerWebServices(expressApp: Application): Promise<IWebServiceEndpoint[]>;
  getHttpServer(): Optional<Server | SecureServer>;
  shutdown(): Promise<void>;
}

export function isIPluginWebService(
  pluginInstance: any,
): pluginInstance is IPluginWebService {
  return (
    pluginInstance &&
    typeof (pluginInstance as IPluginWebService).registerWebServices ===
      "function" &&
    typeof (pluginInstance as IPluginWebService).getOrCreateWebServices ===
      "function" &&
    typeof (pluginInstance as IPluginWebService).getHttpServer === "function" &&
    typeof (pluginInstance as IPluginWebService).getPackageName ===
      "function" &&
    typeof (pluginInstance as IPluginWebService).getAspect === "function" &&
    typeof (pluginInstance as IPluginWebService).shutdown === "function"
  );
}
