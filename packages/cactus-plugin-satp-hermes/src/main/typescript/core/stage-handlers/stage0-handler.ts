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

import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/stage_0_pb";
import {
  NewSessionRequestMessage,
  NewSessionResponseMessage,
  PreSATPTransferRequestMessage,
  PreSATPTransferResponseMessage,
} from "../../generated/proto/cacti/satp/v02/stage_0_pb";
import { Stage0ClientService } from "../stage-services/client/stage0-client-service";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  PubKeyError,
  SenderGatewayNetworkIdError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { saveMessageInSessionData, setError } from "../session-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { getMessageTypeName } from "../satp-utils";

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
    req: NewSessionRequestMessage,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<NewSessionResponseMessage> {
    const stepTag = `NewSessionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, New Session...`);
      //console.log("aii: ", stringify(req));
      this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

      session = this.sessions.get(req.sessionId);

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

      saveMessageInSessionData(session.getServerSessionData(), req);

      const message = await this.serverService.newSessionResponse(req, session);

      if (!message) {
        throw new FailedToCreateMessageError(
          fnTag,
          getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
        );
      }

      this.Log.debug(`${fnTag}, Returning response: ${message}`);

      saveMessageInSessionData(session.getServerSessionData(), message);

      return message;
    } catch (error) {
      this.Log.error(
        `${fnTag}, Error: ${new FailedToProcessError(
          fnTag,
          getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
          error,
        )}`,
      );
      setError(session, MessageType.NEW_SESSION_RESPONSE, error);
      return await this.serverService.newSessionErrorResponse(error);
    }
  }

  private async PreSATPTransferImplementation(
    req: PreSATPTransferRequestMessage,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<PreSATPTransferResponseMessage> {
    const stepTag = `PreSATPTransferImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, PreSATPTransfer...`);
      this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

      session = this.sessions.get(req.sessionId);

      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkPreSATPTransferRequest(req, session);

      saveMessageInSessionData(session.getServerSessionData(), req);

      await this.serverService.wrapToken(session);

      const message = await this.serverService.preSATPTransferResponse(
        req,
        session,
      );

      if (!message) {
        throw new FailedToCreateMessageError(
          fnTag,
          getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
        );
      }

      this.Log.debug(`${fnTag}, Returning response: ${message}`);

      saveMessageInSessionData(session.getServerSessionData(), message);

      return message;
    } catch (error) {
      this.Log.error(
        `${fnTag}, Error: ${new FailedToProcessError(
          fnTag,
          getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
          error,
        )}`,
      );
      setError(session, MessageType.PRE_SATP_TRANSFER_RESPONSE, error);
      return await this.serverService.preSATPTransferErrorResponse(
        error,
        session,
      );
    }
  }

  setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(SatpStage0Service, {
      async newSession(req): Promise<NewSessionResponseMessage> {
        return await that.NewSessionImplementation(req);
      },
      async preSATPTransfer(req): Promise<PreSATPTransferResponseMessage> {
        return await that.PreSATPTransferImplementation(req);
      },
    });
  }

  //client side

  public async NewSessionRequest(
    sessionId: string,
  ): Promise<NewSessionRequestMessage> {
    const stepTag = `NewSessionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, New Session Request...`);

      session = this.sessions.get(sessionId);

      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      const message = await this.clientService.newSessionRequest(
        session,
        this.gatewayId,
      );

      if (!message) {
        throw new FailedToCreateMessageError(
          fnTag,
          getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
        );
      }

      saveMessageInSessionData(session.getClientSessionData(), message);

      return message;
    } catch (error) {
      this.Log.error(
        `${fnTag}, Error: ${new FailedToProcessError(
          fnTag,
          getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
          error,
        )}`,
      );
      setError(session, MessageType.NEW_SESSION_REQUEST, error);
      throw new FailedToProcessError(
        fnTag,
        getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
        error,
      );
    }
  }

  public async PreSATPTransferRequest(
    response: NewSessionResponseMessage,
    sessionId: string,
  ): Promise<PreSATPTransferRequestMessage> {
    const stepTag = `PreSATPTransferRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    let session: SATPSession | undefined;
    try {
      this.Log.debug(`${fnTag}, Pre SATP Transfer Request...`);

      session = this.sessions.get(sessionId);

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

      saveMessageInSessionData(session.getClientSessionData(), response);

      await this.clientService.wrapToken(session);

      const message = await this.clientService.preSATPTransferRequest(session);

      if (!message) {
        throw new FailedToCreateMessageError(
          fnTag,
          getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
        );
      }

      saveMessageInSessionData(session.getClientSessionData(), message);

      return message;
    } catch (error) {
      this.Log.error(
        `${fnTag}, Error: ${new FailedToProcessError(
          fnTag,
          getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
          error,
        )}`,
      );
      setError(session, MessageType.PRE_SATP_TRANSFER_REQUEST, error);
      throw new FailedToProcessError(
        fnTag,
        getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
        error,
      );
    }
  }
}
