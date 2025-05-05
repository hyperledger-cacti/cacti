import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { OracleManager } from "../../cross-chain-mechanisms/oracle/oracle-manager";
import {
  OracleRegisterRequest,
  OracleTask,
  OracleTaskModeEnum,
  OracleTaskStatusEnum,
  OracleTaskTypeEnum,
} from "../../public-api";
import { v4 as uuidv4 } from "uuid";
import { InvalidParameterError, MissingParameterRegisterError } from "../../cross-chain-mechanisms/common/errors";

export async function registerTask(
  logLevel: LogLevelDesc,
  req: OracleRegisterRequest,
  manager: OracleManager,
): Promise<OracleTask> {
  const fnTag = `registerTask()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, executing task registration endpoint`);

  let type: OracleTaskTypeEnum;

  if (req.taskMode === OracleTaskModeEnum.Polling) {
    if (!req.pollingInterval) {
      throw new MissingParameterRegisterError(
        ["pollingInterval"],
        req.taskType,
        OracleTaskModeEnum.Polling,
      );
    }

    if (req.listeningOptions) {
      throw new InvalidParameterError(
        ["listeningOptions"],
        req.taskType,
        OracleTaskModeEnum.Polling,
      );
    }
  }

  if (req.taskMode === OracleTaskModeEnum.EventListening) {
    if (!req.listeningOptions) {
      throw new MissingParameterRegisterError(
        ["listeningOptions"],
        req.taskType,
        OracleTaskModeEnum.EventListening,
      );
    }

    if (!req.listeningOptions.eventSignature) {
      throw new MissingParameterRegisterError(
        ["listeningOptions.eventSignature"],
        req.taskType,
        OracleTaskModeEnum.EventListening,
      );
    }

    if (!isValidEventSignature(req.listeningOptions.eventSignature)) {
      throw new InvalidParameterError(
        ["listeningOptions.eventSignature"],
        req.taskType,
        OracleTaskModeEnum.EventListening,
      );
    }

    if (req.pollingInterval) {
      throw new InvalidParameterError(
        ["pollingInterval"],
        req.taskType,
        OracleTaskModeEnum.EventListening,
      );
    }
  }

  switch (req.taskType) {
    case "READ": {
      if (req.destinationContract || req.destinationNetworkId) {
        logger.info(
          `${fnTag} - parameters of destination network will be ignored for a READ task`,
        );
      }

      if (
        !req.sourceNetworkId ||
        !req.sourceContract ||
        !req.sourceContract.contractName
      ) {
        throw new MissingParameterRegisterError(
          ["sourceNetworkId", "sourceContract", "sourceContract.contractName"],
          OracleTaskTypeEnum.Read,
          req.taskMode,
        );
      }

      if (req.taskMode === OracleTaskModeEnum.Polling) {
        if (!req.sourceContract.methodName || !req.sourceContract.params) {
          throw new MissingParameterRegisterError(
            ["sourceContract.methodName", "sourceContract.params"],
            OracleTaskTypeEnum.Read,
            req.taskMode,
          );
        }
      } else if (req.taskMode === OracleTaskModeEnum.EventListening) {
        if (req.sourceContract.methodName || req.sourceContract.params) {
          logger.info(
            `${fnTag} - sourceContract.methodName and sourceContract.params will be ignored for EVENT_LISTENING mode`,
          );
        }
      }

      type = OracleTaskTypeEnum.Read;
      break;
    }
    case "UPDATE": {
      if (req.sourceContract || req.sourceNetworkId) {
        logger.info(
          `${fnTag} - parameters of source network will be ignored for an UPDATE task`,
        );
      }

      if (
        !req.destinationNetworkId ||
        !req.destinationContract
      ) {
        throw new MissingParameterRegisterError(
          [
            "destinationNetworkId",
            "destinationContract",
          ],
          OracleTaskTypeEnum.Update,
          req.taskMode,
        );
      }

      if (
        !req.destinationContract?.methodName &&
        !req.destinationContract.params
      ) {
        throw new MissingParameterRegisterError(
          [
            "destinationContract.methodName",
            "destinationContract.params",
          ],
          OracleTaskTypeEnum.Update,
          req.taskMode,
        );
      }

      if (req.taskMode === OracleTaskModeEnum.Polling) {
        if (
          !req.destinationContract.methodName ||
          !req.destinationContract.params
        ) {
          throw new MissingParameterRegisterError(
            [
              "destinationContract.methodName",
              "destinationContract.params",
            ],
            OracleTaskTypeEnum.Update,
            req.taskMode,
          );
        }
      } else if (req.taskMode === OracleTaskModeEnum.EventListening) {
        if (
          req.destinationContract.methodName ||
          req.destinationContract.params
        ) {
          logger.info(
            `${fnTag} - destinationContract.methodName and destinationContract.params will be ignored for EVENT_LISTENING mode`,
          );
        }
      }
      type = OracleTaskTypeEnum.Update;
      break;
    }
    case "READ_AND_UPDATE": {
      if (
        !req.sourceNetworkId ||
        !req.sourceContract ||
        !req.destinationNetworkId ||
        !req.destinationContract
      ) {
        throw new MissingParameterRegisterError(
          [
            "sourceNetworkId",
            "sourceContract",
            "destinationNetworkId",
            "destinationContract",
          ],
          OracleTaskTypeEnum.ReadAndUpdate,
          req.taskMode,
        );
      }

      if (
        !req.sourceContract.methodName &&
        !req.sourceContract.params &&
        !req.listeningOptions?.eventSignature
      ) {
        throw new MissingParameterRegisterError(
          [
            "sourceContract.methodName",
            "sourceContract.params",
            "listeningOptions.eventSignature",
          ],
          OracleTaskTypeEnum.ReadAndUpdate,
          req.taskMode,
        );
      }

      type = OracleTaskTypeEnum.ReadAndUpdate;
      break;
    }
    default: {
      throw new Error(`${fnTag}, Unsupported task type: ${req.taskType}`);
    }
  }

  // Create the task object
  const task = {
    taskID: uuidv4(),
    type: type,
    srcNetworkId: req.sourceNetworkId,
    dstNetworkId: req.destinationNetworkId,
    srcContract: req.sourceContract,
    dstContract: req.destinationContract,
    mode: req.taskMode,
    status: OracleTaskStatusEnum.Active,
    timestamp: Date.now(),
    pollingInterval:
      req.taskMode === "POLLING" ? req.pollingInterval : undefined,
    operations: [],
    listeningOptions: req.listeningOptions,
  } as OracleTask;

  return await manager.registerTask(task);
}

function isValidEventSignature(signature: string): boolean {
  if (!signature || typeof signature !== "string" || signature.length === 0) {
    return false;
  }

  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*\s*\(\s*([a-zA-Z0-9_]+\s*(,\s*[a-zA-Z0-9_]+\s*)*)?\)$/;
  return regex.test(signature);
}
