import { LogLevelDesc, LoggerProvider } from "@hyperledger-cacti/cactus-common";
import {
  GetApproveAddressError,
  GetStatusError,
} from "../../core/errors/satp-errors";
import {
  GetApproveAddressRequest,
  GetApproveAddressResponse,
} from "../../public-api";
import { BLODispatcher } from "../dispatcher";

export async function executeGetApproveAddress(
  logLevel: LogLevelDesc,
  req: GetApproveAddressRequest,
  dispacher: BLODispatcher,
): Promise<GetApproveAddressResponse> {
  const fnTag = `executeTransact()`;
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  try {
    const result = await getApproveAddressService(logLevel, req, dispacher);
    return result;
  } catch (error) {
    if (error instanceof GetStatusError) {
      log.error(`${fnTag}, Error getting status: ${error.message}`);
      throw error;
    } else {
      log.error(`${fnTag}, Unexpected error: ${error.message}`);
      throw new Error("An unexpected error occurred while obtaining status.");
    }
  }
}

async function getApproveAddressService(
  logLevel: LogLevelDesc,
  req: GetApproveAddressRequest,
  dispacher: BLODispatcher,
): Promise<GetApproveAddressResponse> {
  const fnTag = `getApproveAddressService()`;
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  log.info(
    `${fnTag}, Processing request for networkID: ${req.networkId.id}, networkType: ${req.networkId.ledgerType}, tokenType: ${req.tokenType}`,
  );

  try {
    const approveAddress = await dispacher.GetApproveAddress(req);
    log.info(
      `${fnTag}, Successfully retrieved approve address: ${approveAddress}`,
    );

    return approveAddress;
  } catch (error) {
    log.error(`${fnTag}, Error retrieving approve address: ${error.message}`);
    throw new GetApproveAddressError(
      req.networkId.id,
      req.networkId.ledgerType,
      req.tokenType,
      `Error retrieving approve address: ${error.message}`,
    );
  }
}
