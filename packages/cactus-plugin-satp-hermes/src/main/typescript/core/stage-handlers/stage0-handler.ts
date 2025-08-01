import { SatpLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { SATPSession } from "../satp-session";
import { Stage0ServerService } from "../stage-services/server/stage0-server-service";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  PreSATPTransferResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import { Stage0ClientService } from "../stage-services/client/stage0-client-service";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  PubKeyError,
  SenderGatewayNetworkIdError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { saveMessageInSessionData, setError } from "../session-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { getMessageTypeName } from "../satp-utils";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

export class Stage0SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE0;
  private sessions: Map<string, SATPSession>;
  private serverService: Stage0ServerService;
  private clientService: Stage0ClientService;
  private logger: Logger;
  private pubKeys: Map<string, string>;
  private gatewayId: string;
  private readonly monitorService: MonitorService;
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage0ServerService;
    this.clientService = ops.clientService as Stage0ClientService;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.logger.trace(`Initialized ${Stage0SATPHandler.CLASS_NAME}`);
    this.pubKeys = ops.pubkeys;
    this.gatewayId = ops.gatewayId;
  }
  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage0SATPHandler.CLASS_NAME;
  }

  getStage(): string {
    return Stage.STAGE0;
  }

  public get Log(): Logger {
    return this.logger;
  }

  private async NewSessionImplementation(
    req: NewSessionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<NewSessionResponse> {
    const stepTag = `NewSessionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, New Session...`);
          //console.log("aii: ", stringify(req));
          this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

          session = this.sessions.get(req.sessionId);

          if (req.gatewayId == "") {
            throw new SenderGatewayNetworkIdError(fnTag);
          }

          if (!this.pubKeys.has(req.gatewayId)) {
            throw new PubKeyError(fnTag);
          }

          session = await this.serverService.checkNewSessionRequest(
            req,
            session,
            this.pubKeys.get(req.gatewayId)!,
          );

          this.sessions.set(session.getSessionId(), session);

          saveMessageInSessionData(session.getServerSessionData(), req);

          const message = await this.serverService.newSessionResponse(
            req,
            session,
          );

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
            );
          }

          this.Log.debug(`${fnTag}, Returning response: ${message}`);

          saveMessageInSessionData(session.getServerSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
              error,
            )}`,
          );
          setError(session, MessageType.NEW_SESSION_RESPONSE, error);
          return await this.serverService.newSessionErrorResponse(error);
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

  private async PreSATPTransferImplementation(
    req: PreSATPTransferRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<PreSATPTransferResponse> {
    const stepTag = `PreSATPTransferImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, PreSATPTransfer...`);
          this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

          session = this.sessions.get(req.sessionId);

          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          await this.serverService.checkPreSATPTransferRequest(req, session);

          saveMessageInSessionData(session.getServerSessionData(), req);

          await this.serverService.wrapToken(session);

          const message = await this.serverService.preSATPTransferResponse(
            req,
            session,
          );

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
            );
          }

          this.Log.debug(`${fnTag}, Returning response: ${message}`);

          saveMessageInSessionData(session.getServerSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
              error,
            )}`,
          );
          setError(session, MessageType.PRE_SATP_TRANSFER_RESPONSE, error);
          return await this.serverService.preSATPTransferErrorResponse(
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
        router.service(SatpStage0Service, {
          async newSession(req): Promise<NewSessionResponse> {
            return await that.NewSessionImplementation(req);
          },
          async preSATPTransfer(req): Promise<PreSATPTransferResponse> {
            return await that.PreSATPTransferImplementation(req);
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

  public async NewSessionRequest(
    sessionId: string,
  ): Promise<NewSessionRequest> {
    const stepTag = `NewSessionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, New Session Request...`);

          session = this.sessions.get(sessionId);

          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          const message = await this.clientService.newSessionRequest(
            session,
            this.gatewayId,
          );

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
              error,
            )}`,
          );
          setError(session, MessageType.NEW_SESSION_REQUEST, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
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

  public async PreSATPTransferRequest(
    response: NewSessionResponse,
    sessionId: string,
  ): Promise<PreSATPTransferRequest> {
    const stepTag = `PreSATPTransferRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Pre SATP Transfer Request...`);

          session = this.sessions.get(sessionId);

          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          const newSession = await this.clientService.checkNewSessionResponse(
            response,
            session,
            Array.from(this.sessions.keys()),
          );

          if (newSession.getSessionId() != session.getSessionId()) {
            this.sessions.set(newSession.getSessionId(), newSession);
            this.sessions.delete(session.getSessionId());
          }

          saveMessageInSessionData(session.getClientSessionData(), response);

          await this.clientService.wrapToken(session);

          const message =
            await this.clientService.preSATPTransferRequest(session);

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
              error,
            )}`,
          );
          setError(session, MessageType.PRE_SATP_TRANSFER_REQUEST, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
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
