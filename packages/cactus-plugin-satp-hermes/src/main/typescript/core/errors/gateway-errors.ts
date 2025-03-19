import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";

export class GatewayRetryOperationFailedError extends RuntimeError {
  constructor(
    public message: string,
    public cause: string | Error | null,
  ) {
    super(message, asError(cause));
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // make sure prototype chain is set to error
  }
}
