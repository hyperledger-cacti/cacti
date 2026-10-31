import type { Logger } from "@hyperledger-cacti/cactus-common";
import type { ICantonInternalLogger } from "./types";

export const SANITIZED_LOG_MESSAGE = "Canton Wallet SDK emitted a log entry.";

/**
 * Creates a logger for Canton SDK internals that forwards only the severity.
 * Context and message values can contain credentials, HTTP payloads, or party
 * data, so they are never passed to Cacti's logger.
 */
export function createSeverityOnlyLogger(log: Logger): ICantonInternalLogger {
  const logger: ICantonInternalLogger = {
    trace: () => log.trace(SANITIZED_LOG_MESSAGE),
    debug: () => log.debug(SANITIZED_LOG_MESSAGE),
    info: () => log.info(SANITIZED_LOG_MESSAGE),
    warn: () => log.warn(SANITIZED_LOG_MESSAGE),
    error: () => log.error(SANITIZED_LOG_MESSAGE),
    fatal: () => log.error(SANITIZED_LOG_MESSAGE),
    child: () => logger,
  };
  return logger;
}
