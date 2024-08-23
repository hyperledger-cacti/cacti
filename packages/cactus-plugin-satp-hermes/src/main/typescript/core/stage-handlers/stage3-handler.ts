import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/stage_3_connect";
import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  TransferCompleteRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_3_pb";
import { Stage3ServerService } from "../stage-services/server/stage3-server-service";
import { SATPSession } from "../satp-session";
import { SupportedChain } from "../types";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { Empty } from "@bufbuild/protobuf";
import { Stage3ClientService } from "../stage-services/client/stage3-client-service";
import { getSessionId } from "./handler-utils";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { LockAssertionReceiptMessage } from "../../generated/proto/cacti/satp/v02/stage_2_pb";

export class Stage3SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE3;
  private sessions: Map<string, SATPSession>;
  private clientService: Stage3ClientService;
  private serverService: Stage3ServerService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage3ServerService;
    this.clientService = ops.clientService as Stage3ClientService;
    this.supportedDLTs = ops.supportedDLTs;
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
    req: CommitPreparationRequestMessage,
    context: HandlerContext,
  ): Promise<CommitReadyResponseMessage> {
    const stepTag = `CommitPreparationImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation...`);
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);

      const session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkCommitPreparationRequestMessage(
        req,
        session,
      );

      await this.serverService.mintAsset(session);

      const message = await this.serverService.commitReady(req, session);

      this.Log.debug(`${fnTag}, Returning response: ${message}`);

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "CommitPreparationRequest");
      }

      return message;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "CommitPreparationRequest", error);
    }
  }

  async CommitFinalAssertionImplementation(
    req: CommitFinalAssertionRequestMessage,
    context: HandlerContext,
  ): Promise<CommitFinalAcknowledgementReceiptResponseMessage> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Final Assertion...`);
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);

      const session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkCommitFinalAssertionRequestMessage(
        req,
        session,
      );

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
          "CommitFinalAssertionRequest",
        );
      }

      return message;
    } catch (error) {
      throw new FailedToProcessError(
        fnTag,
        "CommitFinalAssertionRequest",
        error,
      );
    }
  }

  async TransferCompleteImplementation(
    req: TransferCompleteRequestMessage,
    context: HandlerContext,
  ): Promise<Empty> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Complete...`);
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);

      const session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkTransferCompleteRequestMessage(
        req,
        session,
      );

      return new Empty({});
    } catch (error) {
      throw new FailedToProcessError(fnTag, "TransferCompleteRequest", error);
    }
  }

  setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(SatpStage3Service, {
      async commitPreparation(req, context) {
        return await that.CommitPreparationImplementation(req, context);
      },
      async commitFinalAssertion(req, context) {
        return await that.CommitFinalAssertionImplementation(req, context);
      },
      async transferComplete(req, context) {
        return await that.TransferCompleteImplementation(req, context);
      },
      // commitPreparation: this.CommitPreparationImplementation,
      // commitFinalAssertion: this.CommitFinalAssertionImplementation,
      // transferComplete: this.TransferCompleteImplementation,
    });
  }

  //client side

  async CommitPreparationRequest(
    response: LockAssertionReceiptMessage,
  ): Promise<CommitPreparationRequestMessage> {
    const stepTag = `CommitPreparationRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      const session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.clientService.checkLockAssertionReceiptMessage(
        response,
        session,
      );

      const request = await this.clientService.commitPreparation(
        response,
        session,
      );

      if (!request) {
        throw new FailedToCreateMessageError(fnTag, "CommitPreparationRequest");
      }
      return request;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "CommitPreparationRequest", error);
    }
  }

  async CommitFinalAssertionRequest(
    response: CommitReadyResponseMessage,
  ): Promise<CommitFinalAssertionRequestMessage> {
    const stepTag = `CommitFinalAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Final Assertion Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      const session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.clientService.checkCommitReadyResponseMessage(
        response,
        session,
      );

      await this.clientService.burnAsset(session);

      const request = await this.clientService.commitFinalAssertion(
        response,
        session,
      );

      if (!request) {
        throw new FailedToCreateMessageError(
          fnTag,
          "CommitFinalAssertionRequest",
        );
      }
      return request;
    } catch (error) {
      throw new FailedToProcessError(
        fnTag,
        "CommitFinalAssertionRequest",
        error,
      );
    }
  }

  async TransferCompleteRequest(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
  ): Promise<TransferCompleteRequestMessage> {
    const stepTag = `TransferCompleteRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Complete Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      const session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.clientService.checkCommitFinalAcknowledgementReceiptResponseMessage(
        response,
        session,
      );

      const request = await this.clientService.transferComplete(
        response,
        session,
      );

      if (!request) {
        throw new FailedToCreateMessageError(fnTag, "TransferCompleteRequest");
      }
      return request;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "TransferCompleteRequest", error);
    }
  }
}
