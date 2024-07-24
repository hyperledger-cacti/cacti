import { GetStatusError } from "../../core/errors";
import {
  StatusRequest,
  StatusResponse,
  Transact200ResponseStatusResponseOriginChain,
} from "../../generated/gateway-client/typescript-axios/api";
import { Logger } from "@hyperledger/cactus-common";

export async function ExecuteGetStatus(
  logger: Logger,
  req: StatusRequest,
): Promise<StatusResponse> {
  const fnTag = `GetStatusHandler`;
  logger.info(`${fnTag}, Obtaining status for sessionID=${req.sessionID}`);

  try {
    const processedRequest = req;
    const result = await GetStatusService(logger, processedRequest);
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
): Promise<StatusResponse> {
  // Implement the logic for getting status here; call core
  const originChain: Transact200ResponseStatusResponseOriginChain = {
    dltProtocol: "besu",
    dltSubnetworkID: "v24.4.0-RC1",
  };

  const destinationChain: Transact200ResponseStatusResponseOriginChain = {
    dltProtocol: "fabric",
    dltSubnetworkID: "v2.0.0",
  };

  const mock: StatusResponse = {
    status: "DONE",
    substatus: "COMPLETED",
    stage: "STAGE3",
    step: "transfer-complete-message",
    startTime: "2023-03-14T16:50:06.662Z",
    originChain: originChain,
    destinationChain: destinationChain,
  };

  logger.info(req);
  // logger.error("GetStatusService not implemented");
  // throw new GetStatusError(req.sessionID, "GetStatusService not implemented");

  return mock;
}
