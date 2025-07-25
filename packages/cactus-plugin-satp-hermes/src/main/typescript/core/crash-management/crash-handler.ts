import type { ConnectRouter } from "@connectrpc/connect";
import type { SATPLogger as Logger } from "../../core/satp-logger";
import {
  CrashRecoveryService,
  type RecoverSuccessResponse,
} from "../../generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import type { CrashRecoveryServerService } from "./server-service";
import type { CrashRecoveryClientService } from "./client-service";
import type {
  RecoverRequest,
  RecoverResponse,
  RecoverSuccessRequest,
  RollbackRequest,
  RollbackResponse,
  RollbackState,
} from "../../generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import { type SATPHandler, SATPHandlerType } from "../../types/satp-protocol";
import type { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

export class CrashRecoveryHandler implements SATPHandler {
  private readonly log: Logger;

  constructor(
    private readonly serverService: CrashRecoveryServerService,
    private readonly clientService: CrashRecoveryClientService,
    log: Logger,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryHandler.name}`);
  }

  public getHandlerIdentifier(): SATPHandlerType {
    return SATPHandlerType.CRASH;
  }

  public getHandlerSessions(): string[] {
    return [];
  }

  public getStage(): string {
    return "crash";
  }

  // Server-side

  private async recoverImplementation(
    req: RecoverRequest,
  ): Promise<RecoverResponse> {
    const fnTag = `${CrashRecoveryHandler.name}#recoverV2MessageImplementation`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag} - Handling RecoverRequest: ${req}`);
        try {
          return await this.serverService.handleRecover(req);
        } catch (error) {
          this.log.error(`${fnTag} - Error:`, error);
          throw error;
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async recoverSuccessImplementation(
    req: RecoverSuccessRequest,
  ): Promise<RecoverSuccessResponse> {
    const fnTag = `${CrashRecoveryHandler.name}#recoverSuccessImplementation`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag} - Handling RecoverSuccessRequest:${req}`);
        try {
          return await this.serverService.handleRecoverSuccess(req);
        } catch (error) {
          this.log.error(`${fnTag} - Error:`, error);
          throw error;
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async rollbackImplementation(
    req: RollbackRequest,
  ): Promise<RollbackResponse> {
    const fnTag = `${CrashRecoveryHandler.name}#rollbackImplementation`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag} - Handling RollbackRequest: ${req}`);
        try {
          return await this.serverService.handleRollback(req);
        } catch (error) {
          this.log.error(`${fnTag} - Error:`, error);
          throw error;
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  public setupRouter(router: ConnectRouter): void {
    const fnTag = `${CrashRecoveryHandler.name}#setupRouter`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(CrashRecoveryService, {
          async recover(req) {
            return await that.recoverImplementation(req);
          },
          async recoverSuccess(req) {
            return await that.recoverSuccessImplementation(req);
          },
          async rollback(req) {
            return await that.rollbackImplementation(req);
          },
        });

        this.log.info("Router setup completed for CrashRecoveryHandler");
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Client-side

  public async sendRecoverRequest(
    session: SessionData,
  ): Promise<RecoverRequest> {
    const fnTag = `${this.constructor.name}#createRecoverRequest`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        try {
          return this.clientService.createRecoverRequest(session);
        } catch (error) {
          this.log.error(
            `${fnTag} - Failed to create RecoverRequest: ${error}`,
          );
          throw new Error(`Error in createRecoverRequest: ${error}`);
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  public async sendRecoverSuccessRequest(
    session: SessionData,
  ): Promise<RecoverSuccessRequest> {
    const fnTag = `${this.constructor.name}#createRecoverSuccessRequest`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        try {
          return await this.clientService.createRecoverSuccessRequest(session);
        } catch (error) {
          this.log.error(
            `${fnTag} - Failed to create RecoverSuccessRequest: ${error}`,
          );
          throw new Error(`Error in createRecoverSuccessRequest: ${error}`);
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  public async sendRollbackRequest(
    session: SessionData,
    rollbackState: RollbackState,
  ): Promise<RollbackRequest> {
    const fnTag = `${this.constructor.name}#createRollbackRequest`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        try {
          return await this.clientService.createRollbackRequest(
            session,
            rollbackState,
          );
        } catch (error) {
          this.log.error(
            `${fnTag} - Failed to create RollbackRequest: ${error}`,
          );
          throw new Error(`Error in createRollbackRequest: ${error}`);
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
