import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import { TransferCommenceRequestMessage, TransferProposalRequestMessage } from "../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATPSession } from "../satp-session";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { Stage1ClientService } from "../stage-services/client/stage1-client-service";
import { SupportedGatewayImplementations } from "../types";
import { SATPHandler } from './SATPHandler'; // Assuming the interface is exported from this path

export class Stage1SATPHandler implements SATPHandler {
  constructor(
    private session: SATPSession | undefined,
    private serverService: Stage1ServerService,
    private clientService: Stage1ClientService,
    private supportedDLTs: SupportedGatewayImplementations[]
  ) {}

  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage1Service, {
      transferProposal: async (req: TransferProposalRequestMessage, context: HandlerContext) => {
        try {
          console.log("Received TransferProposalRequest", req, context);
          const sessionData = await this.serverService.checkTransferProposalRequestMessage(req, this.session, this.supportedDLTs);
          const message = await this.serverService.transferProposalResponse(req, this.session);
          console.log("Returning response", message);
          return message;
        } catch (error) {
          console.error("Error handling TransferProposalRequest:", error);
          throw new Error("Failed to process TransferProposalRequest");
        }
      },
      transferCommence: async (req: TransferCommenceRequestMessage, context: HandlerContext) => {
        try {
          console.log("Received TransferCommenceRequest", req, context);
          const sessionData = await this.serverService.checkTransferCommenceRequestMessage(req, this.session);
          const message = await this.serverService.transferCommenceResponse(req, this.session);
          console.log("Returning response", message);
          return message;
        } catch (error) {
          console.error("Error handling TransferCommenceRequest:", error);
          throw new Error("Failed to process TransferCommenceRequest");
        }
      }
    });
  }

  getHandlerIdentifier(): string {
    return "Stage1SATPHandler";
  }
}
