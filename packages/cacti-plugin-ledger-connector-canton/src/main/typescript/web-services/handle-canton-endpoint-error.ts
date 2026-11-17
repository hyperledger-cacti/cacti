import type { Response } from "express";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GatewayTimeoutError,
  PayloadTooLargeError,
  ServiceUnavailableError,
} from "http-errors-enhanced-cjs";

import type { Logger } from "@hyperledger-cacti/cactus-common";

import { CantonLedgerError } from "../canton-ledger-error";

export interface IHandleCantonEndpointErrorOptions {
  readonly error: unknown;
  readonly errorMsg: string;
  readonly log: Logger;
  readonly res: Response;
}

type SafeConnectorError =
  | BadRequestError
  | ConflictError
  | ForbiddenError
  | GatewayTimeoutError
  | PayloadTooLargeError
  | ServiceUnavailableError;

function isSafeConnectorError(error: unknown): error is SafeConnectorError {
  return (
    error instanceof BadRequestError ||
    error instanceof ConflictError ||
    error instanceof ForbiddenError ||
    error instanceof GatewayTimeoutError ||
    error instanceof PayloadTooLargeError ||
    error instanceof ServiceUnavailableError
  );
}

export interface ICantonErrorResponse {
  readonly statusCode: number;
  readonly body: {
    readonly message: string;
    readonly cantonErrorCode?: string;
  };
}

/**
 * Converts a connector failure into a safe status and body without inspecting
 * or serializing the original Wallet SDK error. SDK errors can contain HTTP
 * headers and token-provider state, including credentials.
 */
export function toCantonErrorResponse(
  error: unknown,
  errorMsg: string,
  log: Logger,
): ICantonErrorResponse {
  if (error instanceof CantonLedgerError) {
    // Only the status, a fixed message, and Canton's constant error code are
    // returned; the ledger's cause and context are never serialized.
    log.debug(
      errorMsg,
      `Canton ledger rejected the request with ${error.cantonErrorCode} (HTTP ${error.statusCode}).`,
    );
    return {
      statusCode: error.statusCode,
      body: {
        message: error.message,
        cantonErrorCode: error.cantonErrorCode,
      },
    };
  }
  if (isSafeConnectorError(error)) {
    log.debug(
      errorMsg,
      `Canton connector rejected the request with HTTP ${error.statusCode}.`,
    );
    return { statusCode: error.statusCode, body: { message: error.message } };
  }

  log.error(errorMsg, "Canton Wallet SDK error details were suppressed.");
  return {
    statusCode: 502,
    body: { message: "Canton ledger operation failed." },
  };
}

/** Sends the safe response for a connector failure. */
export function handleCantonEndpointError(
  options: Readonly<IHandleCantonEndpointErrorOptions>,
): void {
  const { statusCode, body } = toCantonErrorResponse(
    options.error,
    options.errorMsg,
    options.log,
  );
  options.res.status(statusCode).json(body);
}
