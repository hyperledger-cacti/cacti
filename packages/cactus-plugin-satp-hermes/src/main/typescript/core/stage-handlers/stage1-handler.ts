import { ConnectRouter, HandlerContext } from "@connectrpc/connect";

import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/stage_1_connect";
import {
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATPGateway } from "../../plugin-satp-hermes-gateway";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { TimestampType, saveTimestamp } from "../session-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { SATPSession } from "../satp-session";
import { Stage1ClientService } from "../stage-services/client/stage1-client-service";
import { ServiceType } from "@bufbuild/protobuf";
import { SupportedGatewayImplementations } from "../types";

export const Stage1Handler = (session: SATPSession | undefined, serverService: Stage1ServerService, clientService: Stage1ClientService, connectClients: ServiceType[], supportedDLTs: SupportedGatewayImplementations[]) =>
  (router: ConnectRouter) =>
    router.service(SatpStage1Service, {
      async transferProposal(
        req: TransferProposalRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received TransferProposalRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const sessionData =
          await serverService.checkTransferProposalRequestMessage(req, session, supportedDLTs);

        saveTimestamp(
          sessionData,
          MessageType.INIT_PROPOSAL,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        const message = await serverService.transferProposalResponse(
          req,
          session,
        );

        if (!message) {
          throw new Error("No message returned from transferProposalResponse");
        }

        /*
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
        */
        console.log("Returning response", message);

        return message;
      },

      // TODO phase, step
      async transferCommence(
        req: TransferCommenceRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received TransferCommenceRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const sessionData = await serverService.checkTransferCommenceRequestMessage(
          req,
          session,
        );

        saveTimestamp(
          sessionData,
          MessageType.TRANSFER_COMMENCE_REQUEST,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        const message = await serverService.transferCommenceResponse(req, session);

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
