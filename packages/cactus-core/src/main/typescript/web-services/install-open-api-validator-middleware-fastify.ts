import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyOpenapiValidator from "fastify-openapi-glue";
import { OpenAPIV3 } from "openapi-types";
import Ajv from "ajv";

import {
  Checks,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

export interface IInstallOpenapiValidationMiddlewareRequest {
  readonly logLevel: LogLevelDesc;
  readonly app: FastifyInstance;
  readonly apiSpec: unknown;
}

/**
 * Installs the middleware that validates OpenAPI specifications
 * @param req
 */
export async function installOpenapiValidationMiddleware(
  req: IInstallOpenapiValidationMiddlewareRequest,
): Promise<void> {
  const fnTag = "installOpenapiValidationMiddleware";
  Checks.truthy(req, `${fnTag} req`);
  Checks.truthy(req.apiSpec, `${fnTag} req.apiSpec`);
  Checks.truthy(req.app, `${fnTag} req.app`);

  const { app, apiSpec, logLevel } = req;
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel || "INFO",
  });
  log.debug(`Installing validation for OpenAPI specs: `, apiSpec);

  const paths = Object.keys((apiSpec as OpenAPIV3.Document).paths);
  log.debug(`Paths to be ignored: `, paths);

  await app.register(fastifyOpenapiValidator, {
    specification: apiSpec as OpenAPIV3.Document,
  });

  const ajv = new Ajv({
    removeAdditional: "all",
    useDefaults: true,
    coerceTypes: true,
  });

  app.setValidatorCompiler(({ schema }) => {
    return ajv.compile(schema);
  });

  app.setErrorHandler((err: any, req: FastifyRequest, res: FastifyReply) => {
    const tag = "[fastify-openapi-validator-middleware-handler]";
    if (isOpenApiRequestValidationError(err)) {
      log.debug("%s Got valid error, status=%s - %o", tag, err.statusCode, err);
      res.status(err.statusCode ?? 400).send(err);
    } else {
      log.debug("%s Got unexpected error - %o", tag, err);
      res.status(500).send({ error: "Internal Server Error" });
    }
  });
}

export function isOpenApiRequestValidationError(ex: unknown): boolean {
  return (
    typeof ex === "object" &&
    ex !== null &&
    "validation" in ex &&
    Boolean((ex as { validation: unknown }).validation)
  );
}

export function createFastifyInstance(): FastifyInstance {
  return Fastify();
}
