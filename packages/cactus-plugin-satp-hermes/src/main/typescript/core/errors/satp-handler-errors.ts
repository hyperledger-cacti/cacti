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
  constructor(tag: string, message: string) {
    super(`${tag}, failed to create message: ${message}`, 500);
  }
}

export class FailedToProcessError extends SATPInternalError {
  constructor(tag: string, message: string) {
    super(`${tag}, failed to process: ${message}`, 500);
  }
}
