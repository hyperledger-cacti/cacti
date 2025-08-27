import {
  GatewayRetryOperationFailedError,
  InvalidParameterError,
} from "../api1/gateway-errors";
import { SATPLogger } from "./satp-logger";

/**
 * Executes an asynchronous operation with configurable retries and timeout.
 * This function handles retries for failures and timeouts.
 *
 * @param operation The asynchronous operation to execute.
 * @param logger The SATPLogger instance for logging.
 * @param errorToThrow The error to throw if all retries fail.
 * @param retries The number of retry attempts.
 * @param timeoutMs The timeout in milliseconds for each attempt.
 * @param fnTag An optional tag for logging messages.
 * @returns Promise resolved with the operation's result
 * @throws Error if the operation fails after all retries or times out
 */
export async function executeOperationWithRetriesAndTimeout<T>(
  operation: () => Promise<T>,
  retries: string,
  timeoutMs: string,
  errorToThrow: Error,
  logger: SATPLogger,
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
  const delayMs = 2000; // Standard delay between retries

  const attemptErrors: Error[] = [];

  for (let attempt = 1; attempt <= retriesInt; attempt++) {
    const startTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      logger.debug(`${fnTag}: Attempt ${attempt} started.`);
      const operationPromise = operation();

      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          const duration = Date.now() - startTime;
          reject(
            new GatewayRetryOperationFailedError(
              `Operation timed out after ${duration}ms, exceeding the configured timeout of ${timeoutMsInt}ms.`,
              null,
            ),
          );
        }, timeoutMsInt);
        if (timeoutId.unref) {
          timeoutId.unref();
        }
      });

      const result = await Promise.race([operationPromise, timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId as NodeJS.Timeout);
      }
      return result;
    } catch (err) {
      // Clear the timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const duration = Date.now() - startTime;
      logger.warn(`${fnTag}: Attempt ${attempt} Failed after ${duration}ms`);

      attemptErrors.push(err);

      // We only retry if this is not the last attempt
      if (attempt < retriesInt) {
        logger.debug(`${fnTag}: Waiting ${delayMs}ms before next retry.`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // If we reach here, all attempts have failed.
  logger.error(
    `${fnTag}: All retry attempts failed. The following errors occurred:`,
  );
  attemptErrors.forEach((error, index) => {
    logger.error(`--- Failure on attempt ${index + 1} ---`);
    logger.error(`Error: ${error}`);
  });

  // Throw a new, comprehensive error summarizing the failures.
  throw errorToThrow;
}

/**
 * Validates the parameters for the executeOperationWithRetriesAndTimeout function.
 *
 * @param operation The asynchronous operation to execute.
 * @param retries The string containing the number of retry attempts.
 * @param timeoutMs The string containing the timeout in milliseconds for each attempt.
 * @param errorToThrow The error to throw if all retries fail.
 * @param logger The SATPLogger instance for logging.
 * @param fnTag An optional tag for logging messages.
 * @throws InvalidParameterError if any parameter is invalid
 */
function validateOperationParameters<T>(
  operation: () => Promise<T>,
  retries: string,
  timeoutMs: string,
  errorToThrow: Error,
  logger: SATPLogger,
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
