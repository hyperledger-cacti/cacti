import { SATPInternalError } from "./satp-errors";

export class SessionNotFoundError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, session not found`, 500);
  }
}

export class SessionIdNotFoundError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, session id not found`, 500);
  }
}

export class FailedToCreateMessageError extends SATPInternalError {
  constructor(tag: string, message: string, cause?: Error) {
    super(
      `${tag}, failed to create message: ${message} \n stack: ${cause}`,
      500,
    );
  }
}

export class FailedToProcessError extends SATPInternalError {
  constructor(tag: string, message: string, cause?: Error) {
    super(`${tag}, failed to process: ${message} \n stack: ${cause}`, 500);
  }
}

export class SenderGatewayNetworkIdError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, senderGatewayNetworkId is empty`, 500);
  }
}

export class PubKeyError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, pubKey not found`, 500);
  }
}
