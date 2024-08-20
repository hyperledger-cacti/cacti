import { Logger } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntrySchema,
  RollbackState,
  RollbackStateSchema,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { create } from "@bufbuild/protobuf";
import {
  Type,
  SATPStage,
  SessionData,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";

export class Stage1RollbackStrategy implements RollbackStrategy {
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  async execute(session: SATPSession, role: Type): Promise<RollbackState> {
    const fnTag = "Stage1RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 1`);

    if (!session) {
      throw new Error(`${fnTag}, session data is not correctly initialized!`);
    }

    const rollbackState = create(RollbackStateSchema, {
      sessionId: session.getSessionId(),
      currentStage: SATPStage[2],
      rollbackLogEntries: [],
      status: "IN_PROGRESS",
      details: "",
    });

    // client-rollback
    if (session.hasClientSessionData() && role == Type.CLIENT) {
      const clientSessionData = session.getClientSessionData();
      await this.handleClientSideRollback(clientSessionData, rollbackState);
    }

    // server-rollback
    if (session.hasServerSessionData() && role == Type.SERVER) {
      const serverSessionData = session.getServerSessionData();
      await this.handleServerSideRollback(serverSessionData, rollbackState);
    }

    rollbackState.status = rollbackState.rollbackLogEntries.some(
      (entry) => entry.status === "FAILED",
    )
      ? "FAILED"
      : "COMPLETED";

    this.log.info(
      `${fnTag} Rollback of ${SATPStage[2]} finished with status: ${rollbackState.status}`,
    );
    return rollbackState;
  }

  private async handleClientSideRollback(
    clientSessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<void> {
    const fnTag = "Stage1RollbackStrategy#handleClientSideRollback";
    try {
      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: clientSessionData.id,
          stage: SATPStage[2],
          timestamp: new Date().toISOString(),
          action: "NO_ACTION_REQUIRED_CLIENT",
          status: "SUCCESS",
          details: "Client-side rollback completed successfully",
        }),
      );
    } catch (error) {
      this.log.error(`${fnTag} Error in client-side rollback: ${error}`);
      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: clientSessionData.id,
          stage: SATPStage[2],
          timestamp: new Date().toISOString(),
          action: "NO_ACTION_REQUIRED_CLIENT",
          status: "FAILED",
          details: `Client-side rollback failed: ${error}`,
        }),
      );
    }
  }

  private async handleServerSideRollback(
    serverSessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<void> {
    const fnTag = "Stage1RollbackStrategy#handleServerSideRollback";
    try {
      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: serverSessionData.id,
          stage: SATPStage[2],
          timestamp: new Date().toISOString(),
          action: "NO_ACTION_REQUIRED_SERVER",
          status: "SUCCESS",
          details: "Server-side rollback completed successfully",
        }),
      );
    } catch (error) {
      this.log.error(`${fnTag} Error in server-side rollback: ${error}`);
      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: serverSessionData.id,
          stage: SATPStage[2],
          timestamp: new Date().toISOString(),
          action: "NO_ACTION_REQUIRED_SERVER",
          status: "FAILED",
          details: `Server-side rollback failed: ${error}`,
        }),
      );
    }
  }

  async cleanup(
    session: SATPSession,
    state: RollbackState,
  ): Promise<RollbackState> {
    const fnTag = "Stage1RollbackStrategy#cleanup";
    this.log.info(`${fnTag} Cleaning up after Stage 1 rollback`);

    if (!session) {
      this.log.error(`${fnTag} Session not found`);
      return state;
    }

    try {
      // TODO: Implement Stage 1 specific cleanup logic

      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
