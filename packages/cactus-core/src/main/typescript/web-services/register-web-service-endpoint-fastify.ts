import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  HTTPMethods,
} from "fastify";
import { createRuntimeErrorWithCause } from "@hyperledger/cactus-common";
import { IWebServiceEndpointFastify } from "@hyperledger/cactus-core-api/src/main/typescript/public-api";

/**
 * Hooks up an endpoint instance to a Fastify web app object.
 *
 * @param fastifyApp The Fastify application instance.
 * @param endpoint The `IWebServiceEndpoint` instance that will be registered.
 */
export async function registerWebServiceEndpointFastify(
  fastifyApp: FastifyInstance,
  endpoint: IWebServiceEndpointFastify,
): Promise<void> {
  const fnTag = "registerWebServiceEndpoint";
  const httpVerb = endpoint.getVerbLowerCase().toUpperCase() as HTTPMethods;
  const httpPath = endpoint.getPath();
  const fastifyHandler = endpoint.getFastifyHandler();

  const provider = endpoint.getAuthorizationOptionsProvider();
  const { isProtected, requiredRoles } = await provider.get();

  try {
    if (isProtected) {
      fastifyApp.route({
        method: httpVerb,
        url: httpPath,
        preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
          const user = (request as any).user; // Ensure `user` exists

          if (!user || typeof user !== "object") {
            return reply
              .status(403)
              .send({ error: "Forbidden: No user found" });
          }

          if (!user.scope) {
            return reply.status(403).send({ error: "Forbidden: No scope" });
          }

          const userScopes = user.scope.split(" ");
          const hasRequiredScopes = requiredRoles.every((role) =>
            userScopes.includes(role),
          );

          if (!hasRequiredScopes) {
            return reply
              .status(403)
              .send({ error: "Forbidden: Insufficient scope" });
          }
        },
        handler: fastifyHandler,
      });
    } else {
      fastifyApp.route({
        method: httpVerb,
        url: httpPath,
        handler: fastifyHandler,
      });
    }
  } catch (ex: unknown) {
    const errorMessage = `${fnTag} Fastify verb method ${httpVerb} threw while registering endpoint on path ${httpPath}`;
    throw createRuntimeErrorWithCause(errorMessage, ex);
  }
}
