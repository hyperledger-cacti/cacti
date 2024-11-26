import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { CrashRecovery } from "../../generated/proto/cacti/satp/v02/crash_recovery_connect";
import { CrashRecoveryServerService } from "./recovery-server-service";
import { CrashRecoveryClientService } from "./recovery-client-service";
import { SATPSession } from "../satp-session";
import {
  RecoverMessage,
  RecoverUpdateMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackAckMessage,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";

export class CrashRecoveryHandler {
  private readonly log: Logger;

  constructor(
    private readonly serverService: CrashRecoveryServerService,
    private readonly clientService: CrashRecoveryClientService,
    loggerLabel: string = "CrashRecoveryHandler",
  ) {
    this.log = LoggerProvider.getOrCreate({ label: loggerLabel });
    this.log.trace(`Initialized ${CrashRecoveryHandler.name}`);
  }

  // Server-side

  private async recoverV2MessageImplementation(
    req: RecoverMessage,
    context: HandlerContext,
  ): Promise<RecoverUpdateMessage> {
    const fnTag = `${CrashRecoveryHandler.name}#recoverV2MessageImplementation`;
    this.log.debug(
      `${fnTag} - Handling RecoverMessage: ${req}, Context: ${context}`,
    );
    try {
      return await this.serverService.handleRecover(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  private async recoverV2SuccessMessageImplementation(
    req: RecoverSuccessMessage,
    context: HandlerContext,
  ): Promise<void> {
    const fnTag = `${CrashRecoveryHandler.name}#recoverV2SuccessMessageImplementation`;
    this.log.debug(
      `${fnTag} - Handling RecoverSuccessMessage:${req}, Context: ${context}`,
    );
    try {
      await this.serverService.handleRecoverSuccess(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  private async rollbackV2MessageImplementation(
    req: RollbackMessage,
    context: HandlerContext,
  ): Promise<RollbackAckMessage> {
    const fnTag = `${CrashRecoveryHandler.name}#rollbackV2MessageImplementation`;
    this.log.debug(
      `${fnTag} - Handling RollbackMessage: ${req}, Context: ${context}`,
    );
    try {
      return await this.serverService.handleRollback(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  private async rollbackV2AckMessageImplementation(
    req: RollbackAckMessage,
    context: HandlerContext,
  ): Promise<void> {
    const fnTag = `${CrashRecoveryHandler.name}#rollbackV2AckMessageImplementation`;
    this.log.debug(
      `${fnTag} - Handling RollbackAckMessage: ${req}, Context: ${context}`,
    );
    try {
      await this.serverService.handleRollbackAck(req);
    } catch (error) {
      this.log.error(`${fnTag} - Error:`, error);
      throw error;
    }
  }

  public setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(CrashRecovery, {
      async recoverV2Message(req, context) {
        return await that.recoverV2MessageImplementation(req, context);
      },
      async recoverV2SuccessMessage(req, context) {
        return await that.recoverV2SuccessMessageImplementation(req, context);
      },
      async rollbackV2Message(req, context) {
        return await that.rollbackV2MessageImplementation(req, context);
      },
      async rollbackV2AckMessage(req, context) {
        return await that.rollbackV2AckMessageImplementation(req, context);
      },
    });

    this.log.info("Router setup completed for CrashRecoveryHandler");
  }

  // Client-side

  public async createRecoverMessage(
    session: SATPSession,
  ): Promise<RecoverMessage> {
    return this.clientService.createRecoverMessage(session);
  }

  public async createRecoverSuccessMessage(
    session: SATPSession,
  ): Promise<RecoverSuccessMessage> {
    return this.clientService.createRecoverSuccessMessage(session);
  }
}
