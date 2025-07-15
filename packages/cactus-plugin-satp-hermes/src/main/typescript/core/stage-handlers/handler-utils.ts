import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import { SessionIdNotFoundError } from "../errors/satp-handler-errors";

export function getSessionId(obj: any): string {
  const fnTag = "handlerUtils#getSessionId";
  const tracer = trace.getTracer("satp-hermes-tracer");
  const span = tracer.startSpan(fnTag);
  const ctx = trace.setSpan(context.active(), span);
  return context.with(ctx, () => {
    try {
      if (!obj.common.sessionId) {
        throw new SessionIdNotFoundError("getSessionId");
      }
      return obj.common.sessionId;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
