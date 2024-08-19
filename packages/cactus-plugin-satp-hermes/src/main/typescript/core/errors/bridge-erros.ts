export class BridgeInternalError extends Error {
  constructor(
    public message: string,
    // TODO internal error codes
    public code: number = 500,
    public traceID?: string,
    public trace?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // make sure prototype chain is set to error
    //this.stack = trace || new Error().stack;
  }
}

export class OntologyError extends BridgeInternalError {
  constructor(tag: string) {
    super(
      `${tag}, undefined Ontology, ontology is required to interact with tokens`,
      500,
    );
  }
}

export class TransactionError extends BridgeInternalError {
  constructor(tag: string) {
    super(`${tag}, Transaction failed`, 500);
  }
}

export class TransactionIdUndefinedError extends BridgeInternalError {
  constructor(tag: string) {
    super(`${tag}, Transaction id undefined`, 500);
  }
}
