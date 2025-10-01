/**
 * @fileoverview SATP Gateway Status Handler Service
 *
 * This module provides the business logic for handling SATP session status
 * requests. Processes status queries by retrieving session information from
 * the SATP manager and formatting comprehensive status responses including
 * stage progression, transaction states, and network details.
 *
 * The service handles:
 * - Session status retrieval and validation
 * - Stage and state information formatting
 * - Network configuration details
 * - Error condition mapping and reporting
 * - Transaction progress tracking
 *
 * @example
 * ```typescript
 * import { executeGetStatus } from './get-status-handler-service';
 *
 * const statusResponse = await executeGetStatus(
 *   'debug',
 *   { sessionID: 'session-123' },
 *   satpManager
 * );
 *
 * console.log('Session stage:', statusResponse.stage);
 * console.log('Session status:', statusResponse.status);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.2-beta
 */

import { GetStatusError } from "../../core/errors/satp-errors";
import {
  NetworkId,
  StatusRequest,
  StatusResponse,
  StatusResponseStageEnum,
  StatusResponseStatusEnum,
  StatusResponseSubstatusEnum,
  Transact200ResponseStatusResponseOriginNetwork,
} from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPManager } from "../../services/gateway/satp-manager";
import {
  getSessionActualStage,
  getStageName,
  getStateName,
} from "../../core/session-utils";
import { State } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";

/**
 * Execute status retrieval for a SATP session.
 *
 * Processes a status request by querying the SATP manager for session
 * information and formatting a comprehensive status response. Includes
 * error handling for invalid sessions and service failures.
 *
 * @param logLevel - Logging level for operation tracking
 * @param req - Status request with session identifier
 * @param manager - SATP manager instance for session queries
 * @returns Promise resolving to formatted status response
 * @throws GetStatusError for session-specific errors
 * @throws Error for unexpected service failures
 * @since 0.0.2-beta
 * @example
 * ```typescript
 * try {
 *   const status = await executeGetStatus(
 *     'info',
 *     { sessionID: 'session-abc123' },
 *     manager
 *   );
 *
 *   console.log(`Session ${status.sessionID} is in ${status.stage} stage`);
 *   console.log(`Status: ${status.status}, Substatus: ${status.substatus}`);
 * } catch (error) {
 *   if (error instanceof GetStatusError) {
 *     console.error('Session not found:', error.message);
 *   }
 * }
 * ```
 */
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

/**
 * Get network configuration details for status responses.
 *
 * Maps network identifiers to detailed network configuration objects
 * including DLT protocol type, subnet information, and gateway details.
 * Supports multiple ledger types with specific configuration mappings.
 *
 * @param networkId - Network identifier containing ledger type and ID
 * @returns Formatted network details for status response
 * @since 0.0.2-beta
 * @example
 * ```typescript
 * const networkId = { id: 'network-1', ledgerType: LedgerType.Besu2X };
 * const details = getNetworkDetails(networkId);
 *
 * console.log('Protocol:', details.dltProtocol);
 * console.log('Subnet:', details.dltSubnetworkID);
 * ```
 */
function getNetworkDetails(
  networkId: NetworkId,
): Transact200ResponseStatusResponseOriginNetwork {
  switch (networkId.ledgerType) {
    case LedgerType.Besu2X:
      return {
        id: networkId.id,
        dltProtocol: "besu",
        dltSubnetworkID: "v24.4.0-RC1",
      };
    case LedgerType.Fabric2:
      return {
        id: networkId.id,
        dltProtocol: "fabric",
        dltSubnetworkID: "v2.0.0",
      };
    case LedgerType.Ethereum:
      return {
        id: networkId.id,
        dltProtocol: "ethereum",
        dltSubnetworkID: "v24.4.0-RC1",
      };
    default:
      return {
        id: networkId.id,
        dltProtocol: "unknown",
        dltSubnetworkID: "unknown",
      };
  }
}

/**
 * Internal service function for status retrieval operations.
 *
 * Handles the core business logic of retrieving session information
 * from the SATP manager and constructing formatted status responses.
 * Includes comprehensive error handling and state mapping.
 *
 * @param logLevel - Logging level for internal operation tracking
 * @param req - Processed status request with session identifier
 * @param manager - SATP manager instance for session data access
 * @returns Promise resolving to complete status response
 * @throws GetStatusError when session is not found or invalid
 * @todo Call SATP core directly, use try-catch to propagate errors
 * @internal
 * @since 0.0.2-beta
 */
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
  const originNetwork: Transact200ResponseStatusResponseOriginNetwork =
    getNetworkDetails({
      id: sessionData.senderAsset?.networkId?.id,
      ledgerType: sessionData.senderAsset?.networkId?.type as LedgerType,
    } as NetworkId);
  const destinationNetwork: Transact200ResponseStatusResponseOriginNetwork =
    getNetworkDetails({
      id: sessionData.senderAsset?.networkId?.id,
      ledgerType: sessionData.senderAsset?.networkId?.type as LedgerType,
    } as NetworkId);
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
