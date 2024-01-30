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
