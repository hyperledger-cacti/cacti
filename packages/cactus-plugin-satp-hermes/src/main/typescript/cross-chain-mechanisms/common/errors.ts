import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";
import { OracleTaskModeEnum, OracleTaskTypeEnum } from "../../public-api";

export class BridgeInternalError extends RuntimeError {
  constructor(
    public message: string,
    public cause: string | Error | null,
    // TODO internal error codes
    public code: number = 500,
    public traceID?: string,
    public trace?: string,
  ) {
    super(message, asError(cause));
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // make sure prototype chain is set to error
    //this.stack = trace || new Error().stack;
  }
}

export class OntologyError extends BridgeInternalError {
  constructor(
    tag: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `${tag}, undefined Ontology, ontology is required to interact with tokens`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class TransactionError extends BridgeInternalError {
  constructor(
    tag: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(`${tag}, Transaction failed`, cause ?? null, 500, traceID, trace);
  }
}

export class TransactionIdUndefinedError extends BridgeInternalError {
  constructor(
    tag: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `${tag}, Transaction id undefined`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class ConnectorOptionsError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Connector options error", cause ?? null, 500, traceID, trace);
  }
}

export class UnsupportedNetworkError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Unsupported network", cause ?? null, 500, traceID, trace);
  }
}

export class NoSigningCredentialError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("No signing credential provided", cause ?? null, 500, traceID, trace);
  }
}

export class ReceiptError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Receipt not found", cause ?? null, 500, traceID, trace);
  }
}

export class ContractAddressError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Contract address not found", cause ?? null, 500, traceID, trace);
  }
}

export class TransactionReceiptError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Transaction receipt not found", cause ?? null, 500, traceID, trace);
  }
}

export class WrapperContractError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Wrapper contract error", cause ?? null, 500, traceID, trace);
  }
}

export class BungeeError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Bungee error", cause ?? null, 500, traceID, trace);
  }
}

export class InvalidWrapperContract extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Invalid wrapper contract error", cause ?? null, 500, traceID, trace);
  }
}

export class ChannelNameError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Channel name error", cause ?? null, 500, traceID, trace);
  }
}

export class ViewError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("View Error", cause ?? null, 500, traceID, trace);
  }
}

export class DeployLeafError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Deploying Leaf Error", cause ?? null, 500, traceID, trace);
  }
}

export class DeployOracleError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Deploying Oracle Error", cause ?? null, 500, traceID, trace);
  }
}

export class WrapperContractAlreadyCreatedError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super(
      "Wrapper Contract already created",
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class LeafError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Leaf Error", cause ?? null, 500, traceID, trace);
  }
}

export class ProofError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Proof Error", cause ?? null, 500, traceID, trace);
  }
}

export class ClaimFormatError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("ClaimFormatError", cause ?? null, 500, traceID, trace);
  }
}

export class ApproveAddressError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Approve Address Error", cause ?? null, 500, traceID, trace);
  }
}

export class OracleError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Oracle Error", cause ?? null, 500, traceID, trace);
  }
}

export class ReadAndUpdateTaskNoDataError extends BridgeInternalError {
  constructor(
    taskId: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Read and Update task with ID ${taskId} failed because no data was read`,
      cause ?? null,
      404,
      traceID,
      trace,
    );
  }
}

export class TaskNotFoundError extends BridgeInternalError {
  constructor(
    taskId: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(`Task with ${taskId} not found`, cause ?? null, 404, traceID, trace);
  }
}

export class InvalidTaskTypeError extends BridgeInternalError {
  constructor(
    taskType: string | undefined,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(`Invalid task type: ${taskType}`, cause ?? null, 400, traceID, trace);
  }
}

export class MissingParameterError extends BridgeInternalError {
  constructor(
    parametersName: string[],
    taskType: OracleTaskTypeEnum,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      parametersName.length > 1
        ? `Missing required parameters for ${taskType} task: ${parametersName.join(", ")}`
        : `Missing required parameter for ${taskType} task: ${parametersName[0]}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

export class MissingParameterRegisterError extends BridgeInternalError {
  constructor(
    parametersName: string[],
    taskType: OracleTaskTypeEnum,
    taskMode: OracleTaskModeEnum,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      parametersName.length > 1
        ? `Missing required parameters for ${taskType} task and mode ${taskMode}: ${parametersName.join(", ")}`
        : `Missing required parameter for ${taskType} task and mode ${taskMode}: ${parametersName[0]}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

export class InvalidParameterError extends BridgeInternalError {
  constructor(
    parametersName: string[],
    taskType: OracleTaskTypeEnum,
    taskMode: OracleTaskModeEnum,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      parametersName.length > 1
        ? `Invalid parameters for ${taskType} task and mode ${taskMode}: ${parametersName.join(", ")}`
        : `Invalid parameter for ${taskType} task and mode ${taskMode}: ${parametersName[0]}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

export class UninitializedMonitorServiceError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Uninitialized MonitorService", cause ?? null, 500, traceID, trace);
  }
}

export class PriceNotFoundError extends BridgeInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Price Not Found", cause ?? null, 500, traceID, trace);
  }
}
