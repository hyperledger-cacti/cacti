import { SATPInternalError } from "./satp-errors";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";

export class SessionNotFoundError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, session not found`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_NOT_FOUND;
  }
}

export class SessionIdNotFoundError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, session id not found`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_ID_NOT_FOUND;
  }
}

export class FailedToCreateMessageError extends SATPInternalError {
  constructor(
    tag: string,
    message: string,
    cause?: string | Error | null | undefined,
  ) {
    super(
      `${tag}, failed to create message: ${message} \n stack: ${cause}`,
      cause ?? null,
      500,
    );
  }
}

export class FailedToProcessError extends SATPInternalError {
  constructor(
    tag: string,
    message: string,
    cause?: string | Error | null | undefined,
  ) {
    super(
      `${tag}, failed to process: ${message} \n stack: ${cause}`,
      cause ?? null,
      500,
    );
  }
}

export class SenderGatewayNetworkIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, senderGatewayNetworkId is empty`, cause ?? null, 500);
    this.errorType = SATPErrorType.SENDER_GATEWAY_NETWORK_ID_NOT_FOUND;
  }
}

export class PubKeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, pubKey not found`, cause ?? null, 500);
    this.errorType = SATPErrorType.PUBLIC_KEY_NOT_FOUND;
  }
}
