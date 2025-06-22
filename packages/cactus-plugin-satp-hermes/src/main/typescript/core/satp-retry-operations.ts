import { Logger } from "@hyperledger/cactus-common";
import {
  GatewayRetryOperationFailedError,
  InvalidParameterError,
} from "../core/errors/gateway-errors";

/**
 * Executes an asynchronous operation with configurable retries and timeout.
 *
 * @param operation The asynchronous operation to execute.
 * @param logger The logger instance for logging.
 * @param errorToThrow The error to throw if all retries fail.
 * @param retries The string containing the number of retry attempts.
 * @param timeoutMs The string containing the timeout in milliseconds for each attempt.
 * @param fnTag An optional tag for logging messages.
 * @returns Promise resolved with the operation's result
 * @throws Error if the operation fails after all retries or times out
 */
export async function executeOperationWithRetriesAndTimeout<T>(
  operation: () => Promise<T>,
  retries: string,
  timeoutMs: string,
  errorToThrow: Error,
  logger: Logger,
  fnTag: string = "executeOperationWithRetriesAndTimeout",
): Promise<T> {
  // Validate input parameters
  validateOperationParameters(
    operation,
    retries,
    timeoutMs,
    errorToThrow,
    logger,
    fnTag,
  );

  // Convert retries and timeoutMs to numbers
  const retriesInt = parseInt(retries, 10);
  const timeoutMsInt = parseInt(timeoutMs, 10);

  const delayMs = 500; // Standard delay between retries
  logger.debug(
    `${fnTag}: Starting operation with ${retries} retries and ${timeoutMs}ms timeout`,
  );
  for (let attempt = 1; attempt <= retriesInt; attempt++) {
    try {
      // Create operation promise
      const operationPromise = operation();
      logger.debug(
        `${fnTag}: Attempt ${attempt} started for operation ${operation}`,
      );

      // Create timeout promise
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(
            new GatewayRetryOperationFailedError(
              `${fnTag}: Operation timed out after ${timeoutMsInt}ms`,
              null, // No specific cause provided
            ),
          );
        }, timeoutMsInt);
      });

      // Race between operation and timeout
      const result = await Promise.race([operationPromise, timeoutPromise]);

      return result;
    } catch (err) {
      logger.warn(
        `${fnTag}: Attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`,
      );

      // If not last attempt, wait before retrying
      if (attempt < retriesInt) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Last attempt failed
        logger.error(
          `${fnTag}: All retry attempts failed. Final error: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw errorToThrow;
      }
    }
  }

  // This should never be reached, but TypeScript requires a return
  throw errorToThrow;
}

/**
 * Validates the parameters for the executeOperationWithRetriesAndTimeout function.
 *
 * @param operation The asynchronous operation to execute.
 * @param retries The string containing the number of retry attempts.
 * @param timeoutMs The string containing the timeout in milliseconds for each attempt.
 * @param errorToThrow The error to throw if all retries fail.
 * @param logger The logger instance for logging.
 * @param fnTag An optional tag for logging messages.
 * @throws InvalidParameterError if any parameter is invalid
 */
function validateOperationParameters<T>(
  operation: () => Promise<T>,
  retries: string,
  timeoutMs: string,
  errorToThrow: Error,
  logger: Logger,
  fnTag: string,
): void {
  if (!operation) {
    throw new InvalidParameterError(
      `${fnTag}: The operation parameter must be a non-falsy function.`,
      "operation",
    );
  }

  if (retries === undefined || retries === null) {
    throw new InvalidParameterError(
      `${fnTag}: The retries parameter must not be undefined or null.`,
      "retries",
    );
  }

  const retriesInt = parseInt(retries, 10);

  if (isNaN(retriesInt)) {
    throw new InvalidParameterError(
      `${fnTag}: The retries parameter must be a number, not NaN.`,
      "retries",
    );
  }

  if (!isFinite(retriesInt)) {
    throw new InvalidParameterError(
      `${fnTag}: The retries parameter must be a finite number.`,
      "retries",
    );
  }

  if (retriesInt < 1) {
    throw new InvalidParameterError(
      `${fnTag}: The retries parameter must be a positive number.`,
      "retries",
    );
  }

  if (timeoutMs === undefined || timeoutMs === null) {
    throw new InvalidParameterError(
      `${fnTag}: The timeoutMs parameter must not be undefined or null.`,
      "timeoutMs",
    );
  }

  const timeoutMsInt = parseInt(timeoutMs, 10);

  if (isNaN(timeoutMsInt)) {
    throw new InvalidParameterError(
      `${fnTag}: The timeoutMs parameter must be a number, not NaN.`,
      "timeoutMs",
    );
  }

  if (!isFinite(timeoutMsInt)) {
    throw new InvalidParameterError(
      `${fnTag}: The timeoutMs parameter must be a finite number.`,
      "timeoutMs",
    );
  }

  if (timeoutMsInt < 1) {
    throw new InvalidParameterError(
      `${fnTag}: The timeoutMs parameter must be a positive number.`,
      "timeoutMs",
    );
  }

  if (!errorToThrow) {
    throw new InvalidParameterError(
      `${fnTag}: The errorToThrow parameter must be a non-falsy Error instance.`,
      "errorToThrow",
    );
  }

  if (!logger) {
    throw new InvalidParameterError(
      `${fnTag}: The logger parameter must be a non-falsy Logger instance.`,
      "logger",
    );
  }

  if (!fnTag || typeof fnTag !== "string" || fnTag.trim() === "") {
    throw new InvalidParameterError(
      `${fnTag}: The fnTag parameter must be a non-empty string.`,
      "fnTag",
    );
  }
}