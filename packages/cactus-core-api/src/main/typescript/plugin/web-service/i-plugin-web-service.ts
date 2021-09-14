import type { Server } from "http";
import type { Server as SecureServer } from "https";
import type { Optional } from "typescript-optional";
import type { Application } from "express";
import { IWebServiceEndpoint } from "./i-web-service-endpoint";
import { ICactusPlugin } from "../i-cactus-plugin";
import type { Server as SocketIoServer } from "socket.io";

export interface IPluginWebService extends ICactusPlugin {
  getOrCreateWebServices(): Promise<IWebServiceEndpoint[]>;

  registerWebServices(
    expressApp: Application,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]>;

  getHttpServer(): Optional<Server | SecureServer>;
  shutdown(): Promise<void>;
  getOpenApiSpec(): unknown;
}

export function isIPluginWebService(x: unknown): x is IPluginWebService {
  return (
    !!x &&
    typeof (x as IPluginWebService).registerWebServices === "function" &&
    typeof (x as IPluginWebService).getOrCreateWebServices === "function" &&
    typeof (x as IPluginWebService).getHttpServer === "function" &&
    typeof (x as IPluginWebService).getPackageName === "function" &&
    typeof (x as IPluginWebService).getInstanceId === "function" &&
    typeof (x as IPluginWebService).shutdown === "function" &&
    typeof (x as IPluginWebService).getOpenApiSpec === "function"
  );
}
