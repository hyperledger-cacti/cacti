import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../satp-session";
import { Stage0ServerService } from "../stage-services/server/stage0-server-service";
import { SATPHandler, SATPHandlerOptions } from "../../types/satp-protocol";
import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/stage_0_connect";
import {
  PreTransferCommenceRequestMessage,
  PreTransferCommenceResponseMessage,
  PreTransferVerificationAndContextEstablishmentRequest,
  PreTransferVerificationAndContextEstablishmentResponse,
} from "../../generated/proto/cacti/satp/v02/stage_0_pb";
import { Stage0ClientService } from "../stage-services/client/stage0-client-service";

export class Stage0SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = "Stage0SATPHandler";
  private sessions: Map<string, SATPSession>;
  private serverService: Stage0ServerService;
  private clientService: Stage0ClientService;
  private logger: Logger;
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage0ServerService;
    this.clientService = ops.clientService as Stage0ClientService;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage0SATPHandler.CLASS_NAME}`);
  }
  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getHandlerIdentifier(): string {
    return Stage0SATPHandler.CLASS_NAME;
  }

  // async PreTransferProposalImplementation(
  //   req: PreTransferVerificationAndContextEstablishmentRequest,
  // ): Promise<PreTransferVerificationAndContextEstablishmentResponse> {
  //   try {
  //     console.log("Received TransferProposalRequest", req);
  //     const sessionData =
  //       await this.serverService.checkPreTransferProposalRequestMessage(
  //         req,
  //         this.session,
  //       );
  //     const message = await this.serverService.preTransferProposalResponse(
  //       req,
  //       this.session,
  //     );
  //     console.log("message", message);
  //     console.log("Returning response", sessionData);
  //     const response =
  //       new PreTransferVerificationAndContextEstablishmentResponse();
  //     return response;
  //   } catch (error) {
  //     console.error("Error handling TransferProposalRequest:", error);
  //     throw new Error("Failed to process TransferProposalRequest");
  //   }
  // }

  // async PreTransferCommenceImplementation(
  //   req: PreTransferCommenceRequestMessage,
  // ): Promise<PreTransferCommenceResponseMessage> {
  //   try {
  //     console.log("Received TransferCommenceRequest", req);
  //     const sessionData =
  //       await this.serverService.checkTransferCommenceRequestMessage(
  //         req,
  //         this.session,
  //       );
  //     const message = await this.serverService.transferCommenceResponse(
  //       req,
  //       this.session,
  //     );
  //     console.log("Returning response", message);
  //     console.log("Returning response", sessionData);
  //     const response = new PreTransferCommenceResponseMessage();
  //     return response;
  //   } catch (error) {
  //     console.error("Error handling TransferCommenceRequest:", error);
  //     throw new Error("Failed to process TransferCommenceRequest");
  //   }
  // }
  setupRouter(router: ConnectRouter): void {
    //   router.service(SatpStage0Service, {
    //     preTransferProposalClaims: this.PreTransferProposalImplementation,
    //     preTransferCommence: this.PreTransferCommenceImplementation,
    //   });
  }
}
