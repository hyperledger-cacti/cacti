import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/stage_3_connect";
import {
  CommitFinalAcknowledgementReceiptResponse,
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  CommitReadyResponse,
  TransferCompleteRequest,
  TransferCompleteResponse,
} from "../../generated/proto/cacti/satp/v02/stage_3_pb";

export const sendCommitPreparationRequest: any = (router: ConnectRouter) =>
  router.service(SatpStage3Service, {
    async commitPreparation(
      req: CommitPreparationRequest,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);
      return new CommitReadyResponse({});
    },
  });

export const sendCommitFinalAssertionRequest: any = (router: ConnectRouter) =>
  router.service(SatpStage3Service, {
    async commitFinalAssertion(
      req: CommitFinalAssertionRequest,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);
      return new CommitFinalAcknowledgementReceiptResponse({});
    },
  });

export const sendTransferCompleteRequest: any = (router: ConnectRouter) =>
  router.service(SatpStage3Service, {
    async transferComplete(
      req: TransferCompleteRequest,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);
      return new TransferCompleteResponse({});
    },
  });
