import { Logger } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { Stage0RollbackStrategy } from "./stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "./stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "./stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "./stage3-rollback-strategy";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { RollbackState } from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import {
  Stage0Hashes,
  Stage1Hashes,
  Stage2Hashes,
  Stage3Hashes,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATPLogger } from "../../../logging";

export interface RollbackStrategy {
  execute(session: SATPSession): Promise<RollbackState>;
  cleanup(session: SATPSession, state: RollbackState): Promise<RollbackState>;
}

export class RollbackStrategyFactory {
  private log: Logger;
  private bridgesManager: SATPBridgesManager;
  private dbLogger: SATPLogger;

  constructor(
    bridgesManager: SATPBridgesManager,
    log: Logger,
    dbLogger: SATPLogger,
  ) {
    this.log = log;
    this.bridgesManager = bridgesManager;
    this.dbLogger = dbLogger;
  }

  private isStage0Complete(hashes: Stage0Hashes): boolean {
    return !!(
      hashes?.newSessionRequestMessageHash &&
      hashes.newSessionResponseMessageHash &&
      hashes.preSatpTransferRequestMessageHash &&
      hashes.preSatpTransferResponseMessageHash
    );
  }

  private isStage1Complete(hashes: Stage1Hashes): boolean {
    return !!(
      hashes?.transferProposalRequestMessageHash &&
      hashes.transferProposalReceiptMessageHash &&
      hashes.transferProposalRejectMessageHash &&
      hashes.transferCommenceRequestMessageHash &&
      hashes.transferCommenceResponseMessageHash
    );
  }

  private isStage2Complete(hashes: Stage2Hashes): boolean {
    return !!(
      hashes?.lockAssertionRequestMessageHash &&
      hashes.lockAssertionReceiptMessageHash
    );
  }

  private isStage3Complete(hashes: Stage3Hashes): boolean {
    return !!(
      hashes?.commitPreparationRequestMessageHash &&
      hashes.commitReadyResponseMessageHash &&
      hashes.commitFinalAssertionRequestMessageHash &&
      hashes.commitFinalAcknowledgementReceiptResponseMessageHash &&
      hashes.transferCompleteMessageHash &&
      hashes.transferCompleteResponseMessageHash
    );
  }

  createStrategy(session: SATPSession): RollbackStrategy {
    const fnTag = "RollbackStrategyFactory#createStrategy";
    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData || !sessionData.hashes) {
      throw new Error("Session data or hashes are undefined.");
    }

    const hashes = sessionData.hashes;

    const stage0Complete =
      hashes.stage0 && this.isStage0Complete(hashes.stage0);
    const stage1Complete =
      stage0Complete && hashes.stage1 && this.isStage1Complete(hashes.stage1);
    const stage2Complete =
      stage1Complete && hashes.stage2 && this.isStage2Complete(hashes.stage2);
    const stage3Complete =
      stage2Complete && hashes.stage3 && this.isStage3Complete(hashes.stage3);

    if (!stage0Complete) {
      this.log.debug(`${fnTag} Creating Stage0RollbackStrategy`);
      return new Stage0RollbackStrategy(
        this.bridgesManager,
        this.log,
        this.dbLogger,
      );
    } else if (!stage1Complete) {
      this.log.debug(`${fnTag} Creating Stage1RollbackStrategy`);
      return new Stage1RollbackStrategy(this.log, this.dbLogger);
    } else if (!stage2Complete) {
      this.log.debug(`${fnTag} Creating Stage2RollbackStrategy`);
      return new Stage2RollbackStrategy(
        this.bridgesManager,
        this.log,
        this.dbLogger,
      );
    } else if (!stage3Complete) {
      this.log.debug(`${fnTag} Creating Stage3RollbackStrategy`);
      return new Stage3RollbackStrategy(
        this.bridgesManager,
        this.log,
        this.dbLogger,
      );
    } else {
      this.log.debug(`${fnTag} All stages completed; no rollback needed`);
      throw new Error("No rollback needed as all stages are complete.");
    }
  }
}
