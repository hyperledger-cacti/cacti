import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IAsyncProvider } from "@hyperledger/cactus-common";
import { IEndpointAuthzOptions } from "./i-endpoint-authz-options";

/**
 * Interface for implementing API endpoints that can be dynamically registered
 * at runtime in a Fastify web application.
 *
 * This interface outlines the necessary methods for a Cactus API endpoint,
 * which is typically part of a plugin. It facilitates dynamic routing and
 * ensures consistent endpoint registration.
 */
export interface IWebServiceEndpointFastify {
  /**
   * Registers this endpoint with a Fastify application.
   *
   * @param fastifyApp - The Fastify application instance to register the endpoint with.
   * @returns A promise that resolves to the endpoint instance after registration.
   */
  registerFastify(
    fastifyApp: FastifyInstance,
  ): Promise<IWebServiceEndpointFastify>;

  /**
   * Gets the HTTP verb for this endpoint in lowercase.
   *
   * @example "get", "post", "put", "delete"
   * @returns The lowercase HTTP verb.
   */
  getVerbLowerCase(): string;

  /**
   * Gets the HTTP path for this endpoint.
   *
   * @returns The path string where the endpoint will be accessible.
   */
  getPath(): string;

  /**
   * Provides the Fastify-compatible request handler for this endpoint.
   *
   * The handler can be directly registered using Fastify's route configuration methods.
   *
   * @returns The request handler function.
   */
  getFastifyHandler(): (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<void>;

  /**
   * Provides an asynchronous provider for authorization options.
   *
   * This allows dynamic determination of authorization configurations,
   * such as role-based access control (RBAC) or token requirements.
   *
   * @returns An async provider for authorization options.
   */
  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions>;

  /**
   * Optionally provides a reference to the Fastify reply object.
   *
   * This can be used for scenarios requiring custom reply handling
   * after the handler function completes.
   *
   * @returns The Fastify reply object, if applicable.
   */
}
