import type { FastifyInstance } from "fastify"; // Import Fastify type
import { IWebServiceEndpointFastify } from "./i-web-service-endpoint-fastify";
import { ICactusPlugin } from "../i-cactus-plugin";
import type { Server as SocketIoServer } from "socket.io";

export interface IPluginWebServiceFastify extends ICactusPlugin {
  getOrCreateWebServices(): Promise<IWebServiceEndpointFastify[]>;

  registerWebServices(
    fastifyApp: FastifyInstance, // Updated to FastifyInstance
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpointFastify[]>;

  shutdown(): Promise<void>;
  getOpenApiSpec(): unknown;
}

export function isIPluginWebServiceFastify(
  x: unknown,
): x is IPluginWebServiceFastify {
  return (
    !!x &&
    typeof (x as IPluginWebServiceFastify).registerWebServices === "function" &&
    typeof (x as IPluginWebServiceFastify).getOrCreateWebServices ===
      "function" &&
    typeof (x as IPluginWebServiceFastify).getPackageName === "function" &&
    typeof (x as IPluginWebServiceFastify).getInstanceId === "function" &&
    typeof (x as IPluginWebServiceFastify).shutdown === "function" &&
    typeof (x as IPluginWebServiceFastify).getOpenApiSpec === "function"
  );
}
