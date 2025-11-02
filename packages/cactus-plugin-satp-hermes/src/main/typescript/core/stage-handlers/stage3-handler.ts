import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  CommitPreparationResponse,
  TransferCompleteRequest,
  TransferCompleteResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import { Stage3ServerService } from "../stage-services/server/stage3-server-service";
import { SATPSession } from "../satp-session";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { Stage3ClientService } from "../stage-services/client/stage3-client-service";
import { getSessionId } from "./handler-utils";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { LockAssertionResponse } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { getMessageTypeName } from "../satp-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  collectSessionAttributes,
  saveMessageInSessionData,
  setError,
  setErrorChecking,
} from "../session-utils";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import {
  PriceManager,
  PriceManagerOptions,
} from "../../services/token-price-check/price-manager";

export class Stage3SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE3;
  private sessions: Map<string, SATPSession>;
  private clientService: Stage3ClientService;
  private serverService: Stage3ServerService;
  private logger: Logger;
  private readonly monitorService: MonitorService;
  private priceManager: PriceManager;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage3ServerService;
    this.clientService = ops.clientService as Stage3ClientService;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    const priceManagerOptions: PriceManagerOptions = {
      logLevel: ops.loggerOptions.level,
      monitorService: this.monitorService,
    };
    this.priceManager = new PriceManager(priceManagerOptions);
    this.logger.trace(`Initialized ${Stage3SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage3SATPHandler.CLASS_NAME;
  }

  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  public get Log(): Logger {
    return this.logger;
  }

  getStage(): string {
    return Stage.STAGE3;
  }

  async CommitPreparationImplementation(
    req: CommitPreparationRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<CommitPreparationResponse> {
    const stepTag = `CommitPreparationImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Commit Preparation...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkCommitPreparationRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        await this.serverService.mintAsset(session);

        const message = await this.serverService.commitReadyResponse(
          req,
          session,
        );

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_READY),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);
        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage3
            ?.commitPreparationRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage3
            ?.commitReadyResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, operation: "commitPreparation", satp_phase: 3 },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_READY),
            error,
          )}`,
        );
        setError(session, MessageType.COMMIT_READY, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 3;
        attributes.operation = "commitPreparation";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.commitReadyErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  async CommitFinalAssertionImplementation(
    req: CommitFinalAssertionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<CommitFinalAssertionResponse> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Commit Final Assertion...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkCommitFinalAssertionRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        await this.serverService.assignAsset(session);

        const message =
          await this.serverService.commitFinalAcknowledgementReceiptResponse(
            req,
            session,
          );

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);

        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage3
            ?.commitFinalAssertionRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage3
            ?.commitFinalAcknowledgementReceiptResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 3, operation: "commitFinalAssertion" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
            error,
          )}`,
        );
        setError(session, MessageType.ACK_COMMIT_FINAL, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 3;
        attributes.operation = "commitFinalAssertion";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.commitFinalAcknowledgementReceiptErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  async TransferCompleteImplementation(
    req: TransferCompleteRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferCompleteResponse> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Transfer Complete...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkTransferCompleteRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        const message = await this.serverService.transferCompleteResponse(
          req,
          session,
        );

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);

        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage3
            ?.transferCompleteMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage3
            ?.transferCompleteResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 3, operation: "transferComplete" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        const receiverAssetAmount = Number(
          session.getServerSessionData().receiverAsset?.amount,
        );

        const receiverGasUsed =
          Number(
            JSON.parse(
              session.getServerSessionData().receiverWrapAssertionClaim
                ?.receipt ?? "{}",
            ).gas ?? 0,
          ) +
          Number(
            JSON.parse(
              session.getServerSessionData().mintAssertionClaim?.receipt ??
                "{}",
            ).gas ?? 0,
          ) +
          Number(
            JSON.parse(
              session.getServerSessionData().assignmentAssertionClaim
                ?.receipt ?? "{}",
            ).gas ?? 0,
          );

        this.monitorService.updateCounter(
          "total_value_exchanged_token",
          receiverAssetAmount,
          { ...attributes, transaction_direction: "received" },
        );

        this.monitorService.updateCounter(
          "total_value_exchanged_USD",
          this.priceManager.convertTokensToUSD(
            receiverAssetAmount,
            session.getServerSessionData().receiverAsset?.networkId?.id || "",
          ),
          { ...attributes, transaction_direction: "received" },
        );

        this.monitorService.updateCounter(
          "transaction_gas_used",
          receiverGasUsed,
          { ...attributes, side: "server" },
        );

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
            error,
          )}`,
        );
        setError(session, MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 3;
        attributes.operation = "transferComplete";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.transferCompleteErrorResponse(
          error,
          session,
        );
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
        router.service(SatpStage3Service, {
          async commitPreparation(req): Promise<CommitPreparationResponse> {
            return await that.CommitPreparationImplementation(req);
          },
          async commitFinalAssertion(
            req,
          ): Promise<CommitFinalAssertionResponse> {
            return await that.CommitFinalAssertionImplementation(req);
          },
          async transferComplete(req): Promise<TransferCompleteResponse> {
            return await that.TransferCompleteImplementation(req);
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

  async CommitPreparationRequest(
    response: LockAssertionResponse,
  ): Promise<CommitPreparationRequest> {
    const stepTag = `CommitPreparationRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Commit Preparation Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkLockAssertionResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const request = await this.clientService.commitPreparation(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_PREPARE),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_PREPARE),
              error,
            )}`,
          );
          setError(session, MessageType.COMMIT_PREPARE, error);
          let attributes: Record<
            string,
            | undefined
            | string
            | number
            | boolean
            | string[]
            | number[]
            | boolean[]
          > = {};

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );

          this.monitorService.updateCounter(
            "failed_transactions",
            1,
            attributes,
          );
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_PREPARE),
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

  async CommitFinalAssertionRequest(
    response: CommitPreparationResponse,
  ): Promise<CommitFinalAssertionRequest> {
    const stepTag = `CommitFinalAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Commit Final Assertion Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          attributes = collectSessionAttributes(session, "client");
          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkCommitPreparationResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          await this.clientService.burnAsset(session);

          const request = await this.clientService.commitFinalAssertion(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_FINAL),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          const senderAssetAmount = Number(
            session.getClientSessionData().senderAsset?.amount,
          );

          this.monitorService.updateCounter(
            "total_value_exchanged_token",
            senderAssetAmount,
            { ...attributes, transaction_direction: "sent" },
          );

          this.monitorService.updateCounter(
            "total_value_exchanged_USD",
            this.priceManager.convertTokensToUSD(
              senderAssetAmount,
              session.getClientSessionData().senderAsset?.networkId?.id || "",
            ),
            { ...attributes, transaction_direction: "sent" },
          );

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_FINAL),
              error,
            )}`,
          );
          setError(session, MessageType.COMMIT_FINAL, error);

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );

          this.monitorService.updateCounter(
            "failed_transactions",
            1,
            attributes,
          );
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_FINAL),
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

  async TransferCompleteRequest(
    response: CommitFinalAssertionResponse,
  ): Promise<TransferCompleteRequest> {
    const stepTag = `TransferCompleteRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Transfer Complete Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkCommitFinalAssertionResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const request = await this.clientService.transferComplete(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
              error,
            )}`,
          );
          setError(session, MessageType.ACK_COMMIT_FINAL, error);

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );

          this.monitorService.updateCounter(
            "failed_transactions",
            1,
            attributes,
          );
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
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

  async CheckTransferCompleteResponse(
    response: TransferCompleteResponse,
  ): Promise<void> {
    const stepTag = `CheckTransferCompleteResponse()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Check Transfer Complete Response...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkTransferCompleteResponse(
            response,
            session,
          );

          attributes = collectSessionAttributes(session, "client");

          const stage0Str =
            session.getClientSessionData().processedTimestamps?.stage0
              ?.newSessionRequestMessageTimestamp;
          const stage3Str =
            session.getClientSessionData().receivedTimestamps?.stage3
              ?.transferCompleteResponseMessageTimestamp;

          if (stage0Str && stage3Str) {
            const duration = Number(stage3Str) - Number(stage0Str);
            await this.monitorService.updateCounter(
              "transaction_duration",
              duration,
              attributes,
            );
          } else
            this.Log.warn(
              `${fnTag}, Missing timestamps for transaction duration calculation`,
            );

          const senderGasUsed =
            Number(
              JSON.parse(
                session.getClientSessionData().senderWrapAssertionClaim
                  ?.receipt ?? "{}",
              ).gas ?? 0,
            ) +
            Number(
              JSON.parse(
                session.getClientSessionData().lockAssertionClaim?.receipt ??
                  "{}",
              ).gas ?? 0,
            ) +
            Number(
              JSON.parse(
                session.getClientSessionData().burnAssertionClaim?.receipt ??
                  "{}",
              ).gas ?? 0,
            );

          this.monitorService.updateCounter(
            "transaction_gas_used",
            senderGasUsed,
            { ...attributes, side: "client" },
          );
          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );
          this.monitorService.updateCounter(
            "successful_transactions",
            1,
            attributes,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              "Checking " +
                getMessageTypeName(
                  MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
                ),
              error,
            )}`,
          );
          setErrorChecking(
            session,
            MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
            error,
          );

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );

          this.monitorService.updateCounter(
            "failed_transactions",
            1,
            attributes,
          );
          throw new FailedToProcessError(
            fnTag,
            "Checking " +
              getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
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
