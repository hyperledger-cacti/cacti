import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { OracleManager } from "../../cross-chain-mechanisms/oracle/oracle-manager";
import { OracleStatusRequest, OracleTask } from "../../public-api";

export async function getTaskStatus(
  logLevel: LogLevelDesc,
  req: OracleStatusRequest,
  manager: OracleManager,
): Promise<OracleTask> {
  const fnTag = `executeTask()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, executing task status endpoint`);

  if (!req.taskID) {
    throw new Error(`${fnTag} - missing required parameters for task status`);
  }

  return manager.getTask(req.taskID);
}
