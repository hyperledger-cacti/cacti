import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../satp-session";
import { Stage0ServerService } from "../stage-services/server/stage0-server-service";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/stage_0_connect";
import {
  CheckRequest,
  CheckResponse,
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  PreSATPTransferResponse,
} from "../../generated/proto/cacti/satp/v02/stage_0_pb";
import { Stage0ClientService } from "../stage-services/client/stage0-client-service";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  PubKeyError,
  SenderGatewayNetworkIdError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
export class Stage0SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE0;
  private sessions: Map<string, SATPSession>;
  private serverService: Stage0ServerService;
  private clientService: Stage0ClientService;
  private logger: Logger;
  private pubKeys: Map<string, string>;
  private gatewayId: string;
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage0ServerService;
    this.clientService = ops.clientService as Stage0ClientService;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage0SATPHandler.CLASS_NAME}`);
    this.pubKeys = ops.pubkeys;
    this.gatewayId = ops.gatewayId;
  }
  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage0SATPHandler.CLASS_NAME;
  }

  getStage(): string {
    return Stage.STAGE0;
  }

  public get Log(): Logger {
    return this.logger;
  }

  private async NewSessionImplementation(
    req: NewSessionRequest,
    context: HandlerContext,
  ): Promise<NewSessionResponse> {
    const stepTag = `NewSessionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, New Session...`);
      this.Log.debug(
        `${fnTag}, Request: ${safeStableStringify(req)}, Context: ${safeStableStringify(context)}`,
      );

      let session = this.sessions.get(req.sessionId);

      if (req.gatewayId == "") {
        throw new SenderGatewayNetworkIdError(fnTag);
      }

      if (!this.pubKeys.has(req.gatewayId)) {
        throw new PubKeyError(fnTag);
      }

      session = await this.serverService.checkNewSessionRequest(
        req,
        session,
        this.pubKeys.get(req.gatewayId)!,
      );

      this.sessions.set(session.getSessionId(), session);

      const message = await this.serverService.newSessionResponse(req, session);

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "NewSessionResponse");
      }

      this.Log.debug(`${fnTag}, Returning response: ${message}`);

      return message;
    } catch (error) {
      throw new FailedToCreateMessageError(fnTag, "NewSessionResponse", error);
    }
  }

  private async PreSATPTransferImplementation(
    req: PreSATPTransferRequest,
    context: HandlerContext,
  ): Promise<PreSATPTransferResponse> {
    const stepTag = `PreSATPTransferImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, PreSATPTransfer...`);
      this.Log.debug(
        `${fnTag}, Request: ${safeStableStringify(req)}, Context: ${safeStableStringify(context)}`,
      );

      const session = this.sessions.get(req.sessionId);

      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkPreSATPTransferRequest(req, session);

      await this.serverService.wrapToken(session);

      const message = await this.serverService.preSATPTransferResponse(
        req,
        session,
      );

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "PreSATPTransferResponse");
      }

      this.Log.debug(`${fnTag}, Returning response: ${message}`);

      return message;
    } catch (error) {
      throw new FailedToCreateMessageError(fnTag, "NewSessionResponse", error);
    }
  }

  setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(SatpStage0Service, {
      async check(req: CheckRequest): Promise<CheckResponse> {
        return new CheckResponse({ check: req.check });
      },
      async newSession(req, context): Promise<NewSessionResponse> {
        return await that.NewSessionImplementation(req, context);
      },
      async preSATPTransfer(req, context): Promise<PreSATPTransferResponse> {
        return await that.PreSATPTransferImplementation(req, context);
      },
      // newSession: this.NewSessionImplementation,
      //preSATPTransfer: this.PreSATPTransferImplementation,
    });
  }

  //client side

  public async NewSessionRequest(
    sessionId: string,
  ): Promise<NewSessionRequest> {
    const stepTag = `NewSessionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, New Session Request...`);

      const session = this.sessions.get(sessionId);

      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      const message = await this.clientService.newSessionRequest(
        session,
        this.gatewayId,
      );

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "NewSessionRequest");
      }

      return message;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "NewSessionRequest", error);
    }
  }

  public async PreSATPTransferRequest(
    response: NewSessionResponse,
    sessionId: string,
  ): Promise<PreSATPTransferRequest> {
    const stepTag = `PreSATPTransferRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Pre SATP Transfer Request...`);

      const session = this.sessions.get(sessionId);

      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      const newSession = await this.clientService.checkNewSessionResponse(
        response,
        session,
        Array.from(this.sessions.keys()),
      );

      if (newSession.getSessionId() != session.getSessionId()) {
        this.sessions.set(newSession.getSessionId(), newSession);
        this.sessions.delete(session.getSessionId());
      }

      await this.clientService.wrapToken(session);

      const message = await this.clientService.preSATPTransferRequest(session);

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "PreSATPTransferRequest");
      }

      return message;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "PreSATPTransferRequest", error);
    }
  }
}
