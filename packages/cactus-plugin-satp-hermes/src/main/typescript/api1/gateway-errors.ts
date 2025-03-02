import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";
import { Error as GatewayErrorType } from "../generated/proto/cacti/satp/v02/common/message_pb";
export class GatewayError extends RuntimeError {
  protected errorType = GatewayErrorType.UNSPECIFIED;
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
  }

  public getGatewayErrorType(): GatewayErrorType {
    return this.errorType;
  }
}

export class GatewayShuttingDownError extends GatewayError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, shutdown initiated not receiving new requests`, cause ?? null, 500);
  }
}