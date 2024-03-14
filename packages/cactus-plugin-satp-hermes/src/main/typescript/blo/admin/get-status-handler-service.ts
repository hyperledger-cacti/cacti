import { GetStatusError } from "../../core/errors";
import { StatusRequest, StatusResponse } from "../../generated/openapi-blo/typescript-axios";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";


export async function GetStatusHandler(logger: Logger, req: StatusRequest): Promise<StatusResponse> {
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
export async function GetStatusService(logger: Logger, req: StatusRequest): Promise<StatusResponse> {
  // Implement the logic for getting status here; call core
  logger.error("GetStatusService not implemented");
  throw new GetStatusError(req.sessionID, "GetStatusService not implemented");
} 