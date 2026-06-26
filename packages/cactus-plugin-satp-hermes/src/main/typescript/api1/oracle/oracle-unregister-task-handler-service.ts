import { LoggerProvider, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import { OracleManager } from "../../cross-chain-mechanisms/oracle/oracle-manager";
import { OracleUnregisterRequest, OracleTask } from "../../public-api";

export async function unregisterTask(
  logLevel: LogLevelDesc,
  req: OracleUnregisterRequest,
  manager: OracleManager,
): Promise<OracleTask> {
  const fnTag = `unregisterTask()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, executing task unregistration endpoint`);

  return await manager.unregisterTask(req.taskID);
}
