import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";

export class OntologyInternalError extends RuntimeError {
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

export class OntologyNotFoundError extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Ontology not found", cause ?? null, 500, traceID, trace);
  }
}

export class LedgerNotSupported extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Ledger not supported", cause ?? null, 500, traceID, trace);
  }
}

export class InvalidOntologyHash extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Invalid ontology hash", cause ?? null, 500, traceID, trace);
  }
}

export class InvalidOntologySignature extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Invalid ontology signature", cause ?? null, 500, traceID, trace);
  }
}

export class OntologyFunctionNotAvailable extends OntologyInternalError {
  constructor(
    nonAvailableFunction: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Ontology function ${nonAvailableFunction} stated as not available`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class OntologyFunctionVariableNotSupported extends OntologyInternalError {
  constructor(
    variable: string,
    ledgerType: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Ontology function variable ${variable} not supported by ledger ${ledgerType}`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class UnknownInteractionError extends OntologyInternalError {
  constructor(
    interaction: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Unknown interaction type: ${interaction}`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class InteractionWithoutFunctionError extends OntologyInternalError {
  constructor(
    interaction: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Interaction ${interaction} does not have any function defined`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class InvalidBytecodeError extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super(
      "Ontology contains invalid bytecode",
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}
