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
import { SATPHandler, SATPHandlerOptions } from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { Empty } from "@bufbuild/protobuf";

export class Stage3SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = "Stage3SATPHandler";
  private session: SATPSession;
  private serverService: Stage3ServerService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.session = ops.session;
    this.serverService = ops.serverService as Stage3ServerService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage3SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): string {
    return Stage3SATPHandler.CLASS_NAME;
  }

  async commitPreparation(
    req: CommitPreparationRequestMessage,
    context: HandlerContext,
  ): Promise<CommitReadyResponseMessage> {
    try {
      console.log("Received CommitPreparationRequest", req, context);
      const sessionData =
        await this.serverService.checkCommitPreparationRequestMessage(
          req,
          this.session,
        );
      const message = await this.serverService.commitReady(req, this.session);
      console.log("Returning response", message);
      console.log("Returning response", sessionData);
      const response = new CommitReadyResponseMessage();
      return response;
    } catch (error) {
      console.error("Error handling CommitPreparationRequest:", error);
      throw new Error("Failed to process CommitPreparationRequest");
    }
  }

  async commitFinalAssertion(
    req: CommitFinalAssertionRequestMessage,
    context: HandlerContext,
  ): Promise<CommitFinalAcknowledgementReceiptResponseMessage> {
    try {
      console.log("Received CommitFinalAssertionRequest", req, context);
      const sessionData =
        await this.serverService.checkCommitFinalAssertionRequestMessage(
          req,
          this.session,
        );
      const message =
        await this.serverService.commitFinalAcknowledgementReceiptResponse(
          req,
          this.session,
        );
      console.log("Returning response", message);
      console.log("Returning response", sessionData);
      const response = new CommitFinalAcknowledgementReceiptResponseMessage();
      return response;
    } catch (error) {
      console.error("Error handling CommitFinalAssertionRequest:", error);
      throw new Error("Failed to process CommitFinalAssertionRequest");
    }
  }

  async transferComplete(
    req: TransferCompleteRequestMessage,
    context: HandlerContext,
  ): Promise<Empty> {
    try {
      console.log("Received TransferCompleteRequest", req, context);
      const sessionData =
        await this.serverService.checkTransferCompleteRequestMessage(
          req,
          this.session,
        );
      console.log("Returning empty response");
      console.log("Returning response", sessionData);
      return new Empty({});
    } catch (error) {
      console.error("Error handling TransferCompleteRequest:", error);
      throw new Error("Failed to process TransferCompleteRequest");
    }
  }

  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage3Service, {
      commitPreparation: this.commitPreparation,
      commitFinalAssertion: this.commitFinalAssertion,
      transferComplete: this.transferComplete,
    });
  }
}
