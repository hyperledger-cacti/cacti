import { SessionIdNotFoundError } from "../errors/satp-handler-errors";

export function getSessionId(obj: any): string {
  if (!obj.common.sessionId) {
    throw new SessionIdNotFoundError("getSessionId");
  }
  return obj.common.sessionId;
}
