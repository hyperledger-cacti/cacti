import type { Application, NextFunction, Request, Response } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

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
      if (err) {
        res.status(err.status || 500);
        res.send(err.errors);
      } else {
        next();
      }
    },
  );
}
