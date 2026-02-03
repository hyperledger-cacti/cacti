/**
 * @fileoverview
 * SATP Session Management - Core Session Lifecycle and State Management
 *
 * @description
 * This module provides comprehensive session management capabilities for SATP (Secure Asset
 * Transfer Protocol) operations within the Hyperledger Cacti ecosystem. It manages the
 * complete lifecycle of SATP transfer sessions, including creation, state tracking,
 * data persistence, and validation across all protocol stages.
 *
 * **Core Functionality:**
 * - **Session Lifecycle**: Complete session creation, management, and termination
 * - **State Management**: Tracking session state across all SATP protocol stages
 * - **Data Persistence**: Managing session data, messages, signatures, and hashes
 * - **Dual-Side Support**: Handles both client and server session perspectives
 * - **Validation Framework**: Comprehensive session data validation and verification
 *
 * **Session Architecture:**
 * - **Client Sessions**: Manages client-side session data and operations
 * - **Server Sessions**: Manages server-side session data and operations
 * - **Protocol Stages**: Supports all SATP stages (0-3) with stage-specific data
 * - **Message Tracking**: Maintains complete message history and audit trails
 * - **Cryptographic Integration**: Manages signatures, hashes, and verification
 *
 * **Key Features:**
 * - **State Persistence**: Maintains session state across protocol operations
 * - **Data Integrity**: Ensures session data consistency and validation
 * - **Error Handling**: Comprehensive error detection and recovery mechanisms
 * - **Monitoring Integration**: Full observability and debugging support
 * - **Protocol Compliance**: Ensures adherence to IETF SATP specifications
 *
 * **Usage Patterns:**
 * Sessions are created at the start of SATP transfers and maintained throughout
 * the entire protocol flow. They serve as the central repository for all
 * transfer-related data, state, and cryptographic materials.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-satp-core/} IETF SATP Core Specification
 * @see {@link SessionData} for session data structure
 * @see {@link SATPLogger} for logging integration
 * @see {@link MonitorService} for monitoring capabilities
 */

import { v4 as uuidv4 } from "uuid";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { Checks, LogLevelDesc } from "@hyperledger-cacti/cactus-common";

import { SATPLoggerProvider as LoggerProvider } from "./satp-logger-provider";
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

/**
 * Configuration options for SATP session initialization.
 *
 * @description
 * Defines the required and optional parameters for creating new SATP session
 * instances. These options control session behavior, logging configuration,
 * and specify whether the session operates in client or server mode.
 *
 * **Configuration Parameters:**
 * - **contextID**: Unique transfer context identifier for the SATP operation
 * - **sessionID**: Optional session identifier (auto-generated if not provided)
 * - **server**: Flag indicating server-side session operation
 * - **client**: Flag indicating client-side session operation
 * - **logLevel**: Optional logging level configuration
 * - **monitorService**: Monitoring service for observability and metrics
 *
 * @public
 * @interface ISATPSessionOptions
 * @since 0.0.3-beta
 * @see {@link SATPSession} for session implementation
 * @see {@link MonitorService} for monitoring integration
 */
export interface ISATPSessionOptions {
  /** Optional logging level for session operations */
  logLevel?: LogLevelDesc;
  /** Unique transfer context identifier */
  contextID: string;
  /** Optional session identifier (auto-generated if not provided) */
  sessionID?: string;
  /** Flag indicating server-side session operation */
  server: boolean;
  /** Flag indicating client-side session operation */
  client: boolean;
  /** Monitoring service for observability and metrics collection */
  monitorService: MonitorService;
}

/**
 * SATP Session implementation for managing cross-chain asset transfer sessions.
 *
 * @description
 * Comprehensive session management implementation that handles the complete
 * lifecycle of SATP transfer sessions. Manages both client and server session
 * data, tracks protocol state across all stages, and provides validation
 * and verification capabilities essential for secure cross-chain transfers.
 *
 * **Key Capabilities:**
 * - **Dual-Side Management**: Handles both client and server session perspectives
 * - **State Tracking**: Maintains session state across all SATP protocol stages
 * - **Data Integrity**: Ensures session data consistency and validation
 * - **Message Management**: Tracks all protocol messages, signatures, and hashes
 * - **Lifecycle Control**: Manages session creation, operation, and termination
 * - **Verification Framework**: Provides comprehensive session data verification
 *
 * **Session Lifecycle:**
 * 1. **Creation**: Initialize session with context and configuration
 * 2. **Data Management**: Store and retrieve session data throughout protocol
 * 3. **State Tracking**: Monitor and update session state across stages
 * 4. **Validation**: Verify session data integrity and compliance
 * 5. **Completion**: Handle session termination and cleanup
 *
 * **Architecture Benefits:**
 * - **Protocol Compliance**: Ensures adherence to IETF SATP specifications
 * - **Error Resilience**: Comprehensive error handling and recovery
 * - **Observability**: Full logging and monitoring integration
 * - **Flexibility**: Supports various transfer scenarios and configurations
 *
 * @public
 * @class SATPSession
 * @since 0.0.3-beta
 * @see {@link ISATPSessionOptions} for initialization options
 * @see {@link SessionData} for session data structure
 * @see {@link State} for session state enumeration
 */
export class SATPSession {
  /** Class identifier for logging and debugging purposes */
  public static readonly CLASS_NAME = "SATPSession";
  /** Client-side session data and state information */
  private clientSessionData: SessionData | undefined;
  /** Server-side session data and state information */
  private serverSessionData: SessionData | undefined;
  /** SATP-specific logger instance for session operations */
  private readonly logger: Logger;
  /** Monitoring service for session observability and metrics */
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

        this.monitorService.updateCounter("created_sessions");
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
