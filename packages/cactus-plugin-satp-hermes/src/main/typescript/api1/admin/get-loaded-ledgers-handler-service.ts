import type { SATPManager } from "../../services/gateway/satp-manager";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import type { NetworkId } from "../../generated/gateway-client/typescript-axios/api";

export interface LoadedLedgersResponse {
  loadedLedgers: NetworkId[];
}

export async function executeGetLoadedLedgers(
  logLevel: LogLevelDesc,
  manager: SATPManager,
): Promise<LoadedLedgersResponse> {
  const fnTag = "executeGetLoadedLedgers()";
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  log.info(`${fnTag}, Obtaining loaded ledgers...`);

  const loadedLedgers = manager.getLoadedLedgers();

  return {
    loadedLedgers,
  };
}
