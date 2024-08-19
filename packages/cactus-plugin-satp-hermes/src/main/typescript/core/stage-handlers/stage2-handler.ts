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
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { getSessionId } from "./handler-utils";
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

      const session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkLockAssertionRequestMessage(req, session);

      const message = await this.serverService.lockAssertionResponse(
        req,
        session,
      );

      this.Log.debug(`${fnTag}, Returning response: ${message}`);

      if (!message) {
        throw new FailedToCreateMessageError(
          fnTag,
          "LockAssertionImplementation",
        );
      }
      return message;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "LockAssertionImplementation");
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

      const session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
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
        throw new FailedToCreateMessageError(fnTag, "LockAssertionRequest");
      }
      return request;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "LockAssertionRequest");
    }
  }
}
