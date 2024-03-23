import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/stage_3_connect";
import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  TransferCompleteRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_3_pb";
import { Empty } from "@bufbuild/protobuf";

export default (router: ConnectRouter) =>
  router.service(SatpStage3Service, {
    async commitPreparation(
      req: CommitPreparationRequestMessage,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);

      //todo

      return new CommitReadyResponseMessage({});
    },
    async commitFinalAssertion(
      req: CommitFinalAssertionRequestMessage,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);

      //todo

      return new CommitFinalAcknowledgementReceiptResponseMessage({});
    },
    async transferComplete(
      req: TransferCompleteRequestMessage,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);

      //todo

      return new Empty({});
    },
  });
