import { v4 as uuidv4 } from "uuid";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  MessageStagesHashes,
  MessageStagesSignatures,
  MessageStagesTimestamps,
  SessionData,
  Stage0Hashes,
  Stage0Signatures,
  Stage0Timestamps,
  Stage1Hashes,
  Stage1Signatures,
  Stage1Timestamps,
  Stage2Hashes,
  Stage2Signatures,
  Stage2Timestamps,
  Stage3Hashes,
  Stage3Signatures,
  Stage3Timestamps,
} from "../generated/proto/cacti/satp/v02/common/session_pb";
import {
  AccessControlProfileError,
  ClientGatewayPubkeyError,
  CredentialProfileError,
  DigitalAssetIdError,
  GatewayNetworkIdError,
  lockExpirationTimeError,
  LockTypeError,
  LoggingProfileError,
  PubKeyError,
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

// Define interface on protos
export interface ISATPSessionOptions {
  contextID: string;
  sessionID?: string;
  server: boolean;
  client: boolean;
}

export class SATPSession {
  public static readonly CLASS_NAME = "SATPSession";
  private clientSessionData: SessionData | undefined;
  private serverSessionData: SessionData | undefined;

  constructor(ops: ISATPSessionOptions) {
    if (!ops.server && !ops.client) {
      throw new Error(`${SATPSession.CLASS_NAME}#constructor(), at least one of server or client must be true
    `);
    }
    if (ops.server) {
      this.serverSessionData = new SessionData();
      this.serverSessionData.transferContextId = ops.contextID;
      this.serverSessionData.id =
        ops.sessionID || this.generateSessionID(ops.contextID);
      this.initialize(this.serverSessionData);
    }

    if (ops.client) {
      this.clientSessionData = new SessionData();
      this.clientSessionData.transferContextId = ops.contextID;
      this.clientSessionData.id =
        ops.sessionID || this.generateSessionID(ops.contextID);
      this.initialize(this.clientSessionData);
    }
  }

  private generateSessionID(contextId: string): string {
    return uuidv4() + "-" + contextId;
  }

  private initialize(sessionData: SessionData): void {
    sessionData.hashes = new MessageStagesHashes();
    sessionData.signatures = new MessageStagesSignatures();
    sessionData.processedTimestamps = new MessageStagesTimestamps();
    sessionData.receivedTimestamps = new MessageStagesTimestamps();

    sessionData.processedTimestamps.stage0 = new Stage0Timestamps();
    sessionData.processedTimestamps.stage1 = new Stage1Timestamps();
    sessionData.processedTimestamps.stage2 = new Stage2Timestamps();
    sessionData.processedTimestamps.stage3 = new Stage3Timestamps();

    sessionData.receivedTimestamps.stage0 = new Stage0Timestamps();
    sessionData.receivedTimestamps.stage1 = new Stage1Timestamps();
    sessionData.receivedTimestamps.stage2 = new Stage2Timestamps();
    sessionData.receivedTimestamps.stage3 = new Stage3Timestamps();

    sessionData.hashes.stage0 = new Stage0Hashes();
    sessionData.hashes.stage1 = new Stage1Hashes();
    sessionData.hashes.stage2 = new Stage2Hashes();
    sessionData.hashes.stage3 = new Stage3Hashes();

    sessionData.signatures.stage0 = new Stage0Signatures();
    sessionData.signatures.stage1 = new Stage1Signatures();
    sessionData.signatures.stage2 = new Stage2Signatures();
    sessionData.signatures.stage3 = new Stage3Signatures();
  }

  public getServerSessionData(): SessionData {
    if (this.serverSessionData == undefined) {
      throw new Error(
        `${SATPSession.CLASS_NAME}#getServerSessionData(), serverSessionData is undefined`,
      );
    }
    return this.serverSessionData;
  }

  public getClientSessionData(): SessionData {
    if (this.clientSessionData == undefined) {
      throw new Error(
        `${SATPSession.CLASS_NAME}#getClientSessionData(), clientSessionData is undefined`,
      );
    }
    return this.clientSessionData;
  }

  public createSessionData(
    type: SessionType,
    sessionId: string,
    contextId: string,
  ): void {
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

    const sessionData = new SessionData();
    sessionData.transferContextId = contextId;
    sessionData.id = sessionId;
    this.initialize(sessionData);

    switch (type) {
      case SessionType.SERVER:
        this.serverSessionData = sessionData;
        break;
      case SessionType.CLIENT:
        this.clientSessionData = sessionData;
        break;
    }
  }

  public hasServerSessionData(): boolean {
    return this.serverSessionData !== undefined;
  }

  public hasClientSessionData(): boolean {
    return this.clientSessionData !== undefined;
  }

  public getSessionId(): string {
    console.log("serverSessionId: ", this.serverSessionData?.id);
    console.log("clientSessionId: ", this.clientSessionData?.id);
    return this.serverSessionData?.id || this.clientSessionData?.id || "";
  }

  public verify(tag: string, type: SessionType): void {
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

      if (sessionData.completed) {
        throw new SessionCompletedError("Session already completed");
      }
      if (sessionData.id == "") {
        throw new SessionIdError(tag);
      }
      if (sessionData.digitalAssetId == "") {
        throw new DigitalAssetIdError(tag);
      }
      if (sessionData.originatorPubkey == "") {
        throw new PubKeyError(tag);
      }
      if (sessionData.beneficiaryPubkey == "") {
        throw new PubKeyError(tag);
      }
      if (sessionData.senderGatewayNetworkId == "") {
        throw new GatewayNetworkIdError(tag);
      }
      if (sessionData.recipientGatewayNetworkId == "") {
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
      if (sessionData.signatureAlgorithm == SignatureAlgorithm.UNSPECIFIED) {
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
  }
}
