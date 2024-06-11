import type { Response } from "express";
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
 * @param ctx.res - The Express response object to send the HTTP response.
 */
export interface IHandleRestEndpointExceptionOptions {
  readonly errorMsg: string;
  readonly log: Logger;
  readonly error: unknown;
  readonly res: Response;
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
    ctx.res.status(ctx.error.statusCode);

    // Log either an error or a debug message depending on what the statusCode is
    // For 5xx errors we treat it as a production bug that needs to be fixed on
    // our side and for everything else we treat it a user error and debug log it.
    if (ctx.error.statusCode >= INTERNAL_SERVER_ERROR) {
      ctx.log.debug(ctx.errorMsg, errorAsSanitizedJson);
    } else {
      ctx.log.error(ctx.errorMsg, errorAsSanitizedJson);
    }

    // If the `expose` property is set to true it implies that we can safely
    // expose the contents of the exception to the calling client.
    if (ctx.error.expose) {
      ctx.res.json({
        message: identifierByCodes[ctx.error.statusCode],
        error: errorAsSanitizedJson,
      });
    }
  } else {
    // If the exception was not an http-error then we assume it was an internal
    // error (e.g. same behavior as if we had received an HTTP 500 statusCode)
    ctx.log.error(ctx.errorMsg, errorAsSanitizedJson);

    const rex = createRuntimeErrorWithCause(ctx.errorMsg, ctx.error);
    const sanitizedJsonRex = safeStringifyException(rex);

    ctx.res.status(INTERNAL_SERVER_ERROR).json({
      message: identifierByCodes[INTERNAL_SERVER_ERROR],
      error: sanitizedJsonRex,
    });
  }
}
