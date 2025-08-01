import { v4 as uuidv4 } from "uuid";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { Checks, LogLevelDesc } from "@hyperledger/cactus-common";

import { SatpLoggerProvider as LoggerProvider } from "./satp-logger-provider";
import { SATPLogger as Logger } from "./satp-logger";

import {
  Type,
  MessageStagesHashesSchema,
  MessageStagesSignaturesSchema,
  MessageStagesTimestampsSchema,
  SATPMessagesSchema,
  SessionData,
  SessionDataSchema,
  Stage0HashesSchema,
  Stage0MessagesSchema,
  Stage0SignaturesSchema,
  Stage0TimestampsSchema,
  Stage1HashesSchema,
  Stage1MessagesSchema,
  Stage1SignaturesSchema,
  Stage1TimestampsSchema,
  Stage2HashesSchema,
  Stage2MessagesSchema,
  Stage2SignaturesSchema,
  Stage2TimestampsSchema,
  Stage3HashesSchema,
  Stage3MessagesSchema,
  Stage3SignaturesSchema,
  Stage3TimestampsSchema,
  State,
} from "../generated/proto/cacti/satp/v02/session/session_pb";
import {
  AccessControlProfileError,
  ClientGatewayPubkeyError,
  CredentialProfileError,
  DigitalAssetIdError,
  GatewayNetworkIdError,
  lockExpirationTimeError,
  LockTypeError,
  LoggingProfileError,
  SATPVersionError,
  ServerGatewayPubkeyError,
  SessionCompletedError,
  SessionDataNotLoadedCorrectlyError,
  SessionIdError,
  SignatureAlgorithmError,
  TransferContextIdError,
} from "./errors/satp-service-errors";
import { SATP_VERSION } from "./constants";
import {
  LockType,
  SignatureAlgorithm,
} from "../generated/proto/cacti/satp/v02/common/message_pb";
import { SessionType } from "./session-utils";
import { create } from "@bufbuild/protobuf";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

// Define interface on protos
export interface ISATPSessionOptions {
  logLevel?: LogLevelDesc;
  contextID: string;
  sessionID?: string;
  server: boolean;
  client: boolean;
  monitorService: MonitorService;
}

export class SATPSession {
  public static readonly CLASS_NAME = "SATPSession";
  private clientSessionData: SessionData | undefined;
  private serverSessionData: SessionData | undefined;
  private readonly logger: Logger;
  private readonly monitorService: MonitorService;

  constructor(ops: ISATPSessionOptions) {
    const fnTag = `${SATPSession.CLASS_NAME}#constructor()`;
    Checks.truthy(ops, `${fnTag} arg options`);

    const level = ops.logLevel || "DEBUG";
    const label = this.className;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      { level, label },
      this.monitorService,
    );

    if (!ops.server && !ops.client) {
      throw new Error(`${SATPSession.CLASS_NAME}#constructor(), at least one of server or client must be true
    `);
    }
    if (ops.server) {
      this.serverSessionData = create(SessionDataSchema, {
        transferContextId: ops.contextID,
        id: ops.sessionID || this.generateSessionID(ops.contextID),
      });
      this.initialize(this.serverSessionData);
    }

    if (ops.client) {
      this.clientSessionData = create(SessionDataSchema, {
        transferContextId: ops.contextID,
        id: ops.sessionID || this.generateSessionID(ops.contextID),
      });
      this.initialize(this.clientSessionData);
    }
  }

  private generateSessionID(contextId: string): string {
    return uuidv4() + "-" + contextId;
  }

  private initialize(sessionData: SessionData): void {
    const fnTag = `${SATPSession.CLASS_NAME}#initialize()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, () => {
      try {
        sessionData.hashes = create(MessageStagesHashesSchema, {});
        sessionData.signatures = create(MessageStagesSignaturesSchema, {});
        sessionData.processedTimestamps = create(
          MessageStagesTimestampsSchema,
          {},
        );
        sessionData.receivedTimestamps = create(
          MessageStagesTimestampsSchema,
          {},
        );
        sessionData.satpMessages = create(SATPMessagesSchema, {});

        sessionData.processedTimestamps.stage0 = create(
          Stage0TimestampsSchema,
          {},
        );
        sessionData.processedTimestamps.stage1 = create(
          Stage1TimestampsSchema,
          {},
        );
        sessionData.processedTimestamps.stage2 = create(
          Stage2TimestampsSchema,
          {},
        );
        sessionData.processedTimestamps.stage3 = create(
          Stage3TimestampsSchema,
          {},
        );

        sessionData.receivedTimestamps.stage0 = create(
          Stage0TimestampsSchema,
          {},
        );
        sessionData.receivedTimestamps.stage1 = create(
          Stage1TimestampsSchema,
          {},
        );
        sessionData.receivedTimestamps.stage2 = create(
          Stage2TimestampsSchema,
          {},
        );
        sessionData.receivedTimestamps.stage3 = create(
          Stage3TimestampsSchema,
          {},
        );

        sessionData.hashes.stage0 = create(Stage0HashesSchema, {});
        sessionData.hashes.stage1 = create(Stage1HashesSchema, {});
        sessionData.hashes.stage2 = create(Stage2HashesSchema, {});
        sessionData.hashes.stage3 = create(Stage3HashesSchema, {});

        sessionData.signatures.stage0 = create(Stage0SignaturesSchema, {});
        sessionData.signatures.stage1 = create(Stage1SignaturesSchema, {});
        sessionData.signatures.stage2 = create(Stage2SignaturesSchema, {});
        sessionData.signatures.stage3 = create(Stage3SignaturesSchema, {});

        sessionData.satpMessages.stage0 = create(Stage0MessagesSchema, {});
        sessionData.satpMessages.stage1 = create(Stage1MessagesSchema, {});
        sessionData.satpMessages.stage2 = create(Stage2MessagesSchema, {});
        sessionData.satpMessages.stage3 = create(Stage3MessagesSchema, {});
        sessionData.state = State.ONGOING;

        this.monitorService.incrementCounter("created_sessions", 2);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public getServerSessionData(): SessionData {
    const fnTag = `${SATPSession.CLASS_NAME}#getServerSessionData()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        if (this.serverSessionData == undefined) {
          throw new Error(
            `${SATPSession.CLASS_NAME}#getServerSessionData(), serverSessionData is undefined`,
          );
        }
        return this.serverSessionData;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public get className(): string {
    return SATPSession.CLASS_NAME;
  }

  public getClientSessionData(): SessionData {
    const fnTag = `${SATPSession.CLASS_NAME}#getClientSessionData()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        if (this.clientSessionData == undefined) {
          throw new Error(
            `${SATPSession.CLASS_NAME}#getClientSessionData(), clientSessionData is undefined`,
          );
        }
        return this.clientSessionData;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public static recreateSession(
    sessionData: SessionData,
    monitorService: MonitorService,
  ): SATPSession {
    const fnTag = `${SATPSession.CLASS_NAME}#recreateSession()`;
    const { span, context: ctx } = monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const isClient = sessionData.role === Type.CLIENT;
        const isServer = sessionData.role === Type.SERVER;

        if (!isClient && !isServer) {
          throw new Error("Invalid gateway type!");
        }

        const session = new SATPSession({
          contextID: sessionData.transferContextId,
          sessionID: sessionData.id,
          server: isServer,
          client: isClient,
          monitorService: monitorService,
        });

        if (isServer) {
          session.serverSessionData = sessionData;
        }

        if (isClient) {
          session.clientSessionData = sessionData;
        }

        return session;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public createSessionData(
    type: SessionType,
    sessionId: string,
    contextId: string,
  ): void {
    const fnTag = `${SATPSession.CLASS_NAME}#createSessionData()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, () => {
      try {
        if (type == SessionType.SERVER) {
          if (this.serverSessionData !== undefined) {
            throw new Error(
              `${SATPSession.CLASS_NAME}#createSessionData(), serverSessionData already defined`,
            );
          }
        } else if (type == SessionType.CLIENT) {
          if (this.clientSessionData !== undefined) {
            throw new Error(
              `${SATPSession.CLASS_NAME}#createSessionData(), clientSessionData already defined`,
            );
          }
        } else {
          throw new Error(
            `${SATPSession.CLASS_NAME}#createSessionData(), sessionData type is not valid`,
          );
        }

        const sessionData = create(SessionDataSchema, {
          transferContextId: contextId,
          id: sessionId,
        });

        this.initialize(sessionData);

        switch (type) {
          case SessionType.SERVER:
            this.serverSessionData = sessionData;
            break;
          case SessionType.CLIENT:
            this.clientSessionData = sessionData;
            break;
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public hasServerSessionData(): boolean {
    return this.serverSessionData !== undefined;
  }

  public hasClientSessionData(): boolean {
    return this.clientSessionData !== undefined;
  }

  public getSessionId(): string {
    this.logger.info("serverSessionId: ", this.serverSessionData?.state);
    this.logger.info("clientSessionId: ", this.clientSessionData?.state);
    return this.serverSessionData?.id || this.clientSessionData?.id || "";
  }

  public getSessionState(): State {
    const fnTag = `${SATPSession.CLASS_NAME}#getSessionState()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.info("serverSessionId: ", this.serverSessionData?.state);
        this.logger.info("clientSessionId: ", this.clientSessionData?.state);
        return (
          this.serverSessionData?.state ||
          this.clientSessionData?.state ||
          State.UNSPECIFIED
        );
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public verify(
    tag: string,
    type: SessionType,
    rejected?: boolean,
    completed?: boolean,
    stage0?: boolean,
  ): void {
    const fnTag = `${SATPSession.CLASS_NAME}#verify()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, () => {
      try {
        let sessionData: SessionData | undefined;
        try {
          if (type == SessionType.SERVER) {
            sessionData = this.getServerSessionData();
          } else if (type == SessionType.CLIENT) {
            sessionData = this.getClientSessionData();
          } else {
            throw new Error(
              `${SATPSession.CLASS_NAME}#verify(), sessionData type is not valid`,
            );
          }

          if (sessionData == undefined) {
            throw new SessionDataNotLoadedCorrectlyError(tag, "undefined");
          }
          if (sessionData.state == State.REJECTED && !rejected) {
            throw new SessionCompletedError(
              "Session already completed (transfer rejected)",
            );
          }
          if (sessionData.state == State.COMPLETED && !completed) {
            throw new SessionCompletedError("Session already completed");
          }
          if (sessionData.id == "") {
            throw new SessionIdError(tag);
          }
          if (sessionData.digitalAssetId == "") {
            throw new DigitalAssetIdError(tag);
          }
          if (!stage0 && sessionData.senderGatewayNetworkId == "") {
            throw new GatewayNetworkIdError(tag);
          }
          if (!stage0 && sessionData.recipientGatewayNetworkId == "") {
            throw new GatewayNetworkIdError(tag);
          }
          if (sessionData.clientGatewayPubkey == "") {
            throw new ClientGatewayPubkeyError(tag);
          }
          if (sessionData.serverGatewayPubkey == "") {
            throw new ServerGatewayPubkeyError(tag);
          }
          if (sessionData.senderGatewayOwnerId == "") {
            throw new GatewayNetworkIdError(tag);
          }
          if (sessionData.receiverGatewayOwnerId == "") {
            throw new GatewayNetworkIdError(tag);
          }
          if (
            sessionData.signatureAlgorithm == SignatureAlgorithm.UNSPECIFIED
          ) {
            throw new SignatureAlgorithmError(tag);
          }
          if (sessionData.lockType == LockType.UNSPECIFIED) {
            throw new LockTypeError(tag);
          }
          if (sessionData.lockExpirationTime == BigInt(0)) {
            throw new lockExpirationTimeError(tag);
          }
          if (sessionData.credentialProfile == undefined) {
            throw new CredentialProfileError(tag);
          }
          if (sessionData.loggingProfile == "") {
            throw new LoggingProfileError(tag);
          }
          if (sessionData.accessControlProfile == "") {
            throw new AccessControlProfileError(tag);
          }
          if (sessionData.transferContextId == "") {
            throw new TransferContextIdError(tag);
          }
          if (
            // sessionData.maxRetries == undefined ||
            // sessionData.maxTimeout == undefined ||
            // sessionData.lastSequenceNumber == BigInt(0) ||
            false
          ) {
            throw new SessionDataNotLoadedCorrectlyError(
              tag,
              safeStableStringify(sessionData)!,
            );
          }
          if (sessionData.version != SATP_VERSION) {
            throw new SATPVersionError(tag, sessionData.version, SATP_VERSION);
          }
        } catch (error) {
          console.error(`${tag}, error: ${error}`);
          throw new SessionDataNotLoadedCorrectlyError(
            tag,
            safeStableStringify(sessionData)!,
            error,
          );
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public toString(): string {
    return this.serverSessionData
      ? safeStableStringify(this.serverSessionData)
      : safeStableStringify(this.clientSessionData!);
  }
}
