import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { OracleManager } from "../../cross-chain-mechanisms/oracle/oracle-manager";
import {
  BusinessLogicContract,
  OracleExecuteRequest,
  OracleExecuteRequestTaskTypeEnum,
  OracleTask,
  OracleTaskModeEnum,
  OracleTaskStatusEnum,
  OracleTaskTypeEnum,
} from "../../public-api";

import { v4 as uuidv4 } from "uuid";
import {
  InvalidTaskTypeError,
  MissingParameterError,
} from "../../cross-chain-mechanisms/common/errors";

export async function executeTask(
  logLevel: LogLevelDesc,
  req: OracleExecuteRequest,
  manager: OracleManager,
): Promise<OracleTask> {
  const fnTag = `executeTask()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, executing task execution endpoint`);

  let taskType;

  switch (req.taskType) {
    case OracleExecuteRequestTaskTypeEnum.Read: {
      if (req.destinationContract || req.destinationNetworkId) {
        logger.info(
          `${fnTag} - parameters of destination network will be ignored for a READ task`,
        );
      }

      if (!req.sourceNetworkId || !req.sourceContract) {
        throw new MissingParameterError(
          ["sourceNetworkId", "sourceContract"],
          OracleTaskTypeEnum.Read,
        );
      }

      if (
        !req.sourceContract.methodName ||
        !req.sourceContract.contractName ||
        !req.sourceContract.params
      ) {
        throw new MissingParameterError(
          ["methodName", "contractName", "params"],
          OracleTaskTypeEnum.Read,
        );
      }

      taskType = OracleTaskTypeEnum.Read;
      break;
    }
    case OracleExecuteRequestTaskTypeEnum.Update: {
      if (req.sourceContract || req.sourceNetworkId) {
        logger.info(
          `${fnTag} - parameters of source network will be ignored for an UPDATE task`,
        );
      }

      if (!req.destinationNetworkId || !req.destinationContract) {
        throw new MissingParameterError(
          ["destinationNetworkId", "destinationContract"],
          OracleTaskTypeEnum.Update,
        );
      }

      if (
        !req.destinationContract.methodName ||
        !req.destinationContract.contractName ||
        !req.destinationContract.params
      ) {
        throw new MissingParameterError(
          ["methodName", "contractName", "params"],
          OracleTaskTypeEnum.Update,
        );
      }

      taskType = OracleTaskTypeEnum.Update;
      break;
    }
    case OracleExecuteRequestTaskTypeEnum.ReadAndUpdate: {
      if (
        !req.sourceNetworkId ||
        !req.sourceContract ||
        !req.destinationNetworkId ||
        !req.destinationContract
      ) {
        throw new MissingParameterError(
          [
            "sourceNetworkId",
            "sourceContract",
            "destinationNetworkId",
            "destinationContract",
          ],
          OracleTaskTypeEnum.ReadAndUpdate,
        );
      }

      if (
        !req.sourceContract.methodName ||
        !req.sourceContract.contractName ||
        !req.sourceContract.params
      ) {
        throw new MissingParameterError(
          ["methodName", "contractName", "params"],
          OracleTaskTypeEnum.ReadAndUpdate,
        );
      }

      if (
        !req.destinationContract.methodName ||
        !req.destinationContract.contractName
      ) {
        throw new MissingParameterError(
          ["methodName", "contractName"],
          OracleTaskTypeEnum.ReadAndUpdate,
        );
      }

      taskType = OracleTaskTypeEnum.ReadAndUpdate;
      break;
    }
    default:
      throw new InvalidTaskTypeError(req.taskType);
  }

  const task: OracleTask = {
    taskID: uuidv4(),
    type: taskType,
    srcNetworkId: req.sourceNetworkId,
    srcContract: req.sourceContract as BusinessLogicContract,
    dstNetworkId: req.destinationNetworkId,
    dstContract: req.destinationContract as BusinessLogicContract,
    timestamp: Date.now(),
    status: OracleTaskStatusEnum.Active,
    operations: [],
    mode: OracleTaskModeEnum.Immediate,
  };

  // execute the task
  const response = await manager.executeTask(task);

  return response;
}
