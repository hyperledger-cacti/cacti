import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/stage_2_connect";
import {
  LockAssertionReceiptMessage,
  LockAssertionRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_2_pb";

export default (router: ConnectRouter) =>
  router.service(SatpStage2Service, {
    async lockAssertion(
      req: LockAssertionRequestMessage,
      context: HandlerContext,
    ) {
      console.log("Received request", req, context);

      //todo

      return new LockAssertionReceiptMessage({});
    },
  });
