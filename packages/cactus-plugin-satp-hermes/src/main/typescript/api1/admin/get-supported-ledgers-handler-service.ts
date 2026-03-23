import type { SATPManager } from "../../services/gateway/satp-manager";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";

export interface SupportedLedgersResponse {
  supportedLedgers: string[];
}

export async function executeGetSupportedLedgers(
  logLevel: LogLevelDesc,
  manager: SATPManager,
): Promise<SupportedLedgersResponse> {
  const fnTag = "executeGetSupportedLedgers()";
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  log.info(`${fnTag}, Obtaining supported ledgers...`);

  const supportedLedgers = manager.getSupportedLedgers();

  return {
    supportedLedgers: supportedLedgers.map((l) => String(l)),
  };
}
