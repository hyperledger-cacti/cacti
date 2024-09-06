import { GetStatusError } from "../../core/errors/satp-errors";
import {
  StatusRequest,
  StatusResponse,
  StatusResponseStageEnum,
  StatusResponseStatusEnum,
  StatusResponseSubstatusEnum,
  Transact200ResponseStatusResponseOriginChain,
} from "../../generated/gateway-client/typescript-axios/api";
import { Logger } from "@hyperledger/cactus-common";
import { SATPManager } from "../../gol/satp-manager";
import { SupportedChain } from "../../core/types";

export async function ExecuteGetStatus(
  logger: Logger,
  req: StatusRequest,
  manager: SATPManager,
): Promise<StatusResponse> {
  const fnTag = `GetStatusHandler`;
  logger.info(`${fnTag}, Obtaining status for sessionID=${req.sessionID}`);

  try {
    const processedRequest = req;
    const result = await GetStatusService(logger, processedRequest, manager);
    return result;
  } catch (error) {
    if (error instanceof GetStatusError) {
      logger.error(`${fnTag}, Error getting status: ${error.message}`);
      throw error;
    } else {
      logger.error(`${fnTag}, Unexpected error: ${error.message}`);
      throw new Error("An unexpected error occurred while obtaining status.");
    }
  }
}

// TODO call SATP core, use try catch to propagate errors
export async function GetStatusService(
  logger: Logger,
  req: StatusRequest,
  manager: SATPManager,
): Promise<StatusResponse> {
  // Implement the logic for getting status here; call core

  const session = manager.getSession(req.sessionID);
  if (!session) {
    throw new GetStatusError(req.sessionID, " Session not found.");
  }
  let sessionData;
  if (session.hasClientSessionData()) {
    sessionData = session.getClientSessionData();
  } else if (session.hasServerSessionData()) {
    sessionData = session.getServerSessionData();
  } else {
    throw new GetStatusError(
      req.sessionID,
      " Session does not have session data.",
    );
  }
  let status: StatusResponseStatusEnum = StatusResponseStatusEnum.Invalid;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let substatus: StatusResponseSubstatusEnum =
    StatusResponseSubstatusEnum.Completed;
  const startTime =
    sessionData.receivedTimestamps?.stage0?.newSessionRequestMessageTimestamp;
  let originChain: Transact200ResponseStatusResponseOriginChain;
  let destinationChain: Transact200ResponseStatusResponseOriginChain;
  if (sessionData.senderGatewayNetworkId === SupportedChain.BESU) {
    originChain = {
      dltProtocol: "besu",
      dltSubnetworkID: "v24.4.0-RC1",
    };
    destinationChain = {
      dltProtocol: "fabric",
      dltSubnetworkID: "v2.0.0",
    };
  } else {
    originChain = {
      dltProtocol: "fabric",
      dltSubnetworkID: "v2.0.0",
    };
    destinationChain = {
      dltProtocol: "besu",
      dltSubnetworkID: "v24.4.0-RC1",
    };
  }
  if (!sessionData.hashes) {
    return {
      status: StatusResponseStatusEnum.Invalid,
      substatus: StatusResponseSubstatusEnum.UnknownError,
      stage: StatusResponseStageEnum.Stage0,
      step: "transfer-complete-message",
      startTime: startTime || "undefined",
      originChain: originChain,
      destinationChain: destinationChain,
    };
  }
  logger.info("completed? " + sessionData.completed);
  logger.info("stage0: " + sessionData.hashes.stage0);
  logger.info("stage1: " + sessionData.hashes.stage1);
  logger.info("stage2: " + sessionData.hashes.stage2);
  logger.info("stage3: " + sessionData.hashes.stage3);
  if (sessionData.hashes?.stage3 && sessionData.completed) {
    substatus = StatusResponseSubstatusEnum.Completed;
    status = StatusResponseStatusEnum.Done;
  } else {
    status = StatusResponseStatusEnum.Pending;
    if (sessionData.hashes?.stage0) {
      substatus = StatusResponseSubstatusEnum.Partial;
    } else {
      status = StatusResponseStatusEnum.Invalid;
      substatus = StatusResponseSubstatusEnum.UnknownError;
    }
  }

  let count = -1;
  Object.entries(sessionData.hashes).forEach((stage) => {
    if (stage[1]) {
      ++count;
    }
  });

  const mock: StatusResponse = {
    status: status,
    substatus,
    stage: ("STAGE" + count) as StatusResponseStageEnum,
    step: "transfer-complete-message",
    startTime: startTime || "undefined",
    originChain: originChain,
    destinationChain: destinationChain,
  };

  logger.info(req);
  // logger.error("GetStatusService not implemented");
  // throw new GetStatusError(req.sessionID, "GetStatusService not implemented");

  return mock;
}
