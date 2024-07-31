import { v4 as uuidv4 } from "uuid";
import {
  MessageStagesHashes,
  MessageStagesSignatures,
  MessageStagesTimestamps,
  SessionData,
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
      this.serverSessionData.id = this.generateSessionID(ops.contextID);
      this.initialize(this.serverSessionData);
    }

    if (ops.client) {
      this.clientSessionData = new SessionData();
      this.clientSessionData.transferContextId = ops.contextID;
      this.clientSessionData.id = this.generateSessionID(ops.contextID);
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

    sessionData.processedTimestamps.stage1 = new Stage1Timestamps();
    sessionData.processedTimestamps.stage2 = new Stage2Timestamps();
    sessionData.processedTimestamps.stage3 = new Stage3Timestamps();

    sessionData.receivedTimestamps.stage1 = new Stage1Timestamps();
    sessionData.receivedTimestamps.stage2 = new Stage2Timestamps();
    sessionData.receivedTimestamps.stage3 = new Stage3Timestamps();

    sessionData.hashes.stage1 = new Stage1Hashes();
    sessionData.hashes.stage2 = new Stage2Hashes();
    sessionData.hashes.stage3 = new Stage3Hashes();

    sessionData.signatures.stage1 = new Stage1Signatures();
    sessionData.signatures.stage2 = new Stage2Signatures();
    sessionData.signatures.stage3 = new Stage3Signatures();
  }

  public getServerSessionData(): SessionData | undefined {
    return this.serverSessionData;
  }

  public getClientSessionData(): SessionData | undefined {
    return this.clientSessionData;
  }

  public hasServerSessionData(): boolean {
    return this.serverSessionData !== undefined;
  }

  public hasClientSessionData(): boolean {
    return this.clientSessionData !== undefined;
  }

  public getSessionId(): string {
    return this.serverSessionData?.id || this.clientSessionData?.id || "";
  }
}
