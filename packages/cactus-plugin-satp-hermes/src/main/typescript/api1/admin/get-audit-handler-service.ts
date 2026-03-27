/**
 * @fileoverview SATP Gateway Audit Handler Service
 *
 * This module provides the business logic for handling SATP audit operations.
 * Processes audit requests by querying session data, transaction history, and
 * system events to generate comprehensive audit reports for compliance and
 * monitoring purposes.
 *
 * The service handles:
 * - Audit data collection and filtering
 * - Session history aggregation
 * - Transaction trail compilation
 * - Compliance report generation
 * - Time range filtering and pagination
 *
 * @example
 * ```typescript
 * import { executeAudit } from './get-audit-handler-service';
 *
 * const auditResponse = await executeAudit(
 *   'info',
 *   { startTimestamp: 0, endTimestamp: Date.now() },
 *   satpManager
 * );
 *
 * console.log('Audit sessions:', auditResponse.sessions.length);
 * console.log('Audit period:', auditResponse.auditPeriod);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { GetStatusError } from "../../core/errors/satp-errors";
import { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import {
  AuditRequest,
  AuditResponse,
} from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import { SATPManager } from "../../services/gateway/satp-manager";
import { SATPSession } from "../../core/satp-session";

/**
 * Execute audit operations for SATP sessions and transactions.
 *
 * Processes audit requests by collecting and filtering session data
 * within the specified time range. Generates comprehensive audit
 * reports including session metadata and transaction history.
 *
 * @param logLevel - Logging level for operation tracking
 * @param req - Audit request with time range parameters
 * @param manager - SATP manager instance for session data access
 * @returns Promise resolving to formatted audit response
 * @throws GetStatusError for data access errors
 * @throws Error for unexpected service failures
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * try {
 *   const audit = await executeAudit(
 *     'debug',
 *     { startTimestamp: 1640995200000, endTimestamp: 1641081600000 },
 *     manager
 *   );
 *
 *   console.log(`Found ${audit.sessions.length} sessions in audit period`);
 *   audit.sessions.forEach(session => {
 *     console.log(`Session: ${session.id}, Stage: ${session.currentStage}`);
 *   });
 * } catch (error) {
 *   console.error('Audit failed:', error.message);
 * }
 * ```
 */
export async function executeAudit(
  logLevel: LogLevelDesc,
  req: AuditRequest,
  manager: SATPManager,
): Promise<AuditResponse> {
  const fnTag = `executeAudit()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, Performing audit...`);

  try {
    const processedRequest = req;
    const result = await getAuditData(logLevel, processedRequest, manager);
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
 * Internal service function for audit data collection.
 *
 * Handles the core business logic of collecting session data from
 * the SATP manager within the specified time range and formatting
 * audit responses with session metadata and transaction details.
 *
 * @param logLevel - Logging level for internal operation tracking
 * @param req - Processed audit request with time range parameters
 * @param manager - SATP manager instance for session data access
 * @returns Promise resolving to complete audit response
 * @internal
 * @since 0.0.3-beta
 */
export async function getAuditData(
  logLevel: LogLevelDesc,
  req: AuditRequest,
  manager: SATPManager,
): Promise<AuditResponse> {
  const fnTag = `getStatusService()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  const sessions = manager.getSessions().values();

  const sessionsData: SATPSession[] = [];

  let sessionData: SessionData | undefined;
  for (const session of sessions) {
    if (session.hasClientSessionData()) {
      sessionData = session.getClientSessionData();
    } else if (session.hasServerSessionData()) {
      sessionData = session.getServerSessionData();
    } else {
      logger.warn(
        `${fnTag}, Session ${session.getSessionId()} does not have session data.`,
      );
      continue;
    }

    if (Number(sessionData.lastMessageReceivedTimestamp) > req.endTimestamp) {
      logger.info(
        `${fnTag}, Session ${session.getSessionId()} is not within the requested time range.`,
      );
      logger.debug(
        `${fnTag}, Session ${session.getSessionId()} last message received timestamp: ${sessionData.lastMessageReceivedTimestamp}, requested end timestamp: ${req.endTimestamp}`,
      );
      continue;
    }

    if (
      !sessionData.receivedTimestamps?.stage0
        ?.newSessionRequestMessageTimestamp ||
      Number(
        sessionData.receivedTimestamps?.stage0
          ?.newSessionRequestMessageTimestamp,
      ) < req.startTimestamp
    ) {
      logger.warn(
        `${fnTag}, Session ${session.getSessionId()} does not have complete timestamps.`,
      );
      continue;
    }

    logger.info(
      `${fnTag}, Adding session ${session.getSessionId()} to audit data.`,
    );
    sessionsData.push(session);
  }

  return {
    sessions: sessionsData.map((session) => session.toString()),
    startTimestamp: req.startTimestamp,
    endTimestamp: req.endTimestamp,
  };
}
