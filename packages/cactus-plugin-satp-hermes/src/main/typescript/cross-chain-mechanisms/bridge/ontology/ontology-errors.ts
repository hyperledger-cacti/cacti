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
