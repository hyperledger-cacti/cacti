import { v4 as uuidv4 } from "uuid";
import { SessionData } from "../generated/proto/cacti/satp/v02/common/session_pb";

export interface ISATPSessionOptions {
  contextID: string;
}

export class SATPSession {
  private static readonly CLASS_NAME = "SATPSession";
  private sessionData: SessionData;

  constructor(ops: ISATPSessionOptions) {
    this.sessionData = new SessionData();
    this.sessionData.transferContextId = ops.contextID;

    // TODO algorithm to create session ID from context ID
    this.sessionData.id = ops.contextID + "-" + uuidv4();
  }

  private initializeSessionID(): void {
    if (this.sessionData.id === undefined) {
      this.sessionData.id = uuidv4() + "-" + this.sessionData.transferContextId;
    } else {
      throw new Error("Session ID already initialized");
    }
  }

  public getSessionData(): SessionData {
    return this.sessionData;
  }
}
