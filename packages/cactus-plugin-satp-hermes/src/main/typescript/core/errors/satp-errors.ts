import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
export class SATPInternalError extends RuntimeError {
  protected errorType = SATPErrorType.UNSPECIFIED;
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

  public getSATPErrorType(): SATPErrorType {
    return this.errorType;
  }
}

export class BootstrapError extends SATPInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super(
      "Bootstrap already called in this Gateway Manager",
      cause ?? null,
      409,
      traceID,
      trace,
    );
  }
}

export class NonExistantGatewayIdentity extends SATPInternalError {
  constructor(
    id: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Gateway with id ${id} does not exist`,
      cause ?? null,
      404,
      traceID,
      trace,
    );
  }
}

export class GetApproveAddressError extends SATPInternalError {
  constructor(
    networkID: string,
    networkType: string,
    assetType: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Could not get approve address for network ${networkID}, ${networkType} and asset type ${assetType}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

export class GetStatusError extends SATPInternalError {
  constructor(
    sessionID: string,
    message: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Could not GetStatus at Session: with id ${sessionID}. Reason: ${message}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

export class TransactError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, failed to transact`, cause ?? null, 500);
  }
}

export class CreateSATPRequestError extends SATPInternalError {
  constructor(tag: string, message: string, cause?: string | Error | null) {
    super(
      `${tag}, failed to create SATP request: ${message}`,
      cause ?? null,
      500,
    );
  }
}

export class RetrieveSATPMessageError extends SATPInternalError {
  constructor(tag: string, message: string, cause?: string | Error | null) {
    super(
      `${tag}, failed to retrieve SATP message: ${message}`,
      cause ?? null,
      500,
    );
  }
}

export class RecoverMessageError extends SATPInternalError {
  constructor(tag: string, message: string, cause?: string | Error | null) {
    super(`${tag}, failed to recover message: ${message}`, cause ?? null, 500);
  }
}

export class BLODispatcherErraneousError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, failed because BLODispatcher is erroneous`,
      cause ?? null,
      500,
    );
  }
}
// TODO client-facing error logic, maps SATPInternalErrors to user friendly errors
export class SATPError extends Error {}
