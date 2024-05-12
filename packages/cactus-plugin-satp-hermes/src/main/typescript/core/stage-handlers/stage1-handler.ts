import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import {
  TransferCommenceRequestMessage,
  TransferCommenceResponseMessage,
  TransferProposalReceiptMessage,
  TransferProposalRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATPSession } from "../satp-session";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { Stage1ClientService } from "../stage-services/client/stage1-client-service";
import { SupportedChain } from "../types";
import { SATPHandler, SATPHandlerOptions } from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

export class Stage1SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = "Stage1SATPHandler";
  private session: SATPSession;
  private serverService: Stage1ServerService;
  private clientService: Stage1ClientService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.session = ops.session;
    this.serverService = ops.serverService as Stage1ServerService;
    this.clientService = ops.clientService as Stage1ClientService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage1SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): string {
    return Stage1SATPHandler.CLASS_NAME;
  }

  async TransferProposalImplementation(
    req: TransferProposalRequestMessage,
  ): Promise<TransferProposalReceiptMessage> {
    try {
      console.log("Received TransferProposalRequest", req);
      const sessionData =
        await this.serverService.checkTransferProposalRequestMessage(
          req,
          this.session,
          this.supportedDLTs,
        );
      const message = await this.serverService.transferProposalResponse(
        req,
        this.session,
      );
      console.log("message", message);
      console.log("Returning response", sessionData);
      const response = new TransferProposalReceiptMessage();
      return response;
    } catch (error) {
      console.error("Error handling TransferProposalRequest:", error);
      throw new Error("Failed to process TransferProposalRequest");
    }
  }

  async TransferCommenceImplementation(
    req: TransferCommenceRequestMessage,
  ): Promise<TransferCommenceResponseMessage> {
    try {
      console.log("Received TransferCommenceRequest", req);
      const sessionData =
        await this.serverService.checkTransferCommenceRequestMessage(
          req,
          this.session,
        );
      const message = await this.serverService.transferCommenceResponse(
        req,
        this.session,
      );
      console.log("Returning response", message);
      console.log("Returning response", sessionData);
      const response = new TransferProposalReceiptMessage();
      return response;
    } catch (error) {
      console.error("Error handling TransferCommenceRequest:", error);
      throw new Error("Failed to process TransferCommenceRequest");
    }
  }

  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage1Service, {
      transferProposal: this.TransferProposalImplementation,
      transferCommence: this.TransferCommenceImplementation,
    });
  }
}
