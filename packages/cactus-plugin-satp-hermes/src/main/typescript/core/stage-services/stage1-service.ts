import { ConnectRouter, HandlerContext } from "@connectrpc/connect";

import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import {
  TransferCommenceRequestMessage,
  TransferCommenceResponseMessage,
  TransferProposalReceiptRejectMessage,
  TransferProposalRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_1_pb";

export default (router: ConnectRouter) =>
  router.service(SatpStage1Service, {
    async transferProposal(
      req: TransferProposalRequestMessage,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);

      //todo

      return new TransferProposalReceiptRejectMessage({});
    },
    async transferCommence(
      req: TransferCommenceRequestMessage,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);

      //todo

      return new TransferCommenceResponseMessage({});
    },
  });
