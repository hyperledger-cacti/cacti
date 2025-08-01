import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { Stage2ServerService } from "../stage-services/server/stage2-server-service";
import { SATPSession } from "../satp-session";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { SatpLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import {
  LockAssertionResponse,
  LockAssertionRequest,
} from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { Stage2ClientService } from "../stage-services/client/stage2-client-service";
import { TransferCommenceResponse } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { getSessionId } from "./handler-utils";
import { getMessageTypeName } from "../satp-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { saveMessageInSessionData, setError } from "../session-utils";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
export class Stage2SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE2;
  private sessions: Map<string, SATPSession>;
  private serverService: Stage2ServerService;
  private clientService: Stage2ClientService;
  private logger: Logger;
  private readonly monitorService: MonitorService;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage2ServerService;
    this.clientService = ops.clientService as Stage2ClientService;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.logger.trace(`Initialized ${Stage2SATPHandler.CLASS_NAME}`);
  }

  public get Log(): Logger {
    return this.logger;
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage2SATPHandler.CLASS_NAME;
  }

  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getStage(): string {
    return Stage.STAGE2;
  }

  async LockAssertionImplementation(
    req: LockAssertionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<LockAssertionResponse> {
    const stepTag = `LockAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Lock Assertion...`);
          this.Log.debug(`${fnTag}, Request: ${req}`);

          session = this.sessions.get(getSessionId(req));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          await this.serverService.checkLockAssertionRequest(req, session);

          saveMessageInSessionData(session.getServerSessionData(), req);

          const message = await this.serverService.lockAssertionResponse(
            req,
            session,
          );

          this.Log.debug(`${fnTag}, Returning response: ${message}`);

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.ASSERTION_RECEIPT),
            );
          }

          saveMessageInSessionData(session.getServerSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.ASSERTION_RECEIPT),
              error,
            )}`,
          );
          setError(session, MessageType.ASSERTION_RECEIPT, error);
          return await this.serverService.lockAssertionErrorResponse(
            error,
            session,
          );
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  setupRouter(router: ConnectRouter): void {
    const fnTag = `${this.getHandlerIdentifier()}#setupRouter()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(SatpStage2Service, {
          async lockAssertion(req) {
            return await that.LockAssertionImplementation(req);
          },
        });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  //client side
  async LockAssertionRequest(
    response: TransferCommenceResponse,
  ): Promise<LockAssertionRequest> {
    const stepTag = `LockAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Lock Assertion Request Message...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          await this.clientService.checkTransferCommenceResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          await this.clientService.lockAsset(session);

          const request = await this.clientService.lockAssertionRequest(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.LOCK_ASSERT),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.LOCK_ASSERT),
              error,
            )}`,
          );
          setError(session, MessageType.LOCK_ASSERT, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.LOCK_ASSERT),
            error,
          );
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
