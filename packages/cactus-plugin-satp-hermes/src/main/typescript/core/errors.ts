export class SATPError extends Error {
  constructor(
    message: string,
    public code: number = 500,
    public internalErrorId?: string,
    public trace?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // make sure prototype chain is set to error
    this.stack = trace || new Error().stack;
  }
}

export class BootstrapError extends SATPError {
  constructor(internalErrorId?: string, trace?: string) {
    super(
      "Bootstrap already called in this Gateway Manager",
      409,
      internalErrorId,
      trace,
    );
  }
}

export class NonExistantGatewayIdentity extends SATPError {
  constructor(id: string, internalErrorId?: string, trace?: string) {
    super(`Gateway with id ${id} does not exist`, 404, internalErrorId, trace);
  }
}

export class GetStatusError extends SATPError {
  constructor(
    sessionID: string,
    message: string,
    internalErrorId?: string,
    trace?: string,
  ) {
    super(
      `Could not GetStatus at Session: with id ${sessionID}. Reason: ${message}`,
      400,
      internalErrorId,
      trace,
    );
  }
}
