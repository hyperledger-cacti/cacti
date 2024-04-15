import { ConnectRouter, HandlerContext } from "@connectrpc/connect";

import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import {
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATPGateway } from "../../gateway-refactor";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { TimestampType, saveTimestamp } from "../session-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";

export default (gateway: SATPGateway, service: Stage1ServerService) =>
  (router: ConnectRouter) =>
    router.service(SatpStage1Service, {
      async transferProposal(
        req: TransferProposalRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received TransferProposalRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const [sessionData, reject] =
          await service.checkTransferProposalRequestMessage(req, gateway);

        saveTimestamp(
          sessionData,
          MessageType.INIT_PROPOSAL,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        const message = await service.transferProposalResponse(
          req,
          reject,
          gateway,
        );

        if (!message) {
          throw new Error("No message returned from transferProposalResponse");
        }

        if (reject) {
          saveTimestamp(
            sessionData,
            MessageType.INIT_REJECT,
            TimestampType.PROCESSED,
          );
        } else {
          saveTimestamp(
            sessionData,
            MessageType.INIT_RECEIPT,
            TimestampType.PROCESSED,
          );
        }

        console.log("Returning response", message);

        return message;
      },
      async transferCommence(
        req: TransferCommenceRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received TransferCommenceRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const sessionData = await service.checkTransferCommenceRequestMessage(
          req,
          gateway,
        );

        saveTimestamp(
          sessionData,
          MessageType.TRANSFER_COMMENCE_REQUEST,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        const message = await service.transferCommenceResponse(req, gateway);

        if (!message) {
          throw new Error("No message returned from transferProposalResponse");
        }

        saveTimestamp(
          sessionData,
          MessageType.TRANSFER_COMMENCE_RESPONSE,
          TimestampType.PROCESSED,
        );

        console.log("Returning response", message);

        return message;
      },
    });
