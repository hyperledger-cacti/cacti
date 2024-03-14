export class BootstrapError extends Error {
  constructor() {
    super("Bootstrap already called in this Gateway Manager");
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, BootstrapError.prototype);
  }
}

export class NonExistantGatewayIdentity extends Error {
  constructor(id: string) {
    super(`Gateway with id ${id} does not exist`);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, BootstrapError.prototype);
  }
}


export class GetStatusError extends Error {
  constructor(sessionID: string, message: string) {
    super(`Could not GetStatus at Session: with id ${sessionID}. Reason: ${message}`);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, GetStatusError.prototype);
  }
}
