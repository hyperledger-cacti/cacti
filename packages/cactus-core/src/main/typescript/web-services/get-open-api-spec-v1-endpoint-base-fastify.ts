import {
  FastifyReply,
  FastifyRequest,
  FastifyInstance,
  RouteOptions,
} from "fastify";
import {
  Logger,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpointFastify,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

export class GetOpenApiSpecV1EndpointBase
  implements IWebServiceEndpointFastify
{
  public static readonly CLASS_NAME = "GetOpenApiSpecV1EndpointBase<S, P>";

  protected readonly log: Logger;

  public get className(): string {
    return GetOpenApiSpecV1EndpointBase.CLASS_NAME;
  }

  constructor(public readonly opts: { path: string; verbLowerCase: string }) {
    const level = "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getPath(): string {
    return this.opts.path;
  }

  public getVerbLowerCase(): string {
    return this.opts.verbLowerCase;
  }

  public async registerFastify(
    fastify: FastifyInstance,
  ): Promise<IWebServiceEndpointFastify> {
    fastify.route({
      method: this.getVerbLowerCase().toUpperCase() as RouteOptions["method"],
      url: this.getPath(),
      handler: this.getFastifyHandler(),
    });
    return this;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public getFastifyHandler(): (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<void> {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> => {
      await this.handleRequest(request, reply);
    };
  }

  private async handleRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      reply.status(200).send({ success: true });
    } catch (error) {
      reply.status(500).send({ error: "Internal Server Error" });
    }
  }
}
