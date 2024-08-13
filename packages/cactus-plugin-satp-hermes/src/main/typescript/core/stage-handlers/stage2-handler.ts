import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/stage_2_connect";
import { Stage2ServerService } from "../stage-services/server/stage2-server-service";
import { SATPSession } from "../satp-session";
import { SupportedChain } from "../types";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
} from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  LockAssertionReceiptMessage,
  LockAssertionRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_2_pb";
import { Stage2ClientService } from "../stage-services/client/stage2-client-service";
import { TransferCommenceResponseMessage } from "../../generated/proto/cacti/satp/v02/stage_1_pb";
export class Stage2SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE2;
  private sessions: Map<string, SATPSession>;
  private serverService: Stage2ServerService;
  private clientService: Stage2ClientService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage2ServerService;
    this.clientService = ops.clientService as Stage2ClientService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage2SATPHandler.CLASS_NAME}`);
  }

  public get Log(): Logger {
    return this.logger;
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage2SATPHandler.CLASS_NAME;
  }

  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
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

      if (!req.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(req.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      const sessionData =
        await this.serverService.checkLockAssertionRequestMessage(req, session);
      const message = await this.serverService.lockAssertionResponse(
        req,
        session,
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

      if (!response.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(response.common?.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      await this.clientService.checkTransferCommenceResponseMessage(
        response,
        session,
      );

      await this.clientService.lockAsset(session);

      const request = await this.clientService.lockAssertionRequest(
        response,
        session,
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
