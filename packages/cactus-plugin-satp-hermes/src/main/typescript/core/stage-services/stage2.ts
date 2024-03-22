import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/stage_2_connect";
import {
  LockAssertionReceiptMessage,
  LockAssertionRequest,
} from "../../generated/proto/cacti/satp/v02/stage_2_pb";

export const sendLockAssertionRequest: any = (router: ConnectRouter) =>
  router.service(SatpStage2Service, {
    async lockAssertion(req: LockAssertionRequest, context: HandlerContext) {
      console.log("Received request", req, context);
      return new LockAssertionReceiptMessage({});
    },
  });
