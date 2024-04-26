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
    this.sessionData.id = this.generateSessionID();

  }

  private generateSessionID(): string {
    return this.sessionData.id = uuidv4() + "-" + this.sessionData.transferContextId;
  }

  public getSessionData(): SessionData {
    return this.sessionData;
  }
}
