import type { FastifyRequest, FastifyReply } from "fastify";

export type IFastifyRequestHandler = (
  req: FastifyRequest,
  reply: FastifyReply,
) => Promise<void>;
