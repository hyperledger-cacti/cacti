import type { Response } from "express";
import {
  BadRequestError,
  ForbiddenError,
  GatewayTimeoutError,
  PayloadTooLargeError,
} from "http-errors-enhanced-cjs";

import type { Logger } from "@hyperledger-cacti/cactus-common";

export interface IHandleCantonEndpointErrorOptions {
  readonly error: unknown;
  readonly errorMsg: string;
  readonly log: Logger;
  readonly res: Response;
}

type SafeConnectorError =
  | BadRequestError
  | ForbiddenError
  | GatewayTimeoutError
  | PayloadTooLargeError;

function isSafeConnectorError(error: unknown): error is SafeConnectorError {
  return (
    error instanceof BadRequestError ||
    error instanceof ForbiddenError ||
    error instanceof GatewayTimeoutError ||
    error instanceof PayloadTooLargeError
  );
}

/**
 * Converts connector failures into safe REST responses without inspecting or
 * serializing the original Wallet SDK error. SDK errors can contain HTTP
 * headers and token-provider state, including credentials.
 */
export function handleCantonEndpointError(
  options: Readonly<IHandleCantonEndpointErrorOptions>,
): void {
  if (isSafeConnectorError(options.error)) {
    options.log.debug(
      options.errorMsg,
      `Canton connector rejected the request with HTTP ${options.error.statusCode}.`,
    );
    options.res.status(options.error.statusCode).json({
      message: options.error.message,
    });
    return;
  }

  options.log.error(
    options.errorMsg,
    "Canton Wallet SDK error details were suppressed.",
  );
  options.res.status(502).json({
    message: "Canton ledger operation failed.",
  });
}
