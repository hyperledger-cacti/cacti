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
import { Stage2ClientService } from "../stage-services/client/stage2-client-service";
import { TransferCommenceResponseMessage } from "../../generated/proto/cacti/satp/v02/stage_1_pb";
export class Stage2SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = "Stage2SATPHandler";
  private session: SATPSession;
  private serverService: Stage2ServerService;
  private clientService: Stage2ClientService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.session = ops.session;
    this.serverService = ops.serverService as Stage2ServerService;
    this.clientService = ops.clientService as Stage2ClientService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage2SATPHandler.CLASS_NAME}`);
  }

  public get Log(): Logger {
    return this.logger;
  }

  getHandlerIdentifier(): string {
    return Stage2SATPHandler.CLASS_NAME;
  }

  getSessionId(): string {
    return this.session.getSessionData().id;
  }

  async LockAssertionImplementation(
    req: LockAssertionRequestMessage,
    context: HandlerContext,
  ): Promise<LockAssertionReceiptMessage> {
    const stepTag = `LockAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Lock Assertion...`);
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);
      const sessionData =
        await this.serverService.checkLockAssertionRequestMessage(
          req,
          this.session,
        );
      const message = await this.serverService.lockAssertionResponse(
        req,
        this.session,
      );
      this.Log.debug(`${fnTag}, Returning response: ${message}`);
      this.Log.debug(`${fnTag}, Session Data: ${sessionData}`);

      if (!message) {
        throw new Error(`${fnTag}, Failed to create LockAssertionReceipt`);
      }
      return message;
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process LockAssertion ${error}`);
    }
  }

  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage2Service, {
      lockAssertion: this.LockAssertionImplementation,
    });
  }

  //client side
  async LockAssertionRequest(
    response: TransferCommenceResponseMessage,
  ): Promise<LockAssertionRequestMessage> {
    const stepTag = `LockAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Lock Assertion Request Message...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);
      await this.clientService.checkTransferCommenceResponseMessage(
        response,
        this.session,
      );

      await this.clientService.lockAsset(this.session);

      const request = await this.clientService.lockAssertionRequest(
        response,
        this.session,
      );

      if (!request) {
        throw new Error(`${fnTag}, Failed to create LockAssertionRequest`);
      }
      return request;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process LockAssertionRequest ${error}`,
      );
    }
  }
}
