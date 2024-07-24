import { createPromiseClient } from "@connectrpc/connect";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { SatpStage1Service } from "../generated/proto/cacti/satp/v02/stage_1_connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { SatpStage2Service } from "../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../generated/proto/cacti/satp/v02/stage_3_connect";
import { SATPManager } from "../gol/satp-manager";
import { SATPSession } from "./satp-session";
import { SATPHandler } from "../types/satp-protocol";
import { Stage1SATPHandler } from "./stage-handlers/stage1-handler";
import { Stage2SATPHandler } from "./stage-handlers/stage2-handler";
import { Stage3SATPHandler } from "./stage-handlers/stage3-handler";

export interface ISenderSATPProtocolOptions {
  logLevel?: LogLevelDesc;
  serverPath: string;
  sessionId: string;
  satpManager: SATPManager;
}

export interface SATPTransferRequest {
  sessionId: string;
}

export class SenderSATPProtocol {
  public static readonly CLASS_NAME = "SenderSATPProtocol";

  private satpManager: SATPManager;

  readonly log: Logger;
  constructor(private config: ISenderSATPProtocolOptions) {
    this.log = LoggerProvider.getOrCreate({
      label: SenderSATPProtocol.CLASS_NAME,
      level: config.logLevel || "INFO",
    });
    this.satpManager = config.satpManager;
  }

  public async initiateTransfer(session: SATPSession): Promise<void> {
    this.log.info(`Initiating Transfer`);
    this.log.info(`Session: ${JSON.stringify(session)}`);

    if (!session) {
      throw new Error(`Session with id ${this.config.sessionId} not found`);
    }

    const transport = createConnectTransport({
      baseUrl: this.config.serverPath,
      httpVersion: "1.1",
    });

    const handlers = this.satpManager.getSATPHandlers(
      session.getSessionData().id,
    );

    if (!handlers) {
      throw new Error(
        `No handlers found for session ${session.getSessionData().id}`,
      );
    }

    const satpHandlers: Map<string, SATPHandler> = handlers;

    const clientSatpStage1 = createPromiseClient(SatpStage1Service, transport);
    const clientSatpStage2 = createPromiseClient(SatpStage2Service, transport);
    const clientSatpStage3 = createPromiseClient(SatpStage3Service, transport);

    const requestTransferProposal = await (
      satpHandlers.get("Stage1SATPHandler") as Stage1SATPHandler
    ).TransferProposalRequest();

    if (!requestTransferProposal) {
      throw new Error(`Failed to create TransferProposalRequest`);
    }

    const responseTransferProposal = await clientSatpStage1.transferProposal(
      requestTransferProposal,
    );

    this.log.info(
      `responseTransferProposal: ${JSON.stringify(responseTransferProposal)}`,
    );

    const requestTransferCommence = await (
      satpHandlers.get("Stage1SATPHandler") as Stage1SATPHandler
    ).TransferCommenceRequest(responseTransferProposal);

    if (!requestTransferCommence) {
      throw new Error(`Failed to create TransferCommenceRequest`);
    }

    const responseTransferCommence = await clientSatpStage1.transferCommence(
      requestTransferCommence,
    );

    this.log.info(
      `responseTransferCommence: ${JSON.stringify(responseTransferCommence)}`,
    );

    this.log.info(`Stage 1 completed`);

    const requestLockAssertion = await (
      satpHandlers.get("Stage2SATPHandler") as Stage2SATPHandler
    ).LockAssertionRequest(responseTransferCommence);

    if (!requestLockAssertion) {
      throw new Error(`Failed to create LockAssertionRequest`);
    }

    const responseLockAssertion =
      await clientSatpStage2.lockAssertion(requestLockAssertion);

    this.log.info(
      `responseLockAssertion: ${JSON.stringify(responseLockAssertion)}`,
    );

    this.log.info(`Stage 2 completed`);

    const requestCommitPreparation = await (
      satpHandlers.get("Stage3SATPHandler") as Stage3SATPHandler
    ).CommitPreparationRequest(responseLockAssertion);

    if (!requestCommitPreparation) {
      throw new Error(`Failed to create CommitPreparationRequest`);
    }

    const responseCommitPreparation = await clientSatpStage3.commitPreparation(
      requestCommitPreparation,
    );
    this.log.info(
      `responseCommitPreparation: ${JSON.stringify(responseCommitPreparation)}`,
    );

    const requestCommitFinalAssertion = await (
      satpHandlers.get("Stage3SATPHandler") as Stage3SATPHandler
    ).CommitFinalAssertionRequest(responseLockAssertion);

    if (!requestCommitFinalAssertion) {
      throw new Error(`Failed to create CommitFinalAssertionRequest`);
    }

    const responseCommitFinalAssertion =
      await clientSatpStage3.commitFinalAssertion(requestCommitFinalAssertion);
    this.log.info(
      `responseCommitFinalAssertion: ${JSON.stringify(responseCommitFinalAssertion)}`,
    );

    const RequestTransferComplete = await (
      satpHandlers.get("Stage3SATPHandler") as Stage3SATPHandler
    ).TransferCompleteRequest(responseCommitFinalAssertion);

    if (!RequestTransferComplete) {
      throw new Error(`Failed to create TransferCompleteRequest`);
    }

    const responseTransferComplete = await clientSatpStage3.transferComplete(
      RequestTransferComplete,
    );
    this.log.info(
      `responseTransferComplete: ${JSON.stringify(responseTransferComplete)}`,
    );

    this.log.info(`Stage 3 completed`);
  }
}
