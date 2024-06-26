import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/stage_2_connect";
import { Stage2ServerService } from "../stage-services/server/stage2-server-service";
import { SATPSession } from "../satp-session";
import { SupportedChain } from "../types";
import { SATPHandler, SATPHandlerOptions } from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  LockAssertionReceiptMessage,
  LockAssertionRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_2_pb";
export class Stage2SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = "Stage2SATPHandler";
  private session: SATPSession;
  private serverService: Stage2ServerService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.session = ops.session;
    this.serverService = ops.serverService as Stage2ServerService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage2SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): string {
    return Stage2SATPHandler.CLASS_NAME;
  }

  async lockAssertion(
    req: LockAssertionRequestMessage,
    context: HandlerContext,
  ): Promise<LockAssertionReceiptMessage> {
    try {
      console.log("Received LockAssertionRequest", req, context);
      const sessionData =
        await this.serverService.checkLockAssertionRequestMessage(
          req,
          this.session,
        );
      const message = await this.serverService.lockAssertionResponse(
        req,
        this.session,
      );
      console.log("Returning response", message);
      console.log("Returning response", sessionData);
      //to do
      const response = new LockAssertionReceiptMessage();
      return response;
    } catch (error) {
      console.error("Error handling LockAssertionRequest:", error);
      throw new Error("Failed to process LockAssertionRequest");
    }
  }
  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage2Service, {
      lockAssertion: this.lockAssertion,
    });
  }
}
