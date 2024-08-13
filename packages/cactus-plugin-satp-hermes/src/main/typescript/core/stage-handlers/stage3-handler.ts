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
} from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { Empty } from "@bufbuild/protobuf";
import { Stage3ClientService } from "../stage-services/client/stage3-client-service";

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

  async CommitPreparationImplementation(
    req: CommitPreparationRequestMessage,
    context: HandlerContext,
  ): Promise<CommitReadyResponseMessage> {
    const stepTag = `CommitPreparationImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation...`);
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);

      if (!req.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(req.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      const sessionData =
        await this.serverService.checkCommitPreparationRequestMessage(
          req,
          session,
        );

      await this.serverService.mintAsset(session);

      const message = await this.serverService.commitReady(req, session);

      this.Log.debug(`${fnTag}, Returning response: ${message}`);
      this.Log.debug(`${fnTag}, Session Data: ${sessionData}`);

      const response = new CommitReadyResponseMessage();
      return response;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process CommitPreparationRequest ${error}`,
      );
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

      if (!req.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(req.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      const sessionData =
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
      this.Log.debug(`${fnTag}, Session Data: ${sessionData}`);

      const response = new CommitFinalAcknowledgementReceiptResponseMessage();
      return response;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process CommitFinalAssertionRequest ${error}`,
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

      if (!req.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(req.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      const sessionData =
        await this.serverService.checkTransferCompleteRequestMessage(
          req,
          session,
        );

      this.Log.debug(`${fnTag}, Session Data: ${sessionData}`);

      return new Empty({});
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process TransferCompleteRequest ${error}`,
      );
    }
  }

  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage3Service, {
      commitPreparation: this.CommitPreparationImplementation,
      commitFinalAssertion: this.CommitFinalAssertionImplementation,
      transferComplete: this.TransferCompleteImplementation,
    });
  }

  //client side

  async CommitPreparationRequest(
    response: CommitReadyResponseMessage,
  ): Promise<CommitPreparationRequestMessage> {
    const stepTag = `CommitPreparationRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      if (!response.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(response.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      await this.clientService.checkCommitReadyResponseMessage(
        response,
        session,
      );

      const request = await this.clientService.commitPreparation(
        response,
        session,
      );

      if (!request) {
        throw new Error(`${fnTag}, Failed to create TransferProposalRequest`);
      }
      return request;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process commitPreparationRequest ${error}`,
      );
    }
  }

  async CommitFinalAssertionRequest(
    response: CommitReadyResponseMessage,
  ): Promise<CommitFinalAssertionRequestMessage> {
    const stepTag = `CommitFinalAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Commit Preparation Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      if (!response.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(response.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
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
        throw new Error(
          `${fnTag}, Failed to create CommitFinalAssertionRequest`,
        );
      }
      return request;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process CommitFinalAssertionRequest ${error}`,
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

      if (!response.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(response.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
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
        throw new Error(`${fnTag}, Failed to create TransferCompleteRequest`);
      }
      return request;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process TransferCompleteRequest ${error}`,
      );
    }
  }
}
