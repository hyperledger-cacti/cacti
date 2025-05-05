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
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
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
  saveMessageInSessionData,
  setError,
  setErrorChecking,
} from "../session-utils";

export class Stage3SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE3;
  private sessions: Map<string, SATPSession>;
  private clientService: Stage3ClientService;
  private serverService: Stage3ServerService;
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage3ServerService;
    this.clientService = ops.clientService as Stage3ClientService;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
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
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation...`);
      this.Log.debug(`${fnTag}, Request: ${req}`);

      session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

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
      return await this.serverService.commitReadyErrorResponse(error, session);
    }
  }

  async CommitFinalAssertionImplementation(
    req: CommitFinalAssertionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<CommitFinalAssertionResponse> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Commit Final Assertion...`);
      this.Log.debug(`${fnTag}, Request: ${req}`);

      session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

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
      return await this.serverService.commitFinalAcknowledgementReceiptErrorResponse(
        error,
        session,
      );
    }
  }

  async TransferCompleteImplementation(
    req: TransferCompleteRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferCompleteResponse> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Transfer Complete...`);
      this.Log.debug(`${fnTag}, Request: ${req}`);

      session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

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
      return await this.serverService.transferCompleteErrorResponse(
        error,
        session,
      );
    }
  }

  setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(SatpStage3Service, {
      async commitPreparation(req) {
        return await that.CommitPreparationImplementation(req);
      },
      async commitFinalAssertion(req) {
        return await that.CommitFinalAssertionImplementation(req);
      },
      async transferComplete(req) {
        return await that.TransferCompleteImplementation(req);
      },
    });
  }

  //client side

  async CommitPreparationRequest(
    response: LockAssertionResponse,
  ): Promise<CommitPreparationRequest> {
    const stepTag = `CommitPreparationRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.clientService.checkLockAssertionResponse(response, session);

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
      throw new FailedToProcessError(
        fnTag,
        getMessageTypeName(MessageType.COMMIT_PREPARE),
        error,
      );
    }
  }

  async CommitFinalAssertionRequest(
    response: CommitPreparationResponse,
  ): Promise<CommitFinalAssertionRequest> {
    const stepTag = `CommitFinalAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Commit Final Assertion Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

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
      throw new FailedToProcessError(
        fnTag,
        getMessageTypeName(MessageType.COMMIT_FINAL),
        error,
      );
    }
  }

  async TransferCompleteRequest(
    response: CommitFinalAssertionResponse,
  ): Promise<TransferCompleteRequest> {
    const stepTag = `TransferCompleteRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Transfer Complete Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

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
      throw new FailedToProcessError(
        fnTag,
        getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
        error,
      );
    }
  }

  async CheckTransferCompleteResponse(
    response: TransferCompleteResponse,
  ): Promise<void> {
    const stepTag = `CheckTransferCompleteResponse()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Check Transfer Complete Response...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.clientService.checkTransferCompleteResponse(response, session);

      saveMessageInSessionData(session.getClientSessionData(), response);
    } catch (error) {
      this.Log.error(
        `${fnTag}, Error: ${new FailedToProcessError(
          fnTag,
          "Checking " +
            getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
          error,
        )}`,
      );
      setErrorChecking(
        session,
        MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
        error,
      );
      throw new FailedToProcessError(
        fnTag,
        "Checking " +
          getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
        error,
      );
    }
  }
}
