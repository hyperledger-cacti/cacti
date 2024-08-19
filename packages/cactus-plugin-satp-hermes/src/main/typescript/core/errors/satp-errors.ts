export class SATPInternalError extends Error {
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

export class BootstrapError extends SATPInternalError {
  constructor(traceID?: string, trace?: string) {
    super(
      "Bootstrap already called in this Gateway Manager",
      409,
      traceID,
      trace,
    );
  }
}

export class NonExistantGatewayIdentity extends SATPInternalError {
  constructor(id: string, traceID?: string, trace?: string) {
    super(`Gateway with id ${id} does not exist`, 404, traceID, trace);
  }
}

export class GetStatusError extends SATPInternalError {
  constructor(
    sessionID: string,
    message: string,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Could not GetStatus at Session: with id ${sessionID}. Reason: ${message}`,
      400,
      traceID,
      trace,
    );
  }
}
// TODO client-facing error logic, maps SATPInternalErrors to user friendly errors
export class SATPError extends Error {}
