import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/stage_3_connect";
import {
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  TransferCompleteRequestMessage,
} from "../../generated/proto/cacti/satp/v02/stage_3_pb";
import { Empty } from "@bufbuild/protobuf";
import { Stage3ServerService } from "../stage-services/server/stage3-server-service";
import { SATPGateway } from "../../gateway-refactor";
import { TimestampType, saveTimestamp } from "../session-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";

export const Stage3Handler = (gateway: SATPGateway, service: Stage3ServerService) =>
  (router: ConnectRouter) =>
    router.service(SatpStage3Service, {
      async commitPreparation(
        req: CommitPreparationRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received CommitPreparationRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const sessionData = await service.checkCommitPreparationRequestMessage(
          req,
          gateway,
        );

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_PREPARE,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        const message = await service.commitReady(req, gateway);

        if (!message) {
          throw new Error("No message returned from commitPreparation");
        }

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_READY,
          TimestampType.PROCESSED,
        );

        console.log("Returning response", message);

        return message;
      },
      async commitFinalAssertion(
        req: CommitFinalAssertionRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received CommitFinalAssertionRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const sessionData =
          await service.checkCommitFinalAssertionRequestMessage(req, gateway);

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_FINAL,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        const message = await service.commitFinalAcknowledgementReceiptResponse(
          req,
          gateway,
        );

        if (!message) {
          throw new Error("No message returned from commitFinalAssertion");
        }

        saveTimestamp(
          sessionData,
          MessageType.ACK_COMMIT_FINAL,
          TimestampType.PROCESSED,
        );

        return message;
      },
      async transferComplete(
        req: TransferCompleteRequestMessage,
        context: HandlerContext,
      ) {
        console.log("Received TransferCompleteRequest", req, context);
        const recvTimestamp: string = Date.now().toString();

        const sessionData = await service.checkTransferCompleteRequestMessage(
          req,
          gateway,
        );

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_TRANSFER_COMPLETE,
          TimestampType.RECEIVED,
          recvTimestamp,
        );

        console.log("Returning empty response");
        return new Empty({});
      },
    });
