import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import {
  TransferCommenceRequestMessage,
  TransferCommenceResponseMessage,
  TransferProposalReceiptMessage,
  TransferProposalRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATPSession } from "../satp-session";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { Stage1ClientService } from "../stage-services/client/stage1-client-service";
import { SupportedChain } from "../types";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { getSessionId } from "./handler-utils";
import { PreSATPTransferResponse } from "../../generated/proto/cacti/satp/v02/stage_0_pb";

export class Stage1SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = SATPHandlerType.STAGE1;
  private sessions: Map<string, SATPSession>;
  private serverService: Stage1ServerService;
  private clientService: Stage1ClientService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage1ServerService;
    this.clientService = ops.clientService as Stage1ClientService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage1SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): SATPHandlerType {
    return Stage1SATPHandler.CLASS_NAME;
  }

  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
  getStage(): string {
    return Stage.STAGE1;
  }

  public get Log(): Logger {
    return this.logger;
  }

  private async TransferProposalImplementation(
    req: TransferProposalRequestMessage,
    context: HandlerContext,
  ): Promise<TransferProposalReceiptMessage> {
    const stepTag = `TransferProposalImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Proposal...`);
      this.Log.debug(
        `${fnTag}, Request: ${JSON.stringify(req)}, Context: ${JSON.stringify(context)}`,
      );

      const session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkTransferProposalRequestMessage(
        req,
        session,
        this.supportedDLTs,
      );

      const message = await this.serverService.transferProposalResponse(
        req,
        session,
      );

      this.Log.debug(
        `${fnTag}, Returning response: ${JSON.stringify(message)}`,
      );

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "TransferProposalReceipt");
      }
      return message;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "TransferProposalRequest", error);
    }
  }

  private async TransferCommenceImplementation(
    req: TransferCommenceRequestMessage,
    context: HandlerContext,
  ): Promise<TransferCommenceResponseMessage> {
    const stepTag = `TransferProposalImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Commence...`);
      this.Log.debug(
        `${fnTag}, Request: ${JSON.stringify(req)}, Context: ${JSON.stringify(context)}`,
      );

      const session = this.sessions.get(getSessionId(req));
      if (!session) {
        throw new SessionNotFoundError(fnTag);
      }

      await this.serverService.checkTransferCommenceRequestMessage(
        req,
        session,
      );
      const message = await this.serverService.transferCommenceResponse(
        req,
        session,
      );

      this.Log.debug(
        `${fnTag}, Returning response: ${JSON.stringify(message)}`,
      );

      if (!message) {
        throw new FailedToCreateMessageError(fnTag, "TransferCommenceResponse");
      }
      return message;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "TransferCommenceResponse", error);
    }
  }

  setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(SatpStage1Service, {
      async transferProposal(req, context) {
        return await that.TransferProposalImplementation(req, context)!;
      },
      async transferCommence(req, context) {
        return that.TransferCommenceImplementation(req, context);
      },
      // transferProposal: this.TransferProposalImplementation,
      // transferCommence: this.TransferCommenceImplementation,
    });
  }

  //client side
  public async TransferProposalRequest(
    sessionId: string,
    response: PreSATPTransferResponse,
  ): Promise<TransferProposalRequestMessage> {
    const stepTag = `TransferProposalRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Proposal Request...`);

      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      await this.clientService.checkPreSATPTransferResponse(response, session);

      const requestTransferProposal =
        await this.clientService.transferProposalRequest(
          session,
          this.supportedDLTs,
        );

      if (!requestTransferProposal) {
        throw new FailedToCreateMessageError(fnTag, "TransferProposalRequest");
      }
      return requestTransferProposal;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "TransferProposalRequest", error);
    }
  }

  //client side
  public async TransferCommenceRequest(
    response: TransferProposalReceiptMessage,
  ): Promise<TransferCommenceRequestMessage> {
    const stepTag = `TransferProposalRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Commence Request...`);
      this.Log.debug(`${fnTag}, Response: ${response}`);

      if (!response.common?.sessionId) {
        throw new Error(`${fnTag}, Session Id not found`);
      }

      const session = this.sessions.get(getSessionId(response));
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      await this.clientService.checkTransferProposalReceiptMessage(
        response,
        session,
      );

      const requestTransferCommence =
        await this.clientService.transferCommenceRequest(response, session);

      if (!requestTransferCommence) {
        throw new FailedToCreateMessageError(fnTag, "TransferCommenceRequest");
      }

      return requestTransferCommence;
    } catch (error) {
      throw new FailedToProcessError(fnTag, "TransferCommenceRequest", error);
    }
  }
}
