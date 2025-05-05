import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";

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
