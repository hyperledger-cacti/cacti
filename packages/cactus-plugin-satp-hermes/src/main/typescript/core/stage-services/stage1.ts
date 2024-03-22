import { ConnectRouter, HandlerContext } from "@connectrpc/connect";

import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import {
  CommenceResponseMessage,
  TransferCommenceRequest,
  TransferProposalRequest,
  TransferProposalResponse,
} from "../../generated/proto/cacti/satp/v02/stage_1_pb";

export const sendTransferProposalRequest: any = (router: ConnectRouter) =>
  router.service(SatpStage1Service, {
    async transferProposal(
      req: TransferProposalRequest,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);
      return new TransferProposalResponse({});
    },
  });

export const sendTransferCommenceRequest: any = (router: ConnectRouter) =>
  router.service(SatpStage1Service, {
    async transferCommence(
      req: TransferCommenceRequest,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);
      return new CommenceResponseMessage({});
    },
  });
