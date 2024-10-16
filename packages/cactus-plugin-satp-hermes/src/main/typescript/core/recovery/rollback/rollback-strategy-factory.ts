import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { Stage0RollbackStrategy } from "./stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "./stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "./stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "./stage3-rollback-strategy";
import {
  ISATPBridgesOptions,
  SATPBridgesManager,
} from "../../../gol/satp-bridges-manager";
import { RollbackState } from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { ILocalLogRepository } from "../../../repository/interfaces/repository";

/*export interface RollbackState {
  currentStage: string;
  // todo add rollback state
  // placeholder, should import RollbackLogEntry from protos.
  // RollbackLogEntry in spec = RollbackState in code
}*/

export interface RollbackStrategy {
  execute(session: SATPSession): Promise<RollbackState>;
  // todo do we want to return any information?
  cleanup(session: SATPSession, state: RollbackState): Promise<RollbackState>;
}

export class RollbackStrategyFactory {
  private log: Logger;
  private bridgesManager: SATPBridgesManager;
  private logRepository: ILocalLogRepository;

  constructor(options: ISATPBridgesOptions, localLog: ILocalLogRepository) {
    this.log = LoggerProvider.getOrCreate({ label: "RollbackStrategyFactory" });
    this.bridgesManager = new SATPBridgesManager(options);
    this.logRepository = localLog;
  }

  createStrategy(session: SATPSession): RollbackStrategy {
    const fnTag = "RollbackStrategyFactory#createStrategy";
    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData.hashes) {
      this.log.debug(`${fnTag} Creating Stage0RollbackStrategy`);
      return new Stage0RollbackStrategy(this.logRepository);
    } else if (
      !sessionData.hashes.stage2 ||
      Object.keys(sessionData.hashes.stage2).length === 0
    ) {
      this.log.debug(`${fnTag} Creating Stage1RollbackStrategy`);
      return new Stage1RollbackStrategy(
        this.bridgesManager,
        this.logRepository,
      );
    } else if (
      !sessionData.hashes.stage3 ||
      Object.keys(sessionData.hashes.stage3).length === 0
    ) {
      this.log.debug(`${fnTag} Creating Stage2RollbackStrategy`);
      return new Stage2RollbackStrategy(
        this.bridgesManager,
        this.logRepository,
      );
    } else {
      this.log.debug(`${fnTag} Creating Stage3RollbackStrategy`);
      return new Stage3RollbackStrategy(
        this.bridgesManager,
        this.logRepository,
      );
    }
  }
}
