import type { FastifyReply } from "fastify";
import createHttpError from "http-errors";

import {
  identifierByCodes,
  INTERNAL_SERVER_ERROR,
} from "http-errors-enhanced-cjs";

import {
  Logger,
  createRuntimeErrorWithCause,
  safeStringifyException,
} from "@hyperledger/cactus-common";

/**
 * An interface describing the object containing the contextual information needed by the
 * `#handleRestEndpointException()` method to perform its duties.
 *
 * @param ctx - An object containing options for handling the REST endpoint exception.
 * @param ctx.errorMsg - The error message to log (if there will be error logging e.g. HTTP 500)
 * @param ctx.log - The logger instance used for logging errors and/or debug messages.
 * @param ctx.error - The error object representing the exception that is being handled.
 * @param ctx.reply - The Fastify reply object to send the HTTP response.
 */
export interface IHandleRestEndpointExceptionOptions {
  readonly errorMsg: string;
  readonly log: Logger;
  readonly error: unknown;
  readonly reply: FastifyReply;
}

/**
 * Handles exceptions thrown during REST endpoint processing and sends an appropriate HTTP response.
 *
 * If the exception is an instance of `HttpError` from the `http-errors` library,
 * it logs the error at the debug level and sends a JSON response with the error details
 * and the corresponding HTTP status code.
 *
 * If the exception is not an instance of `HttpError`, it logs the error at the error level,
 * creates a runtime error with the original error as the cause, and sends a JSON response
 * with a generic "Internal Server Error" message and a 500 HTTP status code.
 *
 * @param ctx - An object containing options for handling the REST endpoint exception.
 */
export async function handleRestEndpointException(
  ctx: Readonly<IHandleRestEndpointExceptionOptions>,
): Promise<void> {
  const errorAsSanitizedJson = safeStringifyException(ctx.error);

  if (createHttpError.isHttpError(ctx.error)) {
    ctx.reply.status(ctx.error.statusCode);

    if (ctx.error.statusCode >= INTERNAL_SERVER_ERROR) {
      ctx.log.debug(ctx.errorMsg, errorAsSanitizedJson);
    } else {
      ctx.log.error(ctx.errorMsg, errorAsSanitizedJson);
    }

    if (ctx.error.expose) {
      ctx.reply.send({
        message: identifierByCodes[ctx.error.statusCode],
        error: errorAsSanitizedJson,
      });
    } else {
      ctx.reply.send({
        message: identifierByCodes[ctx.error.statusCode],
      });
    }
  } else {
    ctx.log.error(ctx.errorMsg, errorAsSanitizedJson);

    const rex = createRuntimeErrorWithCause(ctx.errorMsg, ctx.error);
    const sanitizedJsonRex = safeStringifyException(rex);

    ctx.reply.status(INTERNAL_SERVER_ERROR).send({
      message: identifierByCodes[INTERNAL_SERVER_ERROR],
      error: sanitizedJsonRex,
    });
  }
}
