import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  TransferCommenceRequest,
  TransferCommenceResponse,
  TransferProposalResponse,
  TransferProposalRequest,
} from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import { SATPSession } from "../satp-session";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { Stage1ClientService } from "../stage-services/client/stage1-client-service";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { SatpLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { getSessionId } from "./handler-utils";
import { PreSATPTransferResponse } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { getMessageTypeName } from "../satp-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { saveMessageInSessionData, setError } from "../session-utils";
import { BridgeManagerClientInterface } from "../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

export class Stage1SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE1;
  private sessions: Map<string, SATPSession>;
  private serverService: Stage1ServerService;
  private clientService: Stage1ClientService;
  private bridgeManagerClient: BridgeManagerClientInterface;
  private logger: Logger;
  private readonly monitorService: MonitorService;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage1ServerService;
    this.clientService = ops.clientService as Stage1ClientService;
    this.bridgeManagerClient = ops.bridgeClient;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.logger.trace(`Initialized ${Stage1SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage1SATPHandler.CLASS_NAME;
  }

  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
  getStage(): string {
    return Stage.STAGE1;
  }

  public get Log(): Logger {
    return this.logger;
  }

  private async TransferProposalImplementation(
    req: TransferProposalRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferProposalResponse> {
    const stepTag = `TransferProposalImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Transfer Proposal...`);
          this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

          session = this.sessions.get(getSessionId(req));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          await this.serverService.checkTransferProposalRequestMessage(
            req,
            session,
            this.bridgeManagerClient.getAvailableEndPoints(),
          );

          saveMessageInSessionData(session.getServerSessionData(), req);

          const message = await this.serverService.transferProposalResponse(
            req,
            session,
          );

          this.Log.debug(
            `${fnTag}, Returning response: ${safeStableStringify(message)}`,
          );

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.INIT_RECEIPT) +
                "/" +
                getMessageTypeName(MessageType.INIT_REJECT),
            );
          }

          saveMessageInSessionData(session.getServerSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.INIT_REJECT),
              error,
            )}`,
          );
          setError(session, MessageType.INIT_REJECT, error);
          return await this.serverService.transferProposalErrorResponse(
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

  private async TransferCommenceImplementation(
    req: TransferCommenceRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferCommenceResponse> {
    const stepTag = `TransferProposalImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Transfer Commence...`);
          this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

          session = this.sessions.get(getSessionId(req));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          await this.serverService.checkTransferCommenceRequestMessage(
            req,
            session,
          );

          saveMessageInSessionData(session.getServerSessionData(), req);

          const message = await this.serverService.transferCommenceResponse(
            req,
            session,
          );

          this.Log.debug(
            `${fnTag}, Returning response: ${safeStableStringify(message)}`,
          );

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_RESPONSE),
            );
          }

          saveMessageInSessionData(session.getServerSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_RESPONSE),
              error,
            )}`,
          );
          setError(session, MessageType.TRANSFER_COMMENCE_RESPONSE, error);
          return await this.serverService.transferCommenceErrorResponse(
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
    const fnTag = `${this.getHandlerIdentifier()}#setupRouter`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(SatpStage1Service, {
          async transferProposal(req) {
            return await that.TransferProposalImplementation(req)!;
          },
          async transferCommence(req) {
            return that.TransferCommenceImplementation(req);
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
  public async TransferProposalRequest(
    sessionId: string,
    response: PreSATPTransferResponse,
  ): Promise<TransferProposalRequest> {
    const stepTag = `TransferProposalRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Transfer Proposal Request...`);

          session = this.sessions.get(sessionId);
          if (!session) {
            throw new Error(`${fnTag}, Session not found`);
          }

          await this.clientService.checkPreSATPTransferResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const requestTransferProposal =
            await this.clientService.transferProposalRequest(
              session,
              this.bridgeManagerClient.getAvailableEndPoints(),
            );

          if (!requestTransferProposal) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.INIT_PROPOSAL),
            );
          }

          saveMessageInSessionData(
            session.getClientSessionData(),
            requestTransferProposal,
          );

          return requestTransferProposal;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.INIT_PROPOSAL),
              error,
            )}`,
          );
          setError(session, MessageType.INIT_PROPOSAL, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.INIT_PROPOSAL),
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

  //client side
  public async TransferCommenceRequest(
    response: TransferProposalResponse,
  ): Promise<TransferCommenceRequest> {
    const stepTag = `TransferProposalRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Transfer Commence Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          if (!response.common?.sessionId) {
            throw new Error(`${fnTag}, Session Id not found`);
          }

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new Error(`${fnTag}, Session not found`);
          }

          await this.clientService.checkTransferProposalResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const requestTransferCommence =
            await this.clientService.transferCommenceRequest(response, session);

          if (!requestTransferCommence) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
            );
          }

          saveMessageInSessionData(
            session.getClientSessionData(),
            requestTransferCommence,
          );

          return requestTransferCommence;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
              error,
            )}`,
          );
          setError(session, MessageType.TRANSFER_COMMENCE_REQUEST, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
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
