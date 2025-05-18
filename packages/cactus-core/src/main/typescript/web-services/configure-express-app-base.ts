import type { Express } from "express";
import bodyParser, { OptionsJson } from "body-parser";

import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { stringifyBigIntReplacer } from "./stringify-big-int-replacer";

export const CACTI_CORE_CONFIGURE_EXPRESS_APP_BASE_MARKER =
  "CACTI_CORE_CONFIGURE_EXPRESS_APP_BASE_MARKER";

/**
 * Implementations of this interface are objects who represent a valid execution
 * context for the `configureExpressAppBase()` utility function.
 *
 * @see {configureExpressAppBase}
 * @see {ApiServer}
 */
export interface IConfigureExpressAppContext {
  readonly logLevel?: LogLevelDesc;
  readonly app: Express;
  readonly bodyParserJsonOpts?: OptionsJson;
}

/**
 * Configures the base functionalities for an Express.js application.
 *
 * The main purpose of this function is to have a reusable implementation
 * of the base setup logic that the API server does. For test cases of
 * plugins we can't directly import the API server because it would cause
 * circular dependencies in the mono-repo that usually ends up causing mayhem
 * with the build in general and also with the architecture longer term.
 *
 * So, with this function being here in the core package it makes it easy
 * to reuse by both plugin test cases and also the API server itself.
 *
 * The logic here is kept very small because the order of the ExpressJS
 * middleware handler's matters a lot and if you mix up the order then
 * new bugs can appear.
 *
 * @param ctx The context object holding information about the log level
 * that the caller wants and the ExpressJS instance itself which is to be
 * configured.
 *
 * @throws {Error} If any of the required context properties are missing.
 */
export async function configureExpressAppBase(
  ctx: IConfigureExpressAppContext,
): Promise<void> {
  const fn = "configureExpressAppBase()";
  Checks.truthy(ctx, `${fn} arg1 ctx`);
  Checks.truthy(ctx.app, `${fn} arg1 ctx.app`);
  Checks.truthy(ctx.app.use, `${fn} arg1 ctx.app.use`);

  const logLevel: LogLevelDesc = ctx.logLevel || "WARN";

  const log = LoggerProvider.getOrCreate({
    level: logLevel,
    label: fn,
  });

  log.debug("ENTRY");

  const didRun = ctx.app.get(CACTI_CORE_CONFIGURE_EXPRESS_APP_BASE_MARKER);
  if (didRun) {
    const duplicateConfigurationAttemptErrorMsg =
      `Already configured this express instance before. Check the ` +
      `configuration variable of the ExpressJS instance under the key ` +
      `"CACTI_CORE_CONFIGURE_EXPRESS_APP_BASE_MARKER" to determine if an ` +
      `instance has already been `;
    throw new Error(duplicateConfigurationAttemptErrorMsg);
  }

  const bodyParserJsonOpts: OptionsJson = ctx.bodyParserJsonOpts || {
    limit: "50mb",
  };
  log.debug("body-parser middleware opts: %o", bodyParserJsonOpts);

  const bodyParserMiddleware = bodyParser.json(bodyParserJsonOpts);
  ctx.app.use(bodyParserMiddleware);

  // Add custom replacer to handle bigint responses correctly
  ctx.app.set("json replacer", stringifyBigIntReplacer);

  ctx.app.set(CACTI_CORE_CONFIGURE_EXPRESS_APP_BASE_MARKER, true);

  log.debug("EXIT");
}
