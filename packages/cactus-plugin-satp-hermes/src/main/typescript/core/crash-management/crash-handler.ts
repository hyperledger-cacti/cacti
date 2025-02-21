import type { ConnectRouter } from "@connectrpc/connect";
import type { Logger } from "@hyperledger/cactus-common";
import {
  CrashRecovery,
  type RecoverSuccessMessageResponse,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import type { CrashRecoveryServerService } from "./server-service";
import type { CrashRecoveryClientService } from "./client-service";
import type {
  RecoverMessage,
  RecoverUpdateMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackAckMessage,
  RollbackState,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { type SATPHandler, SATPHandlerType } from "../../types/satp-protocol";
import type { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";

export class CrashRecoveryHandler implements SATPHandler {
  private readonly log: Logger;

  constructor(
    private readonly serverService: CrashRecoveryServerService,
    private readonly clientService: CrashRecoveryClientService,
    log: Logger,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryHandler.name}`);
  }

  public getHandlerIdentifier(): SATPHandlerType {
    return SATPHandlerType.CRASH;
  }

  public getHandlerSessions(): string[] {
    return [];
  }

  public getStage(): string {
    return "crash";
  }

  // Server-side

  private async recoverV2MessageImplementation(
    req: RecoverMessage,
  ): Promise<RecoverUpdateMessage> {
    const fnTag = `${CrashRecoveryHandler.name}#recoverV2MessageImplementation`;
    this.log.debug(`${fnTag} - Handling RecoverMessage: ${req}`);
    try {
      return await this.serverService.handleRecover(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  private async recoverV2SuccessMessageImplementation(
    req: RecoverSuccessMessage,
  ): Promise<RecoverSuccessMessageResponse> {
    const fnTag = `${CrashRecoveryHandler.name}#recoverV2SuccessMessageImplementation`;
    this.log.debug(`${fnTag} - Handling RecoverSuccessMessage:${req}`);
    try {
      return await this.serverService.handleRecoverSuccess(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  private async rollbackV2MessageImplementation(
    req: RollbackMessage,
  ): Promise<RollbackAckMessage> {
    const fnTag = `${CrashRecoveryHandler.name}#rollbackV2MessageImplementation`;
    this.log.debug(`${fnTag} - Handling RollbackMessage: ${req}`);
    try {
      return await this.serverService.handleRollback(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  public setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(CrashRecovery, {
      async recoverV2Message(req) {
        return await that.recoverV2MessageImplementation(req);
      },
      async recoverV2SuccessMessage(req) {
        return await that.recoverV2SuccessMessageImplementation(req);
      },
      async rollbackV2Message(req) {
        return await that.rollbackV2MessageImplementation(req);
      },
    });

    this.log.info("Router setup completed for CrashRecoveryHandler");
  }

  // Client-side

  public async sendRecoverMessage(
    session: SessionData,
  ): Promise<RecoverMessage> {
    const fnTag = `${this.constructor.name}#createRecoverMessage`;
    try {
      return this.clientService.createRecoverMessage(session);
    } catch (error) {
      this.log.error(`${fnTag} - Failed to create RecoverMessage: ${error}`);
      throw new Error(`Error in createRecoverMessage: ${error}`);
    }
  }

  public async sendRecoverSuccessMessage(
    session: SessionData,
  ): Promise<RecoverSuccessMessage> {
    const fnTag = `${this.constructor.name}#createRecoverSuccessMessage`;
    try {
      return await this.clientService.createRecoverSuccessMessage(session);
    } catch (error) {
      this.log.error(
        `${fnTag} - Failed to create RecoverSuccessMessage: ${error}`,
      );
      throw new Error(`Error in createRecoverSuccessMessage: ${error}`);
    }
  }

  public async sendRollbackMessage(
    session: SessionData,
    rollbackState: RollbackState,
  ): Promise<RollbackMessage> {
    const fnTag = `${this.constructor.name}#createRollbackMessage`;
    try {
      return await this.clientService.createRollbackMessage(
        session,
        rollbackState,
      );
    } catch (error) {
      this.log.error(`${fnTag} - Failed to create RollbackMessage: ${error}`);
      throw new Error(`Error in createRollbackMessage: ${error}`);
    }
  }
}
