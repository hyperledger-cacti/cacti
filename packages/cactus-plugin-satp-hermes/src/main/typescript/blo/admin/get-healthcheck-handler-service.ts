import { GetStatusError } from "../../core/errors/satp-errors";
import { HealthCheckResponse } from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPManager } from "../../gol/satp-manager";

export async function executeGetHealthCheck(
  logLevel: LogLevelDesc,
  manager: SATPManager,
): Promise<HealthCheckResponse> {
  const fnTag = `executeGetHealthCheck()`;
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  try {
    const result = await getHealthCheckService(logLevel, manager);
    return result;
  } catch (error) {
    if (error instanceof GetStatusError) {
      log.error(`${fnTag}, Error getting status: ${error.message}`);
      throw error;
    } else {
      log.error(`${fnTag}, Unexpected error: ${error.message}`);
      throw new Error("An unexpected error occurred while obtaining status.");
    }
  }
}

// TODO call SATP core, use try catch to propagate errors
export async function getHealthCheckService(
  logLevel: LogLevelDesc,
  manager: SATPManager,
): Promise<HealthCheckResponse> {
  const fnTag = `getHealthCheckService()`;
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  const status = manager.healthCheck();

  const res: HealthCheckResponse = {
    status: status,
  };

  log.debug(res);

  return res;
}
