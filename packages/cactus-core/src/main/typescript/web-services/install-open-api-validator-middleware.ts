import type { Application, NextFunction, Request, Response } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

import { error as EovErrors } from "express-openapi-validator";

import {
  Checks,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

export interface IInstallOpenapiValidationMiddlewareRequest {
  readonly logLevel: LogLevelDesc;
  readonly app: Application;
  readonly apiSpec: unknown;
}

/**
 * Installs the middleware that validates openapi specifications
 * @param app
 * @param pluginOAS
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

  const paths = Object.keys((apiSpec as any).paths);
  log.debug(`Paths to be ignored: `, paths);

  app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpec as OpenAPIV3.Document,
      validateApiSpec: false,
      $refParser: {
        mode: "dereference",
      },
      ignorePaths: (path: string) => !paths.includes(path),
    }),
  );
  app.use(
    (
      err: {
        status?: number;
        errors: [
          {
            path: string;
            message: string;
            errorCode: string;
          },
        ];
      },
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      const tag = "[express-openapi-validator-middleware-handler]";
      if (isOpenApiRequestValidationError(err)) {
        if (err.status) {
          const { errors, status } = err;
          log.debug("%s Got valid error, status=%s - %o", tag, status, errors);
          res.status(err.status);
          res.send(err.errors);
        } else {
          log.debug("%s Got invalid error - status missing - %o", tag, err);
          res.status(500);
          res.send(err);
        }
      } else if (err) {
        log.debug("%s Got invalid error - validator crash(?) - %o", tag, err);
        res.status(500);
        res.send(err);
      } else {
        log.debug("%s Validation Passed OK - %s", tag, req.url);
        next();
      }
    },
  );
}

/**
 * Determines if an error object is an instance of one of the types that are
 * designed to be thrown by the "express-openapi-validator" package specifically
 * when it finds issues it is designed to find.
 *
 * In other words, we are detecting if the error was thrown intentionally or if
 * the validator had just crashed because of some other issue such as when the
 * Open API spec file is invalid.
 *
 * To give an example to the above, the "properties" key in one of the specs
 * was being assigned a string value but according to the meta schema (the
 * schema of the Open API spec documents themselves) the "properties" property
 * must be defined as an object that lists the properties of a schema element.
 *
 * The above mistake made by the person who wrote the Open API spec in question
 * was causing the "express-openapi-validator" package to crash, throwing errors
 * but different ones from the ones that it is "expected" to throw and we could
 * not detect this at the time and hence this function was made so that in the
 * future, debugging these kind of errors are much easier and can be done based
 * on the logs alone (hopefully).
 */
export function isOpenApiRequestValidationError(ex: unknown): boolean {
  if (ex) {
    return Object.values(EovErrors).some((x) => ex instanceof x);
  } else {
    return false;
  }
}
