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
import { SATPHandler, SATPHandlerOptions } from "../../types/satp-protocol";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

export class Stage1SATPHandler implements SATPHandler {
  public static readonly CLASS_NAME = "Stage1SATPHandler";
  private session: SATPSession;
  private serverService: Stage1ServerService;
  private clientService: Stage1ClientService;
  private supportedDLTs: SupportedChain[];
  private logger: Logger;

  constructor(ops: SATPHandlerOptions) {
    this.session = ops.session;
    this.serverService = ops.serverService as Stage1ServerService;
    this.clientService = ops.clientService as Stage1ClientService;
    this.supportedDLTs = ops.supportedDLTs;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${Stage1SATPHandler.CLASS_NAME}`);
  }

  getHandlerIdentifier(): string {
    return Stage1SATPHandler.CLASS_NAME;
  }

  getSessionId(): string {
    return this.session.getSessionData().id;
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
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);
      const sessionData =
        await this.serverService.checkTransferProposalRequestMessage(
          req,
          this.session,
          this.supportedDLTs,
        );
      const message = await this.serverService.transferProposalResponse(
        req,
        this.session,
      );
      this.Log.debug(`${fnTag}, Returning response: ${message}`);
      this.Log.debug(`${fnTag}, Session Data: ${sessionData}`);

      if (!message) {
        throw new Error(`${fnTag}, Failed to create TransferProposalReceipt`);
      }
      return message;
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process TransferProposal ${error}`);
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
      this.Log.debug(`${fnTag}, Request: ${req}, Context: ${context}`);
      const sessionData =
        await this.serverService.checkTransferCommenceRequestMessage(
          req,
          this.session,
        );
      const message = await this.serverService.transferCommenceResponse(
        req,
        this.session,
      );
      this.Log.debug(`${fnTag}, Returning response: ${message}`);
      this.Log.debug(`${fnTag}, Session Data: ${sessionData}`);

      if (!message) {
        throw new Error(`${fnTag}, Failed to create TransferCommenceResponse`);
      }
      return message;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process TransferCommenceRequest ${error}`,
      );
    }
  }

  setupRouter(router: ConnectRouter): void {
    router.service(SatpStage1Service, {
      transferProposal: this.TransferProposalImplementation,
      transferCommence: this.TransferCommenceImplementation,
    });
  }

  //client side
  public async TransferProposalRequest(): Promise<TransferProposalRequestMessage> {
    const stepTag = `TransferProposalRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Transfer Proposal Request...`);
      const requestTransferProposal =
        await this.clientService.transferProposalRequest(
          this.session,
          this.supportedDLTs,
        );

      if (!requestTransferProposal) {
        throw new Error(`${fnTag}, Failed to create TransferProposalRequest`);
      }
      return requestTransferProposal;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process TransferProposalRequest ${error}`,
      );
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

      await this.clientService.checkTransferProposalReceiptMessage(
        response,
        this.session,
      );

      const requestTransferCommence =
        await this.clientService.transferCommenceRequest(
          response,
          this.session,
        );

      if (!requestTransferCommence) {
        throw new Error(`${fnTag}, Failed to create TransferCommenceRequest`);
      }

      return requestTransferCommence;
    } catch (error) {
      throw new Error(
        `${fnTag}, Failed to process TransferCommenceRequest ${error}`,
      );
    }
  }
}
