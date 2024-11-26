import { GetStatusError } from "../../core/errors/satp-errors";
import {
  StatusRequest,
  StatusResponse,
  StatusResponseStageEnum,
  StatusResponseStatusEnum,
  StatusResponseSubstatusEnum,
  Transact200ResponseStatusResponseOriginNetwork,
} from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPManager } from "../../gol/satp-manager";
import { SupportedChain } from "../../core/types";
import {
  getSessionActualStage,
  getStageName,
  getStateName,
} from "../../core/session-utils";
import { State } from "../../generated/proto/cacti/satp/v02/common/session_pb";

export async function executeGetStatus(
  logLevel: LogLevelDesc,
  req: StatusRequest,
  manager: SATPManager,
): Promise<StatusResponse> {
  const fnTag = `executeGetStatus()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });
  
  logger.info(`${fnTag}, Obtaining status for sessionID=${req.sessionID}`);

  try {
    const processedRequest = req;
    const result = await getStatusService(logLevel, processedRequest, manager);
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
export async function getStatusService(
  logLevel: LogLevelDesc,
  req: StatusRequest,
  manager: SATPManager,
): Promise<StatusResponse> {
  const fnTag = `getStatusService()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

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
  let originNetwork: Transact200ResponseStatusResponseOriginNetwork;
  let destinationNetwork: Transact200ResponseStatusResponseOriginNetwork;
  if (sessionData.senderGatewayNetworkId === SupportedChain.BESU) {
    originNetwork = {
      dltProtocol: "besu",
      dltSubnetworkID: "v24.4.0-RC1",
    };
  } else if (sessionData.senderGatewayNetworkId === SupportedChain.FABRIC) {
    originNetwork = {
      dltProtocol: "fabric",
      dltSubnetworkID: "v2.0.0",
    };
  } else {
    originNetwork = {
      dltProtocol: "ethereum",
      dltSubnetworkID: "v24.4.0-RC1",
    };
  }

  if (sessionData.recipientGatewayNetworkId === SupportedChain.BESU) {
    destinationNetwork = {
      dltProtocol: "besu",
      dltSubnetworkID: "v24.4.0-RC1",
    };
  } else if (sessionData.recipientGatewayNetworkId === SupportedChain.FABRIC) {
    destinationNetwork = {
      dltProtocol: "fabric",
      dltSubnetworkID: "v2.0.0",
    };
  } else {
    destinationNetwork = {
      dltProtocol: "ethereum",
      dltSubnetworkID: "v24.4.0-RC1",
    };
  }
  if (!sessionData.hashes) {
    return {
      status: StatusResponseStatusEnum.Invalid,
      substatus: StatusResponseSubstatusEnum.UnknownError,
      stage: StatusResponseStageEnum._0,
      step: "transfer-complete-message",
      startTime: startTime || "undefined",
      originNetwork: originNetwork,
      destinationNetwork: destinationNetwork,
    };
  }
  logger.info("Session State" + getStateName(sessionData.state));
  logger.info("stage0: " + sessionData.hashes.stage0);
  logger.info("stage1: " + sessionData.hashes.stage1);
  logger.info("stage2: " + sessionData.hashes.stage2);
  logger.info("stage3: " + sessionData.hashes.stage3);
  //TODO connect SATP error with OAPI Errors
  switch (sessionData.state) {
    case State.ONGOING:
      status = StatusResponseStatusEnum.Pending;
      substatus = StatusResponseSubstatusEnum.Partial;
      break;
    case State.COMPLETED:
      status = StatusResponseStatusEnum.Done;
      substatus = StatusResponseSubstatusEnum.Completed;
      break;
    case State.ERROR:
      status = StatusResponseStatusEnum.Failed;
      substatus = StatusResponseSubstatusEnum.UnknownError;
      break;
    case State.REJECTED:
      status = StatusResponseStatusEnum.Failed;
      substatus = StatusResponseSubstatusEnum.Rejected;
      break;
    default:
      status = StatusResponseStatusEnum.Invalid;
      substatus = StatusResponseSubstatusEnum.UnknownError;
      break;
  }

  const mock: StatusResponse = {
    status: status,
    substatus,
    stage: getStageName(
      getSessionActualStage(sessionData)[0],
    ) as StatusResponseStageEnum,
    step: "transfer-complete-message",
    startTime: startTime || "undefined",
    originNetwork: originNetwork,
    destinationNetwork: destinationNetwork,
  };

  logger.info(req);

  return mock;
}
