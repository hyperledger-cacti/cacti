import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { OracleManager } from "../../cross-chain-mechanisms/oracle/oracle-manager";
import {
  OracleOperation,
  OracleStatusRequest,
  OracleTask,
} from "../../public-api";

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

  const task = manager.getTask(req.taskID);

  const returnTask = {
    taskID: task.taskID,
    type: task.type,
    srcNetworkId: task.srcNetworkId,
    srcContract: task.srcContract,
    dstNetworkId: task.dstNetworkId,
    dstContract: task.dstContract,
    timestamp: task.timestamp,
    operations: task.operations.map((operation: OracleOperation) => ({
      id: operation.id,
      type: operation.type,
      networkId: operation.networkId,
      contract: {
        contractName: operation.contract.contractName,
        contractAddress: operation.contract.contractAddress,
        methodName: operation.contract.methodName,
        params: operation.contract.params,
      },
      status: operation.status,
      output: operation.output,
      timestamp: operation.timestamp,
    })),
    status: task.status,
    mode: task.mode,
    pollingInterval: task.pollingInterval,
    listeningOptions: task.listeningOptions,
  } as unknown as OracleTask;

  // we will clean the task for the user and remove any bytecode and abis from the response
  // otherwise, the output is very large and not user friendly

  return returnTask;
}
